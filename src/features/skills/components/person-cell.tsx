"use client";

import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

/** Link chữ trong bảng: màu chữ thường, gạch chân khi rê chuột hoặc focus (như bảng thành viên trang Tổ chức). */
export const TEXT_LINK =
  "rounded-sm text-left underline-offset-4 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

type PersonCellProps = {
  fullName: string;
  employeeCode: string;
  /** Dòng phụ cạnh mã nhân viên (vd cấp bậc). */
  extra?: ReactNode;
  onOpen: () => void;
};

/**
 * Ô "nhân viên" trong bảng. Cả dòng bấm được (DataTable `onRowClick`) để mở khung kỹ năng; tên là nút thật làm cùng việc cho
 * người dùng bàn phím.
 */
export function PersonCell({ fullName, employeeCode, extra, onOpen }: PersonCellProps) {
  const t = useTranslations("Skills.Person");
  return (
    <span className="flex items-center gap-3">
      <UserAvatar name={fullName} seed={employeeCode} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <button type="button" onClick={onOpen} title={t("viewSkillsOf", { name: fullName })} className={cn(TEXT_LINK, "w-fit font-medium")}>
          {fullName}
        </button>
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
          {employeeCode}
          {extra}
        </span>
      </span>
    </span>
  );
}

/**
 * Nút phụ đi cùng nút chính màu đặc (vd "Chốt mức khác" cạnh "Xác nhận"): viền và chữ màu chủ đạo, để nhìn rõ là nút mà
 * vẫn nhẹ hơn nút chính. Dùng với `<Button variant="outline">`.
 */
export const SECONDARY_ACTION =
  "border-primary/50 font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary dark:border-primary/60 dark:text-primary";

/** Dấu › cuối dòng: báo cả dòng bấm được, đậm lên khi rê chuột qua dòng. */
export function RowChevron() {
  return <ChevronRightIcon className="size-4 text-muted-foreground/60 transition-colors group-hover/row:text-foreground" aria-hidden />;
}
