"use client";

import type { ReactNode } from "react";
import {
  Building2Icon,
  EyeOffIcon,
  LandmarkIcon,
  MapPinIcon,
  NetworkIcon,
  UserRoundIcon,
  UserRoundXIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  HeroBanner,
  HeroBannerBadge,
  type HeroBannerStat,
  type HeroBannerStep,
} from "@/components/shared/hero-banner";
import { IconTile } from "@/components/shared/icon-tile";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOrgChartOffices, useOrgMembers } from "../hooks";
import {
  chartSummary,
  departmentSummary,
  encodeNode,
  memberFilters,
  nodeCount,
  type OrgPageState,
  type ResolvedNode,
} from "../rules";
import type { MemberFilters, OrgChart, OrgChartDepartment, OrgChartPerson, OrgChartTeam, OrgNode } from "../types";
import { CompanyDiagram } from "./company-diagram";
import { MemberTable } from "./member-table";
import { DIAGRAM_INTERACTIVE, MemberCard, MemberTier, OrgDiagram, ReportingChain, UnitCard, UnitTile } from "./org-diagram";
import { useOpenPerson } from "./person-sheet";
import { AddDepartmentButton, UnitActions, useCanManageOrg } from "./unit-actions";

/** Bộ dịch theo nhóm con: cả nhóm "Organization" quá lớn để TypeScript suy ra kiểu khóa (TS2590). */
function useOrgTranslations() {
  return {
    detail: useTranslations("Organization.Detail"),
    roles: useTranslations("Organization.Roles"),
    diagram: useTranslations("Organization.Diagram"),
    tree: useTranslations("Organization.Tree"),
  };
}

type DetailProps = {
  chart: OrgChart;
  /** Giám đốc của cả công ty (kể cả khi đang xem một văn phòng mà giám đốc không làm ở đó). */
  director: OrgChartPerson | null;
  state: OrgPageState;
  /** "Toàn công ty" hoặc tên văn phòng đang xem. */
  scopeLabel: string;
  onSelect: (node: OrgNode | undefined) => void;
};

/**
 * Khi chưa chọn nút: băng tiêu đề của cả công ty (hoặc văn phòng), sơ đồ ba tầng giám đốc → phòng → team, và danh sách
 * mọi người trong phạm vi đang xem.
 */
export function OverviewDetail({ chart, director, state, scopeLabel, onSelect }: DetailProps) {
  const tt = useOrgTranslations();
  const canManage = useCanManageOrg();
  const offices = useOrgChartOffices();
  const officeView = state.view === "office";
  const departments = chart.departments.filter((d) => !d.executive);
  const executive = chart.departments.find((d) => d.executive);
  const summary = chartSummary(chart);

  const stats: HeroBannerStat[] = [
    { key: "departments", icon: Building2Icon, label: tt.detail("stats.departments", { count: summary.departments }) },
    { key: "teams", icon: UsersRoundIcon, label: tt.detail("stats.teams", { count: summary.teams }) },
  ];
  if (!officeView && offices.data) {
    stats.push({ key: "offices", icon: MapPinIcon, label: tt.detail("stats.offices", { count: offices.data.length }) });
  }
  // Chỉ người dựng tổ chức cần (và sửa được) chỗ trống; người bị giới hạn phạm vi có thể đếm thiếu
  if (canManage && summary.vacant > 0) {
    stats.push({ key: "vacant", icon: UserRoundXIcon, label: tt.detail("stats.vacant", { count: summary.vacant }) });
  }

  return (
    <DetailLayout
      header={
        <UnitBanner
          icon={officeView ? MapPinIcon : NetworkIcon}
          title={scopeLabel}
          count={chart.employeeCount}
          stats={stats}
          actions={canManage && !officeView ? <AddDepartmentButton /> : undefined}
        />
      }
      diagramKey="overview"
      diagram={
        chart.departments.length > 0 && (
          <CompanyDiagram
            label={tt.diagram("companyLabel")}
            director={director}
            executive={executive}
            departments={departments}
            onSelect={onSelect}
          />
        )
      }
      notice={chart.employeeCount == null ? tt.detail("restrictedOverview") : undefined}
      membersTitle={tt.detail("allMembers")}
    >
      <MemberTable
        filters={memberFilters({ ...state, node: undefined, keyword: undefined })}
        directorId={director?.id}
        unitColumn="full"
        onSelectUnit={onSelect}
        showOffice={!officeView}
        emptyTitle={tt.detail("emptyScope")}
      />
    </DetailLayout>
  );
}

/** Chi tiết một phòng ban, một team hoặc nhóm "trực thuộc phòng". */
export function NodeDetail({ chart, director, state, scopeLabel, onSelect, resolved }: DetailProps & { resolved: ResolvedNode }) {
  const tt = useOrgTranslations();
  const canManage = useCanManageOrg();
  const { department } = resolved;
  const executive = chart.departments.find((d) => d.executive);
  // Giám đốc đứng trên mọi phòng (trừ chính Ban Giám đốc, nơi trưởng phòng là giám đốc): nút phòng, team hay "trực thuộc
  // phòng" đều vẽ từ giám đốc xuống, để tuyến báo cáo nhất quán giữa các cấp
  const directorStep =
    director && !department.executive
      ? {
          key: "director",
          node: (
            <UnitCard
              apex
              person={director}
              role={tt.roles("director")}
              unit={executive?.name}
              onClick={executive ? () => onSelect({ kind: "department", id: executive.id }) : undefined}
            />
          ),
        }
      : undefined;
  const underDirector = (key: string, node: ReactNode, label: string) =>
    directorStep ? <ReportingChain steps={[directorStep, { key, node }]} label={label} /> : node;
  const headRole = department.executive ? tt.roles("director") : tt.roles("departmentHead");
  const filters = memberFilters({ ...state, keyword: undefined });

  const path: HeroBannerStep[] = [{ key: "scope", label: scopeLabel, onClick: () => onSelect(undefined) }];
  if (resolved.kind !== "department") {
    path.push({ key: "department", label: department.name, onClick: () => onSelect({ kind: "department", id: department.id }) });
  }

  let title: string;
  let icon: LucideIcon;
  let diagram: ReactNode;
  const stats: HeroBannerStat[] = [];

  if (resolved.kind === "department") {
    title = department.name;
    icon = department.executive ? LandmarkIcon : Building2Icon;
    const summary = departmentSummary(department);
    if (summary.teams > 0) {
      stats.push({ key: "teams", icon: UsersRoundIcon, label: tt.detail("stats.teams", { count: summary.teams }) });
    }
    if (canManage && summary.vacant > 0) {
      stats.push({ key: "vacant", icon: UserRoundXIcon, label: tt.detail("stats.vacant", { count: summary.vacant }) });
    }
    diagram = underDirector(
      "department",
      <DepartmentDiagram
        department={department}
        headRole={headRole}
        officeId={filters.officeId}
        onSelect={onSelect}
        label={tt.diagram("unitLabel", { name: title })}
      />,
      tt.diagram("chainLabel", { name: title }),
    );
  } else if (resolved.kind === "team") {
    const { team } = resolved;
    title = team.name;
    icon = UsersRoundIcon;
    const steps: { key: string; node: ReactNode }[] = directorStep ? [directorStep] : [];
    steps.push({
      key: "head",
      node: (
        <UnitCard
          wide
          person={department.head}
          role={headRole}
          unit={department.name}
          count={department.employeeCount}
          onClick={() => onSelect({ kind: "department", id: department.id })}
        />
      ),
    });
    steps.push({ key: "lead", node: <TeamDiagram team={team} officeId={filters.officeId} label={tt.diagram("unitLabel", { name: team.name })} /> });
    diagram = <ReportingChain steps={steps} label={tt.diagram("chainLabel", { name: team.name })} />;
  } else {
    title = tt.tree("withoutTeam");
    icon = UserRoundIcon;
    diagram = underDirector(
      "noTeam",
      <LeaderWithMembers
        label={tt.diagram("unitLabel", { name: department.name })}
        leaderId={department.head?.id}
        filters={filters}
        leader={
          <UnitCard
            wide
            person={department.head}
            role={headRole}
            unit={department.name}
            count={department.employeeCount}
            onClick={() => onSelect({ kind: "department", id: department.id })}
          />
        }
      />,
      tt.diagram("chainLabel", { name: department.name }),
    );
  }

  const code = resolved.kind === "team" ? resolved.team.code : resolved.kind === "department" ? department.code : undefined;
  const notice =
    resolved.kind === "team"
      ? resolved.team.restricted
        ? tt.detail("restrictedTeam")
        : undefined
      : department.restricted
        ? tt.detail("restrictedDepartment")
        : undefined;
  const nodeKey =
    resolved.kind === "team"
      ? encodeNode({ kind: "team", id: resolved.team.id })
      : resolved.kind === "department"
        ? encodeNode({ kind: "department", id: department.id })
        : encodeNode({ kind: "noTeam", departmentId: department.id });

  return (
    <DetailLayout
      header={
        <UnitBanner
          icon={icon}
          title={title}
          code={code}
          executive={department.executive && resolved.kind === "department"}
          path={path}
          description={resolved.kind === "noTeam" ? tt.detail("withoutTeamSubtitle", { name: department.name }) : undefined}
          count={nodeCount(resolved)}
          stats={stats}
          actions={canManage && resolved.kind !== "noTeam" ? <UnitActions resolved={resolved} onSelect={onSelect} /> : undefined}
        />
      }
      diagramKey={nodeKey}
      diagram={diagram}
      notice={notice}
      membersTitle={tt.detail("members")}
    >
      <MemberTable
        filters={filters}
        directorId={director?.id}
        unitColumn={resolved.kind === "department" ? "team" : "none"}
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={notice ?? tt.detail("emptyNode")}
      />
    </DetailLayout>
  );
}

/**
 * Tầng cuối của sơ đồ: trưởng team và các thành viên (một team thường 5–10 người nên vẽ hết được, giống sơ đồ "cấp dưới
 * trực tiếp" của Odoo). Tối đa 100 người; đang xem theo văn phòng thì chỉ người của văn phòng đó.
 */
function TeamDiagram({ team, officeId, label }: { team: OrgChartTeam; officeId?: string; label: string }) {
  const tt = useOrgTranslations();
  return (
    <LeaderWithMembers
      label={label}
      leaderId={team.lead?.id}
      filters={{ officeId, teamId: team.id }}
      leader={
        <UnitCard
          wide
          active
          person={team.lead}
          hidden={team.restricted}
          role={tt.roles("teamLead")}
          unit={team.name}
          count={team.employeeCount}
        />
      }
    />
  );
}

/** Ô người đứng đầu + lưới thành viên trực tiếp (tải tối đa 100 người, bỏ chính người đứng đầu ra khỏi lưới). */
/** Sơ đồ vẽ tối đa chừng này ô thành viên; còn lại xem ở bảng bên dưới (Odoo, MISA cũng rút gọn như vậy). */
const MAX_DIAGRAM_MEMBERS = 24;

function LeaderWithMembers({
  leader,
  leaderId,
  filters,
  label,
}: {
  leader: ReactNode;
  leaderId?: string;
  filters: MemberFilters;
  label: string;
}) {
  const tt = useOrgTranslations();
  // +1: người đứng đầu đứng đầu danh sách (backend xếp trưởng trước) và không vẽ lại trong lưới
  const members = useOrgMembers(filters, { page: 0, size: MAX_DIAGRAM_MEMBERS + 1 });
  const openPerson = useOpenPerson();
  const content = members.data?.content ?? [];
  const leaderListed = content.some((member) => member.id === leaderId);
  const others = content.filter((member) => member.id !== leaderId).slice(0, MAX_DIAGRAM_MEMBERS);
  const hidden = Math.max(0, (members.data?.totalElements ?? 0) - (leaderListed ? 1 : 0) - others.length);
  const cards = others.map((member) => (
    <MemberCard
      key={member.id}
      name={member.fullName}
      seed={member.employeeCode}
      position={member.position?.name}
      onClick={() => openPerson(member)}
    />
  ));
  if (hidden > 0) {
    cards.push(
      <a
        key="more"
        href={`#${MEMBERS_SECTION_ID}`}
        className={cn(
          "flex min-h-10 w-48 items-center justify-center rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:text-foreground",
          DIAGRAM_INTERACTIVE,
        )}
      >
        {tt.diagram("moreMembers", { count: hidden })}
      </a>,
    );
  }
  return <MemberTier label={label} root={leader} members={cards} />;
}

/** Kết quả tìm người theo tên / mã trong phạm vi đang xem. Không phải một đơn vị nên dùng tiêu đề trắng, không có băng màu. */
export function SearchDetail({ director, state, scopeLabel, onSelect }: Omit<DetailProps, "chart">) {
  const tt = useOrgTranslations();
  return (
    <DetailLayout
      header={
        <PlainHeader
          icon={UsersRoundIcon}
          title={tt.detail("searchTitle", { keyword: state.keyword ?? "" })}
          subtitle={tt.detail("searchSubtitle", { scope: scopeLabel })}
        />
      }
      membersTitle={tt.detail("searchResults")}
    >
      <MemberTable
        filters={memberFilters(state)}
        directorId={director?.id}
        unitColumn="full"
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={tt.detail("emptySearch")}
        emptyDescription={tt.detail("emptySearchHint")}
      />
    </DetailLayout>
  );
}

/** Sơ đồ của một phòng: trưởng phòng ở trên, các team (và nhóm trực thuộc phòng) ở dưới. */
function DepartmentDiagram({
  department,
  headRole,
  officeId,
  onSelect,
  label,
}: {
  department: OrgChartDepartment;
  headRole: string;
  officeId?: string;
  onSelect: (node: OrgNode) => void;
  label: string;
}) {
  const tt = useOrgTranslations();
  const head = (
    <UnitCard emphasis active person={department.head} role={headRole} unit={department.name} count={department.employeeCount} />
  );
  // Phòng không có team (Ban Giám đốc, phòng nhỏ): vẽ luôn nhân sự trực thuộc dưới trưởng phòng
  if (department.teams.length === 0) {
    return (
      <LeaderWithMembers
        label={label}
        leader={head}
        leaderId={department.head?.id}
        filters={{ officeId, departmentId: department.id, withoutTeam: true }}
      />
    );
  }
  const items = department.teams.map((team) => ({
    key: team.id,
    node: (
      <UnitTile
        icon={UsersRoundIcon}
        name={team.name}
        count={team.employeeCount}
        person={team.lead}
        hidden={team.restricted}
        role={tt.roles("teamLead")}
        onClick={() => onSelect({ kind: "team", id: team.id })}
      />
    ),
  }));
  // Trưởng phòng đã ở ô trên nên ô này đếm directStaffCount (không tính trưởng phòng); không còn ai thì không vẽ
  if ((department.directStaffCount ?? 0) > 0) {
    items.push({
      key: "no-team",
      node: (
        <UnitTile
          dashed
          icon={UserRoundIcon}
          name={tt.tree("withoutTeam")}
          count={department.directStaffCount}
          onClick={() => onSelect({ kind: "noTeam", departmentId: department.id })}
        />
      ),
    });
  }
  return <OrgDiagram label={label} root={head} items={items} />;
}

/** Neo của bảng danh sách, để ô "+N người khác" trên sơ đồ cuộn xuống. */
const MEMBERS_SECTION_ID = "org-members";

/** Băng tiêu đề tím (nhóm Tổ chức) của một đơn vị: khối màu đặc duy nhất của trang. */
function UnitBanner({
  icon,
  title,
  code,
  executive,
  path,
  description,
  count,
  stats,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  code?: string;
  executive?: boolean;
  path?: HeroBannerStep[];
  description?: string;
  /** null = không hiện số lớn (người xem không thấy hết người của đơn vị). */
  count: number | null;
  stats: HeroBannerStat[];
  /** Chỉ truyền khi người xem có quyền: component trả null vẫn để lại một khối trống. */
  actions?: ReactNode;
}) {
  const t = useTranslations("Organization.Detail");
  return (
    <HeroBanner
      tone="people"
      icon={icon}
      title={title}
      path={path}
      badges={
        (code || executive) && (
          <>
            {code && <HeroBannerBadge>{code}</HeroBannerBadge>}
            {executive && <HeroBannerBadge>{t("executiveBadge")}</HeroBannerBadge>}
          </>
        )
      }
      description={description}
      value={count != null ? formatNumber(count) : undefined}
      valueLabel={count != null ? t("peopleLabel", { count }) : undefined}
      stats={stats}
      actions={actions}
    />
  );
}

/** Tiêu đề trắng cho phần không phải một đơn vị (kết quả tìm kiếm). */
function PlainHeader({ icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <header className="flex items-center gap-3 border-b p-4">
      <IconTile icon={icon} tone="people" className="size-10" />
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}

type DetailLayoutProps = {
  header: ReactNode;
  diagram?: ReactNode;
  /** Đổi giá trị (đổi đơn vị đang xem) thì sơ đồ hiện dần lại. */
  diagramKey?: string;
  /** Dòng giải thích phạm vi xem, hiện trên danh sách thành viên. */
  notice?: string;
  membersTitle: string;
  children: ReactNode;
};

function DetailLayout({ header, diagram, diagramKey, notice, membersTitle, children }: DetailLayoutProps) {
  return (
    <div className="flex flex-col">
      {header}

      {diagram && (
        <div className="border-b bg-muted/30 bg-dot-grid px-4 py-8">
          {/* Hiệu ứng duy nhất của trang: đổi đơn vị thì sơ đồ hiện dần (tắt khi bật "giảm chuyển động") */}
          <div key={diagramKey} className="animate-in duration-200 fade-in-0 slide-in-from-bottom-1">
            {diagram}
          </div>
        </div>
      )}

      <section id={MEMBERS_SECTION_ID} className="flex scroll-mt-4 flex-col gap-3 p-4" aria-label={membersTitle}>
        <h3 className="text-sm font-medium">{membersTitle}</h3>
        {notice && (
          <p className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <EyeOffIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
        {children}
      </section>
    </div>
  );
}
