"use client";

import type { ReactNode } from "react";
import { Building2Icon, ChevronRightIcon, LandmarkIcon, NetworkIcon, UserRoundIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/shared/icon-tile";
import { useOrgMembers } from "../hooks";
import { memberFilters, nodeCount, type OrgPageState, type ResolvedNode } from "../rules";
import type { MemberFilters, OrgChart, OrgChartDepartment, OrgChartPerson, OrgChartTeam, OrgNode } from "../types";
import { MemberTable } from "./member-table";
import { MemberCard, MemberTier, OrgDiagram, ReportingChain, UnitCard } from "./org-diagram";
import { useOpenPerson } from "./person-sheet";
import { AddDepartmentButton, UnitActions } from "./unit-actions";

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

/** Khi chưa chọn nút: sơ đồ cấp công ty (giám đốc → các phòng) và danh sách mọi người trong phạm vi đang xem. */
export function OverviewDetail({ chart, director, state, scopeLabel, onSelect }: DetailProps) {
  const tt = useOrgTranslations();
  const departments = chart.departments.filter((d) => !d.executive);
  const executive = chart.departments.find((d) => d.executive);

  return (
    <DetailLayout
      icon={NetworkIcon}
      title={scopeLabel}
      subtitle={tt.detail("overviewSubtitle", { departments: departments.length })}
      count={chart.employeeCount}
      actions={state.view === "department" ? <AddDepartmentButton /> : undefined}
      diagram={
        chart.departments.length > 0 && (
          <OrgDiagram
            label={tt.diagram("companyLabel")}
            root={
              <UnitCard
                emphasis
                person={director}
                role={tt.roles("director")}
                unit={executive?.name}
                count={executive?.employeeCount}
                onClick={executive ? () => onSelect({ kind: "department", id: executive.id }) : undefined}
              />
            }
            items={departments.map((department) => ({
              key: department.id,
              node: (
                <UnitCard
                  person={department.head}
                  role={tt.roles("departmentHead")}
                  unit={department.name}
                  count={department.employeeCount}
                  onClick={() => onSelect({ kind: "department", id: department.id })}
                />
              ),
            }))}
          />
        )
      }
      membersTitle={tt.detail("allMembers")}
    >
      <MemberTable
        filters={memberFilters({ ...state, node: undefined, keyword: undefined })}
        directorId={director?.id}
        unitColumn="full"
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={tt.detail("emptyScope")}
      />
    </DetailLayout>
  );
}

/** Chi tiết một phòng ban, một team hoặc nhóm "trực thuộc phòng". */
export function NodeDetail({ director, state, scopeLabel, onSelect, resolved }: DetailProps & { resolved: ResolvedNode }) {
  const tt = useOrgTranslations();
  const { department } = resolved;
  const headRole = department.executive ? tt.roles("director") : tt.roles("departmentHead");
  const filters = memberFilters({ ...state, keyword: undefined });

  const path: { label: string; node?: OrgNode }[] = [{ label: scopeLabel }];
  if (resolved.kind !== "department") path.push({ label: department.name, node: { kind: "department", id: department.id } });

  let title: string;
  let icon: LucideIcon;
  let diagram: ReactNode;

  if (resolved.kind === "department") {
    title = department.name;
    icon = department.executive ? LandmarkIcon : Building2Icon;
    diagram = (
      <DepartmentDiagram
        department={department}
        headRole={headRole}
        officeId={filters.officeId}
        onSelect={onSelect}
        label={tt.diagram("unitLabel", { name: title })}
      />
    );
  } else if (resolved.kind === "team") {
    const { team } = resolved;
    title = team.name;
    icon = UsersRoundIcon;
    const steps: { key: string; node: ReactNode }[] = [];
    // Giám đốc chỉ hiện khi khác trưởng phòng (team thuộc Ban Giám đốc thì trưởng phòng chính là giám đốc)
    if (director && !department.executive) {
      steps.push({ key: "director", node: <UnitCard wide person={director} role={tt.roles("director")} /> });
    }
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
    diagram = (
      <LeaderWithMembers
        label={tt.diagram("chainLabel", { name: department.name })}
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
      />
    );
  }

  const code = resolved.kind === "team" ? resolved.team.code : resolved.kind === "department" ? department.code : undefined;

  return (
    <DetailLayout
      icon={icon}
      title={title}
      code={code}
      path={path}
      onSelect={onSelect}
      subtitle={resolved.kind === "noTeam" ? tt.detail("withoutTeamSubtitle", { name: department.name }) : undefined}
      badge={department.executive && resolved.kind === "department" ? tt.detail("executiveBadge") : undefined}
      count={nodeCount(resolved)}
      actions={<UnitActions resolved={resolved} onSelect={onSelect} />}
      diagram={diagram}
      membersTitle={tt.detail("members")}
    >
      <MemberTable
        filters={filters}
        directorId={director?.id}
        unitColumn={resolved.kind === "department" ? "team" : "none"}
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={tt.detail("emptyNode")}
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
      leader={<UnitCard wide active person={team.lead} role={tt.roles("teamLead")} unit={team.name} count={team.employeeCount} />}
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
        className="flex w-44 items-center justify-center rounded-lg border border-dashed px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {tt.diagram("moreMembers", { count: hidden })}
      </a>,
    );
  }
  return <MemberTier label={label} root={leader} members={cards} />;
}

/** Kết quả tìm người theo tên / mã trong phạm vi đang xem. */
export function SearchDetail({ director, state, scopeLabel, onSelect }: Omit<DetailProps, "chart">) {
  const tt = useOrgTranslations();
  return (
    <DetailLayout
      icon={UsersRoundIcon}
      title={tt.detail("searchTitle", { keyword: state.keyword ?? "" })}
      subtitle={tt.detail("searchSubtitle", { scope: scopeLabel })}
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
      <UnitCard
        person={team.lead}
        role={tt.roles("teamLead")}
        unit={team.name}
        count={team.employeeCount}
        onClick={() => onSelect({ kind: "team", id: team.id })}
      />
    ),
  }));
  // Trưởng phòng đã ở ô trên nên ô này đếm directStaffCount (không tính trưởng phòng); không còn ai thì không vẽ
  if (department.directStaffCount > 0 && department.teams.length > 0) {
    items.push({
      key: "no-team",
      node: (
        <button
          type="button"
          onClick={() => onSelect({ kind: "noTeam", departmentId: department.id })}
          className="flex w-48 flex-col justify-center rounded-lg border border-dashed p-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="font-medium text-foreground">{tt.tree("withoutTeam")}</span>
          <span className="text-xs tabular-nums">{tt.detail("people", { count: department.directStaffCount })}</span>
        </button>
      ),
    });
  }
  return (
    <OrgDiagram
      label={label}
      root={head}
      items={items}
    />
  );
}

/** Neo của bảng danh sách, để ô "+N người khác" trên sơ đồ cuộn xuống. */
const MEMBERS_SECTION_ID = "org-members";

type DetailLayoutProps = {
  icon: LucideIcon;
  /** Nút quản trị bên phải tiêu đề (chỉ hiện với người có org:manage). */
  actions?: ReactNode;
  title: string;
  code?: string;
  subtitle?: string;
  badge?: string;
  count?: number;
  path?: { label: string; node?: OrgNode }[];
  onSelect?: (node: OrgNode | undefined) => void;
  diagram?: ReactNode;
  membersTitle: string;
  children: ReactNode;
};

function DetailLayout({
  icon,
  actions,
  title,
  code,
  subtitle,
  badge,
  count,
  path,
  onSelect,
  diagram,
  membersTitle,
  children,
}: DetailLayoutProps) {
  const t = useTranslations("Organization.Detail");
  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={icon} tone="people" className="size-10" />
          <div className="min-w-0">
            {path && path.length > 0 && (
              <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {path.map((step, index) => (
                  <li key={`${step.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 && <ChevronRightIcon className="size-3" aria-hidden />}
                    <button
                      type="button"
                      onClick={() => onSelect?.(step.node)}
                      className="hover:text-foreground hover:underline"
                    >
                      {step.label}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="truncate">{title}</span>
              {code && (
                <Badge variant="outline" className="font-normal tabular-nums">
                  {code}
                </Badge>
              )}
              {badge && <Badge variant="info">{badge}</Badge>}
            </h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {(count !== undefined || actions) && (
          <div className="flex shrink-0 items-center gap-4">
            {count !== undefined && (
              <p className="text-sm text-muted-foreground">
                {t.rich("headcount", {
                  count,
                  num: (chunks) => <span className="text-2xl font-semibold text-foreground tabular-nums">{chunks}</span>,
                })}
              </p>
            )}
            {actions}
          </div>
        )}
      </header>

      {diagram && <div className="border-b bg-muted/40 px-4 py-6">{diagram}</div>}

      <section id={MEMBERS_SECTION_ID} className="flex scroll-mt-4 flex-col gap-3 p-4" aria-label={membersTitle}>
        <h3 className="text-sm font-medium">{membersTitle}</h3>
        {children}
      </section>
    </div>
  );
}
