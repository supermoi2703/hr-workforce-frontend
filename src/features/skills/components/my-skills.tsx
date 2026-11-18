"use client";

import { useState } from "react";
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  ClockIcon,
  ListChecksIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundXIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HeroBanner, type HeroBannerStat } from "@/components/shared/hero-banner";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { formatDate, formatNumber } from "@/lib/format";
import { removeMySkill } from "../api";
import { isProfileRequired } from "../error-messages";
import { useMySkills, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { countByStatus, groupByCategory } from "../rules";
import type { EmployeeSkill } from "../types";
import { ConfirmationNote, ConfirmedByLine } from "./confirmation-info";
import { DeclareSkillDialog, type DeclareTarget } from "./declare-skill-dialog";
import { LevelLabel, SkillStatusChip } from "./skill-level";

type MySkillsProps = {
  /** Số kỹ năng chờ tôi xác nhận; không truyền = tôi không có tab "Chờ xác nhận". */
  pendingCount?: number;
  onOpenPending?: () => void;
};

/**
 * Tab "Kỹ năng của tôi": băng màu nhóm `project` (khối màu đặc duy nhất của trang) tóm tắt và có nút khai; bên dưới là
 * thẻ từng kỹ năng gom theo nhóm. Lời quản lý nằm trong thẻ.
 */
export function MySkills({ pendingCount, onOpenPending }: MySkillsProps) {
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
  const stats: HeroBannerStat[] = [
    { key: "confirmed", icon: BadgeCheckIcon, label: t("summaryConfirmed", { count: counts.confirmed }) },
    { key: "pending", icon: ClockIcon, label: t("summaryPending", { count: counts.pending }) },
  ];
  if (pendingCount && onOpenPending) {
    stats.push({
      key: "toConfirm",
      icon: ListChecksIcon,
      label: (
        <button
          type="button"
          onClick={onOpenPending}
          className="inline-flex items-center gap-0.5 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-hero-foreground/60 focus-visible:outline-none"
        >
          {t("toConfirm", { count: pendingCount })}
          <ChevronRightIcon className="size-4" aria-hidden />
        </button>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <HeroBanner
        tone="project"
        icon={BadgeCheckIcon}
        title={t("bannerTitle")}
        description={counts.pending > 0 ? t("pendingNote") : undefined}
        value={counts.total}
        valueLabel={t("bannerUnit", { count: counts.total })}
        stats={stats}
        actions={
          <Button size="sm" variant="outline" onClick={() => setTarget({ mode: "create" })}>
            <PlusIcon /> {t("add")}
          </Button>
        }
        className="rounded-xl"
      />

      {skills.length === 0 ? (
        <EmptyState className="border border-dashed py-16" icon={<SparklesIcon />} title={t("emptyTitle")} description={t("empty")} />
      ) : (
        <MySkillCards skills={skills} onEdit={(skill) => setTarget({ mode: "edit", skill })} onRemove={setRemoving} />
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

type CardActions = { onEdit: (skill: EmployeeSkill) => void; onRemove: (skill: EmployeeSkill) => void };

/**
 * Mỗi kỹ năng một thẻ trong một lưới chung, xếp theo thứ tự nhóm; tên nhóm ghi nhỏ ở đầu thẻ. Không chia lưới theo nhóm vì
 * mỗi người thường chỉ có 1–2 kỹ năng mỗi nhóm, chia ra thì mỗi hàng chỉ còn một thẻ.
 * Thẻ cùng hàng cao bằng nhau và theo một khuôn: phần nội dung (ghi chú 1 dòng) ở trên, chân thẻ (ai xác nhận / lời quản lý
 * thu gọn / ngày khai) luôn sát đáy, nên các thẻ thẳng hàng dù có thẻ kèm ghi chú.
 */
function MySkillCards({ skills, ...actions }: { skills: EmployeeSkill[] } & CardActions) {
  const ordered = groupByCategory(skills).flatMap((group) => group.items);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ordered.map((skill) => (
        <MySkillCard key={skill.skillId} skill={skill} {...actions} />
      ))}
    </ul>
  );
}

function MySkillCard({ skill, onEdit, onRemove }: { skill: EmployeeSkill } & CardActions) {
  const t = useTranslations("Skills.Mine");
  const tCommon = useTranslations("Skills");
  const tCategory = useTranslations("Skills.Categories");
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="w-full text-xs text-muted-foreground">{tCategory(skill.category)}</span>
          <span className="font-medium">{skill.skillName}</span>
          <SkillStatusChip skill={skill} />
          {!skill.skillActive && <Badge variant="outline">{tCommon("inactive")}</Badge>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2" aria-label={t("actions", { name: skill.skillName })} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(skill)}>
              <PencilIcon /> {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onRemove(skill)}>
              <Trash2Icon /> {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <LevelLabel level={skill.level} />
        {skill.yearsExperience !== null && (
          <span className="text-sm text-muted-foreground">{t("yearsShort", { years: formatNumber(skill.yearsExperience) })}</span>
        )}
      </div>
      {skill.note && (
        <p className="truncate text-sm text-muted-foreground" title={skill.note}>
          {skill.note}
        </p>
      )}
      <div className="mt-auto border-t pt-2">
        {skill.confirmedNote ? (
          <ConfirmationNote skill={skill} collapsible />
        ) : skill.confirmed ? (
          <ConfirmedByLine skill={skill} viewer="self" />
        ) : (
          <p className="text-xs text-muted-foreground">{t("declaredOn", { date: formatDate(skill.updatedAt) })}</p>
        )}
      </div>
    </li>
  );
}

function MySkillsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="space-y-2.5 rounded-xl border p-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
