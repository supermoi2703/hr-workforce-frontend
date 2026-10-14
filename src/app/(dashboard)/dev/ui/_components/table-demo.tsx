"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchDemoEmployees, type DemoEmployee, type DemoMode } from "./demo-api";

// Khai báo cột ở ngoài component để bảng không phải tính lại mỗi lần render.
const col = createDataTableColumns<DemoEmployee>();
const columns = col.columns([
  col.accessor("code", { header: "Mã NV" }),
  col.accessor("fullName", {
    header: "Họ tên",
    cell: (c) => (
      <span className="flex items-center gap-2.5">
        <UserAvatar name={c.getValue()} seed={c.row.original.code} size="sm" />
        <span className="font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("office", { header: "Văn phòng" }),
  col.accessor("position", { header: "Chức danh", cell: (c) => <Badge variant="secondary">{c.getValue()}</Badge> }),
  col.accessor("joinedAt", { header: "Ngày vào", cell: (c) => formatDate(c.getValue()) }),
  col.accessor("salary", { header: "Lương", enableSorting: false, cell: (c) => formatCurrency(c.getValue()) }),
]);

export function TableDemo() {
  const [mode, setMode] = useState<DemoMode>("normal");
  const tableState = useDataTableState({ pageSize: 10 });

  const query = useQuery({
    queryKey: ["dev", "employees", mode, tableState.pageParams],
    queryFn: () => fetchDemoEmployees(tableState.pageParams, mode),
    placeholderData: keepPreviousData,
    retry: false,
  });

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(value) => setMode(value as DemoMode)}>
        <TabsList>
          <TabsTrigger value="normal">Có dữ liệu</TabsTrigger>
          <TabsTrigger value="empty">Rỗng</TabsTrigger>
          <TabsTrigger value="error">Lỗi</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} query={query} getRowId={(row) => row.id} {...tableState.bind} />
    </div>
  );
}
