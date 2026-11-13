import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BlockSectionProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Một khối của trang /dashboard: tiêu đề cấp 2, mô tả, nút bên phải. */
export function BlockSection({ title, description, actions, children, className }: BlockSectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("grid gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <h2 id={id} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Khung trắng chứa một biểu đồ hoặc bảng trong khối. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 content-start gap-4 rounded-xl border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
