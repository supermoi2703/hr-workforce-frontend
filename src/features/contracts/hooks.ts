"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/types";
import {
  addSalary,
  createContract,
  deleteContract,
  deleteSalary,
  endContract,
  getContract,
  getExpiringContracts,
  getMyContracts,
  getOffices,
  searchContracts,
  updateContract,
  updateSalary,
} from "./api";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import type { ContractDetail, ContractFilters, EndContractInput, SalaryInput, UpdateContractInput } from "./types";

/** Query key của domain hợp đồng. Mọi key bắt đầu bằng "contracts" để invalidate cả nhóm sau khi sửa. */
export const contractKeys = {
  all: ["contracts"] as const,
  list: (filters: ContractFilters & { employeeId?: string }, params: PageParams) =>
    ["contracts", "list", filters, params] as const,
  expiring: ["contracts", "expiring"] as const,
  detail: (id: string) => ["contracts", "detail", id] as const,
  mine: ["contracts", "mine"] as const,
  offices: ["contracts", "offices"] as const,
};

/** Hợp đồng đổi loại nhân viên ở hồ sơ: làm mới cả hồ sơ (key "employees"). */
const EMPLOYEES_KEY = ["employees"] as const;

/** Số tiền: không giữ trong bộ nhớ đệm lâu sau khi rời màn hình. */
const SALARY_GC_TIME = 30_000;

/** Bộ lọc danh sách nằm trên URL (F5 / gửi link giữ nguyên). */
export function useContractFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<ContractFilters>) => {
      const query = filtersToSearchParams({ ...filters, ...patch }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, router, pathname],
  );

  return { filters, updateFilters };
}

export function useContracts(filters: ContractFilters & { employeeId?: string }, params: PageParams) {
  return useQuery({
    queryKey: contractKeys.list(filters, params),
    queryFn: () => searchContracts(filters, params),
    placeholderData: keepPreviousData,
  });
}

export function useExpiringContracts() {
  return useQuery({ queryKey: contractKeys.expiring, queryFn: getExpiringContracts });
}

export function useContract(id: string) {
  return useQuery({ queryKey: contractKeys.detail(id), queryFn: () => getContract(id), gcTime: SALARY_GC_TIME });
}

/** Chỉ gọi khi tài khoản có gắn hồ sơ. */
export function useMyContracts(enabled: boolean) {
  return useQuery({ queryKey: contractKeys.mine, queryFn: getMyContracts, enabled, gcTime: SALARY_GC_TIME });
}

export function useOffices() {
  return useQuery({ queryKey: contractKeys.offices, queryFn: getOffices, staleTime: 10 * 60_000 });
}

// ===== Ghi =====

/** Response có version mới: ghi thẳng vào cache chi tiết, rồi làm mới danh sách và hồ sơ. */
function useStoreDetail() {
  const queryClient = useQueryClient();
  return (detail: ContractDetail) => {
    queryClient.setQueryData(contractKeys.detail(detail.contract.id), detail);
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: contractKeys.all, predicate: (q) => q.queryKey[1] !== "detail" }),
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    ]);
  };
}

export function useCreateContract() {
  const store = useStoreDetail();
  return useMutation({ mutationFn: createContract, onSuccess: store });
}

export function useUpdateContract(id: string) {
  const store = useStoreDetail();
  return useMutation({ mutationFn: (body: UpdateContractInput) => updateContract(id, body), onSuccess: store });
}

export function useEndContract(id: string) {
  const store = useStoreDetail();
  return useMutation({ mutationFn: (body: EndContractInput) => endContract(id, body), onSuccess: store });
}

export function useDeleteContract(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteContract(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: contractKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: contractKeys.all }),
        queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
      ]);
    },
  });
}

export function useSaveSalary(contractId: string, salaryId?: string) {
  const store = useStoreDetail();
  return useMutation({
    mutationFn: (body: SalaryInput) =>
      salaryId ? updateSalary(contractId, salaryId, body) : addSalary(contractId, body),
    onSuccess: store,
  });
}

export function useDeleteSalary(contractId: string) {
  const store = useStoreDetail();
  return useMutation({ mutationFn: (salaryId: string) => deleteSalary(contractId, salaryId), onSuccess: store });
}

/** Tải lại hợp đồng sau lỗi "dữ liệu cũ". */
export function useRefreshContract(id: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: contractKeys.detail(id) });
}
