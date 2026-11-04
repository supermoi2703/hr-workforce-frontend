"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatNumber } from "@/lib/format";
import { confirmSkill } from "../api";
import { useEmployeeSkills, useSkillErrorMessage, useSkillMutation, useVerifierStatus } from "../hooks";
import { groupByCategory, skillStatus } from "../rules";
import type { EmployeeSkill } from "../types";
import { ConfirmationInfo } from "./confirmation-info";
import { LevelLabel, SkillStatusBadge } from "./skill-level";
import { VerifyLevelDialog, type VerifyTarget } from "./verify-level-dialog";

export type SheetPerson = { employeeId: string; fullName: string; employeeCode: string; subtitle?: string };

/**
 * Kỹ năng của một người, trượt từ bên phải. Người xác nhận được cho ai đó (cấp dưới trên sơ đồ hoặc phạm vi
 * skill:verify) thấy nút xác nhận / chốt mức / thêm hộ; backend vẫn kiểm tra từng người (ngoài phạm vi hoặc chính mình →
 * báo lỗi).
 */
export function EmployeeSkillsSheet({ person, onClose }: { person: SheetPerson | null; onClose: () => void }) {
  const t = useTranslations("Skills.Sheet");
  return (
    <Sheet open={!!person} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {person && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-3">
                <UserAvatar name={person.fullName} seed={person.employeeCode} size="lg" />
                <div className="min-w-0">
                  <SheetTitle>{person.fullName}</SheetTitle>
                  <SheetDescription>
                    {person.employeeCode}
                    {person.subtitle ? ` · ${person.subtitle}` : ""}
                  </SheetDescription>
                </div>
              </div>
              <span className="sr-only">{t("title")}</span>
            </SheetHeader>
            <SheetBody person={person} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ person }: { person: SheetPerson }) {
  const t = useTranslations("Skills.Sheet");
  const tCategory = useTranslations("Skills.Categories");
  const query = useEmployeeSkills(person.employeeId);
  const canVerify = !!useVerifierStatus().data?.canVerify;
  const [verify, setVerify] = useState<VerifyTarget | null>(null);
  const errorMessage = useSkillErrorMessage();
  const confirm = useSkillMutation((skill: EmployeeSkill) => confirmSkill(person.employeeId, skill.skillId));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        {canVerify && query.data && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVerify({ employeeId: person.employeeId, fullName: person.fullName, existing: query.data })}
          >
            <PlusIcon /> {t("add")}
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("empty")} />
      ) : (
        groupByCategory(query.data).map((group) => (
          <section key={group.category} className="flex flex-col gap-1">
            <h4 className="text-xs font-medium text-muted-foreground">{tCategory(group.category)}</h4>
            <ul className="divide-y rounded-lg border">
              {group.items.map((skill) => {
                const status = skillStatus(skill);
                const busy = confirm.isPending && confirm.variables?.skillId === skill.skillId;
                return (
                  <li key={skill.skillId} className="flex flex-col gap-1.5 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{skill.skillName}</span>
                      <SkillStatusBadge skill={skill} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <LevelLabel level={skill.level} />
                      {skill.yearsExperience !== null && (
                        <span className="text-xs text-muted-foreground">{t("years", { years: formatNumber(skill.yearsExperience) })}</span>
                      )}
                    </div>
                    {skill.note && <p className="text-xs whitespace-pre-line text-muted-foreground">{skill.note}</p>}
                    <ConfirmationInfo skill={skill} viewer="other" />
                    {canVerify && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {status === "pending" && skill.selfLevel !== null && (
                          <Button
                            size="xs"
                            disabled={confirm.isPending}
                            onClick={() =>
                              confirm.mutate(skill, {
                                onSuccess: () => toast.success(t("confirmed", { name: skill.skillName })),
                                onError: (error) => toast.error(errorMessage(error)),
                              })
                            }
                          >
                            <CheckIcon /> {busy ? t("confirming") : t("confirm")}
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setVerify({ employeeId: person.employeeId, fullName: person.fullName, skill })}
                        >
                          <SlidersHorizontalIcon /> {t("adjust")}
                        </Button>
                        {!skill.skillActive && <Badge variant="outline">{t("inactive")}</Badge>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <VerifyLevelDialog target={verify} onClose={() => setVerify(null)} />
    </div>
  );
}
