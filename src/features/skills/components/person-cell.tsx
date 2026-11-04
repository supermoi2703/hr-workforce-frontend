"use client";

import type { ReactNode } from "react";
import { EyeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";

type PersonCellProps = {
  fullName: string;
  employeeCode: string;
  /** Dòng phụ dưới mã nhân viên (vd cấp bậc). */
  extra?: ReactNode;
  onOpen: () => void;
};

/**
 * Ô "nhân viên" trong bảng: tên hiện như link (màu chủ đạo, gạch chân mờ) để người dùng biết bấm được, mở khung kỹ năng
 * của người đó. Đi cùng nút {@link ViewSkillsButton} ở cột thao tác cho ai không để ý tới link.
 */
export function PersonCell({ fullName, employeeCode, extra, onOpen }: PersonCellProps) {
  const t = useTranslations("Skills.Person");
  return (
    <span className="flex items-center gap-3">
      <UserAvatar name={fullName} seed={employeeCode} />
      <span className="flex min-w-0 flex-col">
        <button
          type="button"
          onClick={onOpen}
          title={t("viewSkillsOf", { name: fullName })}
          className="w-fit text-left font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:decoration-primary focus-visible:outline-none"
        >
          {fullName}
        </button>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {employeeCode}
          {extra}
        </span>
      </span>
    </span>
  );
}

/** Nút "Xem kỹ năng" ở cột thao tác. */
export function ViewSkillsButton({ fullName, onOpen }: { fullName: string; onOpen: () => void }) {
  const t = useTranslations("Skills.Person");
  return (
    <Button size="sm" variant="ghost" onClick={onOpen} aria-label={t("viewSkillsOf", { name: fullName })}>
      <EyeIcon /> <span className="hidden sm:inline">{t("viewSkills")}</span>
    </Button>
  );
}
