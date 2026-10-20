"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/states";
import { formatDateTime } from "@/lib/format";
import { formatDevice } from "@/lib/user-agent";
import { useMyActivity } from "../../hooks";
import { SECURITY_ACTIONS, type SecurityAction, type SecurityActivity } from "../../types";

const isKnownAction = (action: string): action is SecurityAction =>
  (SECURITY_ACTIONS as readonly string[]).includes(action);

/** Lịch sử bảo mật của chính mình (đăng nhập, đổi mật khẩu, khóa tài khoản...), mới nhất trước, phân trang server. */
export function ActivityTab() {
  const t = useTranslations("Account.Activity");
  const tDevices = useTranslations("Devices");
  const tableState = useDataTableState();
  const query = useMyActivity(tableState.pageParams);

  // Khai báo cột trong useMemo (tiêu đề theo ngôn ngữ đang chọn) để bảng không tính lại mỗi lần render.
  const columns = useMemo(() => {
    const col = createDataTableColumns<SecurityActivity>();
    return col.columns([
      col.accessor("createdAt", {
        header: t("time"),
        cell: (c) => <time dateTime={c.getValue()}>{formatDateTime(c.getValue())}</time>,
      }),
      col.accessor("action", {
        header: t("event"),
        // Action backend mới thêm mà frontend chưa có bản dịch: hiện nguyên mã.
        cell: (c) => (isKnownAction(c.getValue()) ? t(`actions.${c.getValue() as SecurityAction}`) : c.getValue()),
      }),
      col.accessor("outcome", {
        header: t("result"),
        cell: (c) =>
          c.getValue() === "SUCCESS" ? (
            <Badge variant="success">{t("succeeded")}</Badge>
          ) : (
            <Badge variant="destructive">{t("failed")}</Badge>
          ),
      }),
      col.accessor("userAgent", {
        header: t("device"),
        cell: (c) => formatDevice(c.getValue(), tDevices("unknownDevice")),
      }),
      col.accessor("ipAddress", { header: t("ip"), cell: (c) => c.getValue() ?? "—" }),
    ]);
  }, [t, tDevices]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {/* Không truyền onSortingChange: backend luôn xếp mới nhất trước, bảng không cho sắp xếp. */}
      <DataTable
        columns={columns}
        query={query}
        pagination={tableState.pagination}
        onPaginationChange={tableState.bind.onPaginationChange}
        empty={<EmptyState title={t("empty")} />}
      />
    </div>
  );
}
