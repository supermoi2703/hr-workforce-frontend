"use client";

import type { ReactNode } from "react";
import { Building2Icon, ChevronRightIcon, LandmarkIcon, NetworkIcon, UserRoundIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/shared/icon-tile";
import { memberFilters, nodeCount, type OrgPageState, type ResolvedNode } from "../rules";
import type { OrgChart, OrgChartDepartment, OrgChartPerson, OrgNode } from "../types";
import { MemberTable } from "./member-table";
import { OrgDiagram, ReportingChain, UnitCard } from "./org-diagram";

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
  const t = useTranslations("Organization");
  const departments = chart.departments.filter((d) => !d.executive);
  const executive = chart.departments.find((d) => d.executive);

  return (
    <DetailLayout
      icon={NetworkIcon}
      title={scopeLabel}
      subtitle={t("Detail.overviewSubtitle", { departments: departments.length })}
      count={chart.employeeCount}
      diagram={
        chart.departments.length > 0 && (
          <OrgDiagram
            label={t("Diagram.companyLabel")}
            root={
              <UnitCard
                emphasis
                person={director}
                role={t("Roles.director")}
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
                  role={t("Roles.departmentHead")}
                  unit={department.name}
                  count={department.employeeCount}
                  onClick={() => onSelect({ kind: "department", id: department.id })}
                />
              ),
            }))}
          />
        )
      }
      membersTitle={t("Detail.allMembers")}
    >
      <MemberTable
        filters={memberFilters({ ...state, node: undefined, keyword: undefined })}
        unitColumn="full"
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={t("Detail.emptyScope")}
      />
    </DetailLayout>
  );
}

/** Chi tiết một phòng ban, một team hoặc nhóm "chưa thuộc team". */
export function NodeDetail({ director, state, scopeLabel, onSelect, resolved }: DetailProps & { resolved: ResolvedNode }) {
  const t = useTranslations("Organization");
  const { department } = resolved;
  const headRole = department.executive ? t("Roles.director") : t("Roles.departmentHead");
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
      <DepartmentDiagram department={department} headRole={headRole} onSelect={onSelect} label={t("Diagram.unitLabel", { name: title })} />
    );
  } else if (resolved.kind === "team") {
    const { team } = resolved;
    title = team.name;
    icon = UsersRoundIcon;
    const steps: { key: string; node: ReactNode }[] = [];
    // Giám đốc chỉ hiện khi khác trưởng phòng (team thuộc Ban Giám đốc thì trưởng phòng chính là giám đốc)
    if (director && !department.executive) {
      steps.push({ key: "director", node: <UnitCard wide person={director} role={t("Roles.director")} /> });
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
    steps.push({
      key: "lead",
      node: <UnitCard wide active person={team.lead} role={t("Roles.teamLead")} unit={team.name} count={team.employeeCount} />,
    });
    diagram = <ReportingChain steps={steps} label={t("Diagram.chainLabel", { name: team.name })} />;
  } else {
    title = t("Tree.withoutTeam");
    icon = UserRoundIcon;
    diagram = (
      <ReportingChain
        label={t("Diagram.chainLabel", { name: department.name })}
        steps={[
          {
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
          },
        ]}
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
      subtitle={resolved.kind === "noTeam" ? t("Detail.withoutTeamSubtitle", { name: department.name }) : undefined}
      badge={department.executive && resolved.kind === "department" ? t("Detail.executiveBadge") : undefined}
      count={nodeCount(resolved)}
      diagram={diagram}
      membersTitle={t("Detail.members")}
    >
      <MemberTable
        filters={filters}
        unitColumn={resolved.kind === "department" ? "team" : "none"}
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={t("Detail.emptyNode")}
      />
    </DetailLayout>
  );
}

/** Kết quả tìm người theo tên / mã trong phạm vi đang xem. */
export function SearchDetail({ state, scopeLabel, onSelect }: Omit<DetailProps, "chart" | "director">) {
  const t = useTranslations("Organization");
  return (
    <DetailLayout
      icon={UsersRoundIcon}
      title={t("Detail.searchTitle", { keyword: state.keyword ?? "" })}
      subtitle={t("Detail.searchSubtitle", { scope: scopeLabel })}
      membersTitle={t("Detail.searchResults")}
    >
      <MemberTable
        filters={memberFilters(state)}
        unitColumn="full"
        onSelectUnit={onSelect}
        showOffice={state.view !== "office"}
        emptyTitle={t("Detail.emptySearch")}
        emptyDescription={t("Detail.emptySearchHint")}
      />
    </DetailLayout>
  );
}

function DepartmentDiagram({
  department,
  headRole,
  onSelect,
  label,
}: {
  department: OrgChartDepartment;
  headRole: string;
  onSelect: (node: OrgNode) => void;
  label: string;
}) {
  const t = useTranslations("Organization");
  const items = department.teams.map((team) => ({
    key: team.id,
    node: (
      <UnitCard
        person={team.lead}
        role={t("Roles.teamLead")}
        unit={team.name}
        count={team.employeeCount}
        onClick={() => onSelect({ kind: "team", id: team.id })}
      />
    ),
  }));
  if (department.withoutTeamCount > 0 && department.teams.length > 0) {
    items.push({
      key: "no-team",
      node: (
        <button
          type="button"
          onClick={() => onSelect({ kind: "noTeam", departmentId: department.id })}
          className="flex w-48 flex-col justify-center rounded-lg border border-dashed p-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="font-medium text-foreground">{t("Tree.withoutTeam")}</span>
          <span className="text-xs tabular-nums">{t("Detail.people", { count: department.withoutTeamCount })}</span>
        </button>
      ),
    });
  }
  return (
    <OrgDiagram
      label={label}
      root={<UnitCard emphasis active person={department.head} role={headRole} unit={department.name} count={department.employeeCount} />}
      items={items}
    />
  );
}

type DetailLayoutProps = {
  icon: LucideIcon;
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

function DetailLayout({ icon, title, code, subtitle, badge, count, path, onSelect, diagram, membersTitle, children }: DetailLayoutProps) {
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
        {count !== undefined && (
          <p className="shrink-0 text-sm text-muted-foreground">
            {t.rich("headcount", {
              count,
              num: (chunks) => <span className="text-2xl font-semibold text-foreground tabular-nums">{chunks}</span>,
            })}
          </p>
        )}
      </header>

      {diagram && <div className="border-b bg-muted/40 px-4 py-6">{diagram}</div>}

      <section className="flex flex-col gap-3 p-4" aria-label={membersTitle}>
        <h3 className="text-sm font-medium">{membersTitle}</h3>
        {children}
      </section>
    </div>
  );
}
