"use client";

import { MessageSquareQuoteIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { skillStatus } from "../rules";
import type { EmployeeSkill } from "../types";

type ConfirmationInfoProps = {
  skill: EmployeeSkill;
  /** "self" = nhân viên đọc kỹ năng của mình ("Bạn khai…"); "other" = người khác đọc ("Tự khai…"). */
  viewer: "self" | "other";
};

/**
 * Ai xác nhận, khi nào, và lý do (nếu có). Chốt mức khác mức tự khai luôn có lý do (backend bắt buộc), nên nhân viên
 * biết vì sao bị chốt thấp / cao hơn thay vì chỉ thấy con số.
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

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{line}</p>
      {skill.confirmedNote && (
        <blockquote className="flex gap-2 rounded-md border-l-2 border-info bg-info/5 px-2.5 py-1.5 text-sm">
          <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <span className="whitespace-pre-line">
            <span className="sr-only">{t("noteLabel", { name })}: </span>
            {skill.confirmedNote}
          </span>
        </blockquote>
      )}
    </div>
  );
}
