"use client";

import type { ReactNode } from "react";
import { CircleAlertIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { cn } from "@/lib/utils";

// Ba trạng thái mà mọi màn hình có dữ liệu phải xử lý (Definition of Done, docs/01 mục 6).
// Chữ mặc định theo ngôn ngữ đang chọn; truyền prop để thay bằng chữ riêng của màn hình.

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations("States");
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground", className)}>
      <Spinner />
      {label ?? t("loading")}
    </div>
  );
}

type ErrorStateProps = {
  error: unknown;
  title?: string;
  /** Có thì hiện nút "Thử lại" (thường truyền `refetch` của useQuery). */
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ error, title, onRetry, className }: ErrorStateProps) {
  const t = useTranslations("States");
  const tCommon = useTranslations("Common");
  const errorMessage = useErrorMessage();
  return (
    <Empty className={cn("border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{title ?? t("errorTitle")}</EmptyTitle>
        <EmptyDescription>{errorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCwIcon /> {tCommon("retry")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

type EmptyStateProps = {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Nút hành động, vd. "Thêm mới". */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon = <InboxIcon />, action, className }: EmptyStateProps) {
  const t = useTranslations("States");
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title ?? t("emptyTitle")}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
