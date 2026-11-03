"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Building2Icon, MailIcon, MapPinIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/shared/user-avatar";
import { managerOf, resolveNode, unitLedBy } from "../rules";
import type { OrgChart, OrgChartMember, OrgChartPerson, OrgNode } from "../types";

const PersonSheetContext = createContext<(member: OrgChartMember) => void>(() => {});

/** Mở khung thông tin của một người (dùng trong danh sách, sơ đồ). Ngoài PersonSheetProvider thì không làm gì. */
export function useOpenPerson() {
  return useContext(PersonSheetContext);
}

type ProviderProps = {
  chart: OrgChart | undefined;
  director: OrgChartPerson | null;
  onSelectUnit: (node: OrgNode) => void;
  children: ReactNode;
};

/**
 * Khung thông tin nhân sự trượt từ bên phải (kiểu thẻ nhân viên của Odoo / MISA). Chỉ dùng dữ liệu danh bạ mà mọi người
 * được xem; "báo cáo cho" và "phụ trách" suy ra từ cây đang tải. Hồ sơ đầy đủ (có phân quyền) là việc của module hồ sơ.
 */
export function PersonSheetProvider({ chart, director, onSelectUnit, children }: ProviderProps) {
  const [member, setMember] = useState<OrgChartMember | null>(null);
  return (
    <PersonSheetContext.Provider value={setMember}>
      {children}
      <Sheet open={!!member} onOpenChange={(open) => !open && setMember(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {member && (
            <PersonDetail
              member={member}
              chart={chart}
              director={director}
              onSelectUnit={(node) => {
                setMember(null);
                onSelectUnit(node);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </PersonSheetContext.Provider>
  );
}

function PersonDetail({
  member,
  chart,
  director,
  onSelectUnit,
}: {
  member: OrgChartMember;
  chart: OrgChart | undefined;
  director: OrgChartPerson | null;
  onSelectUnit: (node: OrgNode) => void;
}) {
  const t = useTranslations("Organization.Person");
  const tMembers = useTranslations("Organization.Members");
  const manager = managerOf(member, chart, director);
  const isDirector = member.id === director?.id;
  const led = unitLedBy(member);
  const ledResolved = resolveNode(chart, led);
  const ledName = ledResolved?.kind === "team" ? ledResolved.team.name : ledResolved?.department.name;
  const ledCount = ledResolved?.kind === "team" ? ledResolved.team.employeeCount : ledResolved?.department.employeeCount;
  const { department, team } = member;

  return (
    <>
      <SheetHeader className="items-center gap-3 border-b pb-5 pt-8 text-center">
        <UserAvatar name={member.fullName} seed={member.employeeCode} size="lg" className="data-[size=lg]:size-16 text-lg" />
        <div className="flex flex-col items-center gap-1">
          <SheetTitle className="text-lg">{member.fullName}</SheetTitle>
          <SheetDescription>
            {member.position?.name ?? t("noPosition")} <span className="tabular-nums">({member.employeeCode})</span>
          </SheetDescription>
          {(member.departmentHead || member.teamLead) && (
            <Badge variant={member.departmentHead ? "info" : "secondary"}>
              {isDirector ? tMembers("director") : member.departmentHead ? tMembers("departmentHead") : tMembers("teamLead")}
            </Badge>
          )}
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-6">
        <Section title={t("contact")}>
          <Row icon={MailIcon} label={t("workEmail")}>
            <a href={`mailto:${member.workEmail}`} className="break-all text-primary hover:underline">
              {member.workEmail}
            </a>
          </Row>
          <Row icon={MapPinIcon} label={t("office")}>
            {member.office?.name ?? "—"}
          </Row>
        </Section>

        <Section title={t("unit")}>
          <Row icon={Building2Icon} label={t("department")}>
            {department ? (
              <LinkButton onClick={() => onSelectUnit({ kind: "department", id: department.id })}>{department.name}</LinkButton>
            ) : (
              "—"
            )}
          </Row>
          <Row icon={UsersRoundIcon} label={t("team")}>
            {team ? (
              <LinkButton onClick={() => onSelectUnit({ kind: "team", id: team.id })}>{team.name}</LinkButton>
            ) : department ? (
              <LinkButton onClick={() => onSelectUnit({ kind: "noTeam", departmentId: department.id })}>
                {tMembers("noTeam")}
              </LinkButton>
            ) : (
              "—"
            )}
          </Row>
        </Section>

        <Section title={t("reportsTo")}>
          {manager ? (
            <div className="flex items-center gap-3 rounded-lg border p-2.5">
              <UserAvatar name={manager.fullName} seed={manager.employeeCode} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{manager.fullName}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{manager.employeeCode}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{isDirector ? t("topOfCompany") : t("noManager")}</p>
          )}
        </Section>

        {led && ledName && (
          <Section title={t("leads")}>
            <button
              type="button"
              onClick={() => onSelectUnit(led)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="font-medium">{ledName}</span>
              {ledCount !== undefined && (
                <span className="text-xs text-muted-foreground tabular-nums">{t("people", { count: ledCount })}</span>
              )}
            </button>
          </Section>
        )}

        <p className="text-xs text-muted-foreground">{t("profileNote")}</p>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof MailIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-left hover:text-primary hover:underline">
      {children}
    </button>
  );
}
