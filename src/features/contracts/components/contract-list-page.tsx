"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { createDataTableColumns, DataTable, useDataTableState } from "@/components/shared/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/format";
import { useContractFilters, useContracts, useExpiringContracts, useOffices } from "../hooks";
import {
  CONTRACT_STATES,
  CONTRACT_TYPES,
  type ContractListItem,
  type ContractState,
  type ContractType,
} from "../types";
import { ContractStateBadge } from "./contract-state-badge";

/** Danh sách hợp đồng trong phạm vi dữ liệu, không có số tiền. Tạo hợp đồng từ trang hồ sơ nhân viên. */
export function ContractListPage() {
  const t = useTranslations("Contracts");
  const tType = useTranslations("Contracts.types");
  const tState = useTranslations("Contracts.states");
  const { filters, updateFilters } = useContractFilters();
  const offices = useOffices();

  // Ô tìm kiếm giữ chữ đang gõ; chờ 300ms mới ghi lên URL.
  const [keyword, setKeyword] = useState(filters.keyword ?? "");
  const debouncedKeyword = useDebouncedValue(keyword.trim());
  useEffect(() => {
    if ((debouncedKeyword || undefined) !== filters.keyword) updateFilters({ keyword: debouncedKeyword || undefined });
  }, [debouncedKeyword, filters.keyword, updateFilters]);

  const tableState = useDataTableState();
  // Đổi bộ lọc thì về trang đầu (trang hiện tại có thể không còn tồn tại trong kết quả mới).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    if (tableState.pagination.pageIndex !== 0) {
      tableState.bind.onPaginationChange({ ...tableState.pagination, pageIndex: 0 });
    }
  }

  const query = useContracts(filters, tableState.pageParams);

  // Id cột trùng field backend cho phép sắp xếp (contractNumber, startDate, endDate).
  const columns = useMemo(() => {
    const col = createDataTableColumns<ContractListItem>();
    return col.columns([
      col.accessor("contractNumber", {
        header: t("Columns.number"),
        cell: (c) => (
          <Link href={`/contracts/${c.row.original.id}`} className="font-medium hover:underline">
            {c.getValue()}
          </Link>
        ),
      }),
      col.accessor("employeeName", {
        header: t("Columns.employee"),
        enableSorting: false,
        cell: (c) => (
          <span className="min-w-0">
            <span className="block truncate">{c.getValue() ?? "—"}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground tabular-nums">
              {c.row.original.employeeCode}
            </span>
          </span>
        ),
      }),
      col.accessor("type", {
        header: t("Columns.type"),
        enableSorting: false,
        cell: (c) => tType(c.getValue()),
      }),
      col.accessor("state", {
        header: t("Columns.state"),
        enableSorting: false,
        cell: (c) => <ContractStateBadge state={c.getValue()} />,
      }),
      col.accessor("startDate", {
        header: t("Columns.startDate"),
        cell: (c) => <time dateTime={c.getValue()}>{formatDate(c.getValue())}</time>,
      }),
      col.accessor("endDate", {
        header: t("Columns.endDate"),
        cell: (c) => {
          const value = c.getValue();
          return value ? (
            <time dateTime={value}>{formatDate(value)}</time>
          ) : (
            <span className="text-muted-foreground">{t("Columns.noEndDate")}</span>
          );
        },
      }),
    ]);
  }, [t, tType]);

  const officeChoices = (offices.data ?? []).map((office) => ({ value: office.id, label: office.name }));
  const typeChoices = CONTRACT_TYPES.map((value) => ({ value, label: tType(value) }));
  const stateChoices = CONTRACT_STATES.map((value) => ({ value, label: tState(value) }));
  const filtered = Boolean(filters.keyword || filters.officeId || filters.type || filters.state);

  return (
    <>
      <PageHeader title={t("List.title")} description={t("List.description")} />

      <ExpiringContracts />

      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
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
        <ChoiceSelect
          value={filters.officeId ?? ""}
          onChange={(value) => updateFilters({ officeId: value || undefined })}
          choices={officeChoices}
          noneLabel={t("Filters.allOffices")}
          ariaLabel={t("Filters.office")}
          className="bg-card sm:w-44"
        />
        <ChoiceSelect
          value={filters.type ?? ""}
          onChange={(value) => updateFilters({ type: (value || undefined) as ContractType | undefined })}
          choices={typeChoices}
          noneLabel={t("Filters.allTypes")}
          ariaLabel={t("Filters.type")}
          className="bg-card sm:w-44"
        />
        <ChoiceSelect
          value={filters.state ?? ""}
          onChange={(value) => updateFilters({ state: (value || undefined) as ContractState | undefined })}
          choices={stateChoices}
          noneLabel={t("Filters.allStates")}
          ariaLabel={t("Filters.state")}
          className="bg-card sm:w-40"
        />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setKeyword("");
              updateFilters({ keyword: undefined, officeId: undefined, type: undefined, state: undefined });
            }}
          >
            <XIcon /> {t("Filters.clear")}
          </Button>
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

/** Hợp đồng sắp hết hạn chưa có hợp đồng nối tiếp. Không có thì ẩn cả khối; lỗi tải cũng ẩn, bảng chính vẫn dùng được. */
function ExpiringContracts() {
  const t = useTranslations("Contracts.Expiring");
  const query = useExpiringContracts();
  const contracts = query.data ?? [];
  if (contracts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-medium">{t("title", { count: contracts.length })}</h2>
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {contracts.map((contract) => (
          <li key={contract.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
            <span className="min-w-0">
              <Link href={`/contracts/${contract.id}`} className="font-medium hover:underline">
                {contract.contractNumber}
              </Link>
              <span className="text-muted-foreground"> · {contract.employeeName ?? contract.employeeCode}</span>
            </span>
            <span className="text-muted-foreground">
              {t("endsOn", { date: contract.endDate ? formatDate(contract.endDate) : "—" })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
