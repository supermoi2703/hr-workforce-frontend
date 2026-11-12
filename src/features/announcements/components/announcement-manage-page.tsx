"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PaginationState } from "@tanstack/react-table";
import { MegaphoneIcon, PinIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDateTime } from "@/lib/format";
import { getAnnouncementError } from "../error-messages";
import {
  useManagedAnnouncements,
  usePublishAnnouncement,
  useRefreshAnnouncements,
  useRemoveAnnouncement,
} from "../hooks";
import { canEdit, canPublish, canRemove, canTargetCompanyWide, isReadable } from "../rules";
import { ANNOUNCEMENT_STATUSES, type AnnouncementItem, type AnnouncementStatus, type OrgOptions } from "../types";
import {
  AnnouncementAudienceLabel,
  AnnouncementCategoryBadge,
  AnnouncementStatusBadge,
} from "./announcement-badges";
import { AnnouncementFormDialog } from "./announcement-form-dialog";

/**
 * Quản lý bài đăng (announcement:manage): HR thấy bài của văn phòng mình, HR_COMPANY và Admin thấy tất cả. Tạo ra nháp,
 * đăng là bước riêng; bài đã đăng chỉ sửa chữ và ghim, không đổi đối tượng nhận. `org` do route truyền vào.
 */
export function AnnouncementManagePage({ org }: { org: OrgOptions }) {
  const t = useTranslations("Announcements");
  const tManage = useTranslations("Announcements.Manage");
  const tStatus = useTranslations("Announcements.statuses");
  const tAnnouncementErrors = useTranslations("Announcements.Errors");
  const tErrors = useTranslations("Errors");
  const { user } = useCurrentUser();
  const companyWide = canTargetCompanyWide(user?.roles);
  const refresh = useRefreshAnnouncements();
  const publish = usePublishAnnouncement();
  const remove = useRemoveAnnouncement();

  const [status, setStatus] = useState<AnnouncementStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const q = useDebouncedValue(keyword.trim());
  const filters = useMemo(() => ({ status: status || undefined, q: q || undefined }), [status, q]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [form, setForm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (pagination.pageIndex !== 0) setPagination({ ...pagination, pageIndex: 0 });
  }

  const query = useManagedAnnouncements(filters, { page: pagination.pageIndex, size: pagination.pageSize });
  const statusChoices = ANNOUNCEMENT_STATUSES.map((value) => ({ value, label: tStatus(value) }));

  /** Lỗi do nơi gọi báo (ConfirmDialog giữ hộp thoại mở khi lỗi); dữ liệu cũ thì tải lại danh sách. */
  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      const { message, stale } = getAnnouncementError(error, tAnnouncementErrors, tErrors);
      toast.error(message);
      if (stale) void refresh();
      throw error;
    }
  }

  function row(announcement: AnnouncementItem) {
    return (
      <li key={announcement.id} className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AnnouncementStatusBadge status={announcement.status} />
          <AnnouncementCategoryBadge category={announcement.category} />
          {announcement.pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <PinIcon className="size-3.5" aria-hidden />
              {t("pinned")}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium break-words">{announcement.title}</p>
          <p className="mt-0.5 line-clamp-1 text-sm break-words text-muted-foreground">{announcement.excerpt}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <AnnouncementAudienceLabel audienceType={announcement.audienceType} audienceName={announcement.audienceName} />
            {" · "}
            {announcement.publishedAt
              ? tManage("publishedAt", { date: formatDateTime(announcement.publishedAt) })
              : tManage("updatedAt", { date: formatDateTime(announcement.updatedAt) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isReadable(announcement.status) && (
            <Link href={`/announcements/${announcement.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {tManage("view")}
            </Link>
          )}
          {canEdit(announcement.status) && (
            <Button variant="outline" size="sm" onClick={() => setForm({ open: true, id: announcement.id })}>
              {tManage("edit")}
            </Button>
          )}
          {canPublish(announcement.status) && (
            <ConfirmDialog
              trigger={<Button size="sm" />}
              triggerLabel={tManage("publish")}
              title={tManage("publishTitle")}
              description={tManage("publishDescription", { title: announcement.title })}
              confirmLabel={tManage("publish")}
              onConfirm={() => run(() => publish.mutateAsync(announcement.id), tManage("published"))}
            />
          )}
          {canRemove(announcement.status) && (
            <ConfirmDialog
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={tManage("remove")}
              title={tManage("removeTitle")}
              description={tManage(
                announcement.status === "PUBLISHED" ? "removePublishedDescription" : "removeDraftDescription",
                { title: announcement.title },
              )}
              confirmLabel={tManage("remove")}
              destructive
              onConfirm={() => run(() => remove.mutateAsync(announcement.id), tManage("removed"))}
            />
          )}
        </div>
      </li>
    );
  }

  let content;
  if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.content.length === 0) {
    content = (
      <EmptyState
        icon={<MegaphoneIcon />}
        title={filters.status || filters.q ? tManage("emptyFiltered") : tManage("empty")}
        className="border border-dashed"
      />
    );
  } else {
    content = (
      <>
        <ul className="divide-y rounded-xl border bg-card">{query.data.content.map(row)}</ul>
        <DataTablePagination
          page={query.data}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tManage("title")}
        description={companyWide ? tManage("descriptionCompany") : tManage("descriptionOffice")}
        actions={
          <>
            <Link href="/announcements" className={buttonVariants({ variant: "outline" })}>
              {tManage("backToBoard")}
            </Link>
            <Button onClick={() => setForm({ open: true, id: null })}>
              <PlusIcon />
              {tManage("create")}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("List.searchPlaceholder")}
            aria-label={t("List.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <ChoiceSelect
          value={status}
          onChange={(value) => setStatus(value as AnnouncementStatus | "")}
          choices={statusChoices}
          noneLabel={tManage("allStatuses")}
          ariaLabel={tManage("statusFilter")}
          className="sm:w-48"
        />
      </div>

      {content}

      <AnnouncementFormDialog
        open={form.open}
        announcementId={form.id}
        companyWide={companyWide}
        org={org}
        onClose={() => setForm({ open: false, id: null })}
      />
    </div>
  );
}
