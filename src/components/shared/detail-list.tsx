import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Khối thông tin dạng nhãn – giá trị (hồ sơ, chi tiết tài khoản...). Dùng kèm <DetailRow>. */
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y rounded-xl border bg-card text-sm", className)}>{children}</dl>;
}

/** Một dòng: nhãn bên trái (màn hẹp thì nằm trên), giá trị bên phải. */
export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
