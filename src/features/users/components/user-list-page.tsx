"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RequireAccess } from "@/components/shared/require-access";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import type { UserStatus } from "@/lib/auth/types";
import { formatDateTime } from "@/lib/format";
import { useRoleLabel, useRoles, useUsers } from "../hooks";
import type { UserListFilters, UserSummary } from "../types";
import { CreateUserDialog } from "./create-user-dialog";
import { UserActionsMenu } from "./user-actions-menu";

const STATUSES: UserStatus[] = ["PENDING", "ACTIVE", "LOCKED", "DISABLED"];
/** Giá trị "không lọc" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const ALL = "all";

/** Danh sách tài khoản: tìm kiếm, lọc theo trạng thái / vai trò, sắp xếp và phân trang phía server. */
export function UserListPage() {
  const t = useTranslations("Users");
  const tStatus = useTranslations("UserStatus");
  const { hasPermission } = useCurrentUser();
  const roles = useRoles();
  const roleLabel = useRoleLabel();

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [role, setRole] = useState<string>(ALL);
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  const tableState = useDataTableState();

  const filters = useMemo<UserListFilters>(
    () => ({
      keyword: debouncedKeyword || undefined,
      status: status === ALL ? undefined : (status as UserStatus),
      role: role === ALL ? undefined : role,
    }),
    [debouncedKeyword, status, role],
  );

  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn tồn tại trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useUsers(filters, tableState.pageParams);

  // Khai báo cột trong useMemo (tiêu đề theo ngôn ngữ) để bảng không tính lại mỗi lần render.
  // Id cột trùng tên field backend cho phép sắp xếp (displayName, status, lastLoginAt).
  const columns = useMemo(() => {
    const col = createDataTableColumns<UserSummary>();
    return col.columns([
      col.accessor("displayName", {
        header: t("Columns.account"),
        cell: (c) => {
          const user = c.row.original;
          return (
            <span className="flex min-w-0 items-center gap-2.5">
              <UserAvatar name={user.displayName} seed={user.id} size="sm" />
              <span className="min-w-0">
                <Link href={`/admin/users/${user.id}`} className="block truncate font-medium hover:underline">
                  {user.displayName}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
            </span>
          );
        },
      }),
      col.accessor("roles", {
        header: t("Columns.roles"),
        enableSorting: false,
        cell: (c) => (
          <span className="flex flex-wrap gap-1">
            {c.getValue().map((code) => (
              <Badge key={code} variant="secondary">
                {roleLabel(code)}
              </Badge>
            ))}
          </span>
        ),
      }),
      col.accessor("status", {
        header: t("Columns.status"),
        cell: (c) => <UserStatusBadge status={c.getValue()} />,
      }),
      col.accessor("lastLoginAt", {
        header: t("Columns.lastLogin"),
        cell: (c) => {
          const value = c.getValue();
          return value ? (
            <time dateTime={value}>{formatDateTime(value)}</time>
          ) : (
            <span className="text-muted-foreground">{t("List.never")}</span>
          );
        },
      }),
      // Menu "…" mỗi dòng: cùng thao tác như trang chi tiết, chỉ hiện mục được phép.
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("Actions.menu")}</span>,
        cell: (c) => (
          <div className="flex justify-end">
            <UserActionsMenu user={c.row.original} variant="row" />
          </div>
        ),
      }),
    ]);
  }, [t, roleLabel]);

  const statusItems = { [ALL]: t("Filters.allStatuses"), ...Object.fromEntries(STATUSES.map((s) => [s, tStatus(s)])) };
  const roleItems = {
    [ALL]: t("Filters.allRoles"),
    ...Object.fromEntries((roles.data ?? []).map((r) => [r.code, roleLabel(r.code)])),
  };

  return (
    <>
      <PageHeader
        title={t("List.title")}
        description={t("List.description")}
        actions={
          <RequireAccess access={{ permissions: ["user:create"] }} fallback={null}>
            <CreateUserDialog />
          </RequireAccess>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("Filters.search")}
            aria-label={t("Filters.search")}
            className="bg-card pl-8"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(String(value))} items={statusItems}>
          <SelectTrigger className="w-full bg-card sm:w-44" aria-label={t("Filters.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Lọc theo vai trò cần danh sách role (role:read). */}
        {hasPermission("role:read") && (
          <Select value={role} onValueChange={(value) => setRole(String(value))} items={roleItems}>
            <SelectTrigger className="w-full bg-card sm:w-44" aria-label={t("Filters.role")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        columns={columns}
        query={query}
        getRowId={(row) => row.id}
        empty={<EmptyState title={t("List.empty")} />}
        {...tableState.bind}
      />
    </>
  );
}
