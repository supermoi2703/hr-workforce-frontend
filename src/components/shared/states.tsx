"use client";

import type { ReactNode } from "react";
import { CircleAlertIcon, InboxIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

// Ba trạng thái mà mọi màn hình có dữ liệu phải xử lý (Definition of Done, docs/01 mục 6).

export function LoadingState({ label = "Đang tải dữ liệu...", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground", className)}>
      <Spinner />
      {label}
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

export function ErrorState({ error, title = "Không tải được dữ liệu", onRetry, className }: ErrorStateProps) {
  return (
    <Empty className={cn("border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCwIcon /> Thử lại
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

export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  icon = <InboxIcon />,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
