"use client";

import { useState } from "react";
import { MessageSquareTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { skillStatus } from "../rules";
import type { EmployeeSkill } from "../types";

type ConfirmationInfoProps = {
  skill: EmployeeSkill;
  /** "self" = nhân viên đọc kỹ năng của mình ("Bạn khai…"); "other" = người khác đọc ("Tự khai…"). */
  viewer: "self" | "other";
};

/**
 * Ai xác nhận, khi nào, và lý do (nếu có), viết thành câu đầy đủ (khung kỹ năng của một người). Chốt mức khác mức tự khai
 * luôn có lý do (backend bắt buộc), nên nhân viên biết vì sao bị chốt thấp / cao hơn thay vì chỉ thấy con số.
 */
export function ConfirmationInfo({ skill, viewer }: ConfirmationInfoProps) {
  const t = useTranslations("Skills.Confirmation");
  const status = skillStatus(skill);
  if (status === "pending") return null;

  const name = skill.confirmedByName ?? t("someone");
  const date = formatDate(skill.confirmedAt);
  const line =
    status === "adjusted"
      ? t(viewer === "self" ? "adjustedSelf" : "adjustedOther", {
          self: skill.selfLevel ?? 0,
          confirmed: skill.confirmedLevel ?? 0,
          name,
          date,
        })
      : status === "addedByManager"
        ? t("addedBy", { name, date })
        : t("confirmedBy", { name, date });

  // Có lời nhận xét thì khối nhận xét đã nói ai, mức nào, ngày nào
  if (skill.confirmedNote) return <ConfirmationNote skill={skill} />;
  return <p className="text-xs text-muted-foreground">{line}</p>;
}

/**
 * Dòng ngắn dưới chip trạng thái: "Bạn khai mức 3 · Trịnh Thanh Bình · 04/11/2026". Chip đã nói chuyện gì xảy ra, dòng này
 * chỉ thêm ai, khi nào (và mức tự khai nếu bị chốt khác).
 */
export function ConfirmedByLine({ skill, viewer, className }: ConfirmationInfoProps & { className?: string }) {
  const t = useTranslations("Skills.Confirmation");
  const status = skillStatus(skill);
  if (status === "pending") return null;

  const parts = [
    status === "adjusted" ? t(viewer === "self" ? "declaredSelf" : "declaredOther", { level: skill.selfLevel ?? 0 }) : null,
    skill.confirmedByName ?? t("someone"),
    formatDate(skill.confirmedAt),
  ].filter(Boolean);
  return <p className={cn("text-xs text-muted-foreground", className)}>{parts.join(" · ")}</p>;
}

/**
 * Lời của người xác nhận (nếu có), như một bình luận: ô nền xám nhạt, không viền. Dòng đầu nhỏ, xám: ai, mức cũ → mới (nếu
 * chốt khác), ngày; dòng sau là lời nhận xét. `collapsible`: lời dài chỉ hiện 1 dòng, bấm để xem đủ (thẻ "Của tôi").
 */
export function ConfirmationNote({ skill, collapsible, className }: { skill: EmployeeSkill; collapsible?: boolean; className?: string }) {
  const t = useTranslations("Skills.Confirmation");
  const [expanded, setExpanded] = useState(false);
  if (!skill.confirmedNote) return null;
  const name = skill.confirmedByName ?? t("someone");
  const parts = [
    skillStatus(skill) === "adjusted"
      ? t("noteTitleAdjusted", { name, self: skill.selfLevel ?? 0, confirmed: skill.confirmedLevel ?? 0 })
      : t("noteTitle", { name }),
    skill.confirmedAt ? formatDate(skill.confirmedAt) : null,
  ].filter(Boolean);
  const clamped = collapsible && !expanded;
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-md bg-muted/70 px-3 py-2", className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageSquareTextIcon className="size-3.5 shrink-0" aria-hidden />
        {parts.join(" · ")}
      </p>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          title={clamped ? skill.confirmedNote : undefined}
          className={cn(
            "rounded-sm text-left text-sm whitespace-pre-line focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            clamped && "line-clamp-1",
          )}
        >
          {skill.confirmedNote}
        </button>
      ) : (
        <p className="text-sm whitespace-pre-line">{skill.confirmedNote}</p>
      )}
    </div>
  );
}
