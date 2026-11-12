"use client";

import type { ReactNode } from "react";
import {
  BadgeCheckIcon,
  BellIcon,
  BriefcaseBusinessIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClipboardCheckIcon,
  ClockAlertIcon,
  FileClockIcon,
  FolderMinusIcon,
  GraduationCapIcon,
  RepeatIcon,
  Undo2Icon,
} from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { detailOf, isKnownType, messageValues } from "../rules";
import type { AppNotification } from "../types";

function iconOf(notification: AppNotification): ReactNode {
  switch (notification.type) {
    case "APPROVAL_PENDING":
      return <ClipboardCheckIcon />;
    case "APPROVAL_REASSIGNED":
      return <RepeatIcon />;
    case "APPROVAL_COMPLETED":
      if (notification.params.status === "APPROVED") return <CircleCheckIcon className="text-success" />;
      if (notification.params.status === "REJECTED") return <CircleXIcon className="text-destructive" />;
      return <Undo2Icon />;
    case "SKILL_DECLARED":
      return <GraduationCapIcon />;
    case "SKILL_CONFIRMED":
      return <BadgeCheckIcon />;
    case "ALLOCATION_ENDED":
      return <FolderMinusIcon />;
    case "PROJECT_MANAGER_ASSIGNED":
    case "PROJECT_MANAGER_REMOVED":
      return <BriefcaseBusinessIcon />;
    case "CONTRACT_EXPIRING":
      return <FileClockIcon />;
    case "MISSING_CHECKOUT":
      return <ClockAlertIcon />;
    default:
      return <BellIcon />;
  }
}

/** Câu thông báo theo ngôn ngữ đang chọn (ghép từ type + params). */
export function useNotificationText() {
  const t = useTranslations("Notifications");
  const tApproval = useTranslations("Approvals.types");
  return (notification: AppNotification) => {
    if (!isKnownType(notification.type)) return t("unknownType");
    const values = messageValues(notification, {
      formatDate: (value) => formatDate(value),
      translateApprovalType: (type) => (tApproval.has(type as never) ? tApproval(type as never) : type),
    });
    return t(`types.${notification.type}`, values);
  };
}

/** Một dòng thông báo: icon, câu, dòng phụ (lý do / ghi chú), thời gian tương đối, chấm xanh nếu chưa đọc. */
export function NotificationItem({
  notification,
  onOpen,
  className,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  className?: string;
}) {
  const t = useTranslations("Notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const text = useNotificationText()(notification);
  const detail = detailOf(notification);
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        unread && "bg-primary/5",
        className,
      )}
    >
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
        {iconOf(notification)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm leading-snug break-words", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
          {text}
        </span>
        {detail && (
          <span className="line-clamp-2 text-xs text-muted-foreground break-words">
            {t(detail.kind === "comment" ? "detail.comment" : "detail.note", { text: detail.text })}
          </span>
        )}
        <time dateTime={notification.createdAt} className="text-xs text-muted-foreground">
          {format.relativeTime(new Date(notification.createdAt), now)}
        </time>
      </span>
      {unread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
          <span className="sr-only">{t("unread")}</span>
        </span>
      )}
    </button>
  );
}
