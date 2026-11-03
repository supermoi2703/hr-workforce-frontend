"use client";

import { useState } from "react";
import { BadgeCheckIcon, ClockIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SparklesIcon, Trash2Icon, UserRoundXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { formatDate, formatNumber } from "@/lib/format";
import { removeMySkill } from "../api";
import { isProfileRequired } from "../error-messages";
import { useMySkills, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { countByStatus, groupByCategory, skillStatus } from "../rules";
import type { EmployeeSkill } from "../types";
import { DeclareSkillDialog, type DeclareTarget } from "./declare-skill-dialog";
import { LevelLabel, SkillStatusBadge } from "./skill-level";

/** Tab "Kỹ năng của tôi": tự khai, sửa, xóa; thấy trạng thái xác nhận của quản lý. */
export function MySkills() {
  const t = useTranslations("Skills.Mine");
  const query = useMySkills();
  const [target, setTarget] = useState<DeclareTarget | null>(null);
  const [removing, setRemoving] = useState<EmployeeSkill | null>(null);
  const errorMessage = useSkillErrorMessage();
  const remove = useSkillMutation((skill: EmployeeSkill) => removeMySkill(skill.skillId));

  if (query.isPending) return <MySkillsSkeleton />;
  if (query.error && isProfileRequired(query.error)) {
    return <EmptyState className="border border-dashed py-16" icon={<UserRoundXIcon />} title={t("noProfileTitle")} description={t("noProfile")} />;
  }
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const skills = query.data;
  const counts = countByStatus(skills);
  const addButton = (
    <Button size="sm" onClick={() => setTarget({ mode: "create" })}>
      <PlusIcon /> {t("add")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {skills.length === 0 ? (
        <EmptyState
          className="border border-dashed py-16"
          icon={<SparklesIcon />}
          title={t("emptyTitle")}
          description={t("empty")}
          action={addButton}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{t("summary", { count: counts.total })}</span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheckIcon className="size-4 text-success" aria-hidden /> {t("summaryConfirmed", { count: counts.confirmed })}
              </span>
              {counts.pending > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-4 text-warning" aria-hidden /> {t("summaryPending", { count: counts.pending })}
                </span>
              )}
            </div>
            {addButton}
          </div>
          {counts.pending > 0 && <p className="-mt-2 text-xs text-muted-foreground">{t("pendingNote")}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            {groupByCategory(skills).map((group) => (
              <CategoryCard key={group.category} category={group.category} skills={group.items} onEdit={(skill) => setTarget({ mode: "edit", skill })} onRemove={setRemoving} />
            ))}
          </div>
        </>
      )}

      <DeclareSkillDialog target={target} declared={skills} onClose={() => setTarget(null)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("removeTitle", { name: removing?.skillName ?? "" })}
        description={t("removeDescription")}
        confirmLabel={t("remove")}
        destructive
        onConfirm={() =>
          remove.mutateAsync(removing!).then(
            () => toast.success(t("removed", { name: removing?.skillName ?? "" })),
            (error: unknown) => {
              toast.error(errorMessage(error));
              throw error;
            },
          )
        }
      />
    </div>
  );
}

function CategoryCard({
  category,
  skills,
  onEdit,
  onRemove,
}: {
  category: EmployeeSkill["category"];
  skills: EmployeeSkill[];
  onEdit: (skill: EmployeeSkill) => void;
  onRemove: (skill: EmployeeSkill) => void;
}) {
  const tCategory = useTranslations("Skills.Categories");
  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label={tCategory(category)}>
      <h3 className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{tCategory(category)}</h3>
      <ul className="divide-y">
        {skills.map((skill) => (
          <MySkillRow key={skill.skillId} skill={skill} onEdit={() => onEdit(skill)} onRemove={() => onRemove(skill)} />
        ))}
      </ul>
    </section>
  );
}

function MySkillRow({ skill, onEdit, onRemove }: { skill: EmployeeSkill; onEdit: () => void; onRemove: () => void }) {
  const t = useTranslations("Skills.Mine");
  const tCommon = useTranslations("Skills");
  const status = skillStatus(skill);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{skill.skillName}</span>
          <SkillStatusBadge skill={skill} />
          {!skill.skillActive && <Badge variant="outline">{tCommon("inactive")}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <LevelLabel level={skill.level} />
          {skill.yearsExperience !== null && (
            <span className="text-muted-foreground">{t("years", { years: formatNumber(skill.yearsExperience) })}</span>
          )}
        </div>
        {status === "adjusted" && skill.selfLevel !== null && (
          <p className="text-xs text-muted-foreground">{t("adjustedNote", { self: skill.selfLevel, confirmed: skill.confirmedLevel ?? 0 })}</p>
        )}
        {status === "addedByManager" && <p className="text-xs text-muted-foreground">{t("addedByManagerNote")}</p>}
        {skill.confirmed && skill.confirmedAt && (
          <p className="text-xs text-muted-foreground">{t("confirmedAt", { date: formatDate(skill.confirmedAt) })}</p>
        )}
        {skill.note && <p className="text-sm whitespace-pre-line text-muted-foreground">{skill.note}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("actions", { name: skill.skillName })} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon /> {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <Trash2Icon /> {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function MySkillsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
      {[3, 2].map((rows, index) => (
        <div key={index} className="space-y-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
