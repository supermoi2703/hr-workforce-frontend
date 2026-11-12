"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks";
import { badgeLabel, safeLink } from "../rules";
import type { AppNotification } from "../types";
import { NotificationItem } from "./notification-item";

const PREVIEW_SIZE = 10;

/** Chuông trên header: số chưa đọc (realtime + hỏi lại dự phòng), bấm mở 10 thông báo mới nhất. */
export function NotificationBell() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications(false, { page: 0, size: PREVIEW_SIZE }, { enabled: open });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const badge = badgeLabel(unread.data);

  const openNotification = (notification: AppNotification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    const link = safeLink(notification.link);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={badge ? t("bellWithCount", { count: unread.data ?? 0 }) : t("bell")}
          />
        }
      >
        <BellIcon />
        {badge && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
          >
            {badge}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-1 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("title")}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!unread.data || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheckIcon /> {t("markAllRead")}
          </Button>
        </div>
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto px-1 py-1">
          {list.isPending ? (
            <LoadingState className="py-8" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} className="py-6" />
          ) : list.data.content.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            list.data.content.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
            ))
          )}
        </div>
        <div className="border-t p-1">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full" })}
          >
            {t("viewAll")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
