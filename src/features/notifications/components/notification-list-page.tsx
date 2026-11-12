"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CheckCheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks";
import { safeLink } from "../rules";
import type { AppNotification } from "../types";
import { NotificationItem } from "./notification-item";

const PAGE_SIZE = 20;
type Filter = "all" | "unread";

/** Mọi thông báo của tôi, mới nhất trước. Mở từ "Xem tất cả" trong chuông. */
export function NotificationListPage() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const unread = useUnreadCount();
  const list = useNotifications(filter === "unread", { page, size: PAGE_SIZE });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const openNotification = (notification: AppNotification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    const link = safeLink(notification.link);
    if (link) router.push(link);
  };

  const totalPages = list.data?.totalPages ?? 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("pageDescription")}
        actions={
          <Button variant="outline" disabled={!unread.data || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
            <CheckCheckIcon /> {t("markAllRead")}
          </Button>
        }
      />
      <Tabs
        value={filter}
        onValueChange={(value) => {
          setFilter(value as Filter);
          setPage(0);
        }}
      >
        <TabsList aria-label={t("filter")}>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
          <TabsTrigger value="unread">
            {t("tabs.unread")}
            {unread.data ? ` (${unread.data})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardContent className="p-2">
          {list.isPending ? (
            <LoadingState className="py-12" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} className="py-10" />
          ) : list.data.content.length === 0 ? (
            <EmptyState
              icon={<BellIcon />}
              title={filter === "unread" ? t("emptyUnread") : t("empty")}
              className="py-12"
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {list.data.content.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onOpen={openNotification} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>{t("pageOf", { page: page + 1, total: totalPages })}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("previousPage")}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("nextPage")}
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </>
  );
}
