"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { addPolicyValue, deletePolicyValue, getOffices, getPolicies, getPolicy } from "./api";
import type { AddPolicyValueInput, DurationUnit } from "./types";
import { formatPolicyValue, policyMessageKey, type ValueLabels } from "./values";

export const MANAGE_PERMISSION = "policy:manage";

export const policyKeys = {
  all: ["policies"] as const,
  list: ["policies", "list"] as const,
  detail: (key: string) => ["policies", "detail", key] as const,
  offices: ["policies", "offices"] as const,
};

/** `staleTime: 0`: người khác có thể vừa đổi giá trị, mở lại trang là tải lại ngay. */
export function usePolicies() {
  return useQuery({ queryKey: policyKeys.list, queryFn: getPolicies, staleTime: 0 });
}

export function usePolicy(key: string) {
  return useQuery({ queryKey: policyKeys.detail(key), queryFn: () => getPolicy(key), staleTime: 0 });
}

/** Danh sách văn phòng ít thay đổi: giữ 10 phút. */
export function useOffices() {
  return useQuery({ queryKey: policyKeys.offices, queryFn: getOffices, staleTime: 10 * 60_000 });
}

/**
 * Đổi chính sách làm thay đổi dữ liệu của module khác (giờ làm, số dư phép...) mà feature này không biết queryKey:
 * làm mới MỌI query đang dùng (query không có ai dùng chỉ bị đánh dấu cũ, không gọi lại).
 */
export function useAddPolicyValue(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPolicyValueInput) => addPolicyValue(key, input),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeletePolicyValue(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valueId: string) => deletePolicyValue(key, valueId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Tên / mô tả của khóa và tên module: có bản dịch thì dùng, không có thì hiện mã khóa và mô tả gốc của backend. */
export function usePolicyLabels() {
  const t = useTranslations("Policies");
  return useMemo(
    () => ({
      name: (key: string) => {
        const id = `keys.${policyMessageKey(key)}.name`;
        return t.has(id as never) ? t(id as never) : key;
      },
      description: (key: string, fallback: string) => {
        const id = `keys.${policyMessageKey(key)}.description`;
        return t.has(id as never) ? t(id as never) : fallback;
      },
      module: (module: string) => (t.has(`modules.${module}` as never) ? t(`modules.${module}` as never) : module),
      type: (type: string) => (t.has(`types.${type}` as never) ? t(`types.${type}` as never) : type),
    }),
    [t],
  );
}

/** formatPolicyValue với bản dịch đơn vị thời lượng và Có / Không. */
export function useFormatPolicyValue() {
  const t = useTranslations("Policies.units");
  const labels = useMemo<ValueLabels>(
    () => ({
      duration: (amount: number, unit: DurationUnit) => t(unit, { count: amount }),
      yes: t("yes"),
      no: t("no"),
      number: (value: number) => formatNumber(value),
    }),
    [t],
  );
  return useCallback((type: string, raw: string | null) => formatPolicyValue(type, raw, labels), [labels]);
}

/** Tên văn phòng theo id: văn phòng ngừng hoạt động có ghi chú, id lạ (đã xóa / chưa tải xong) hiện "Văn phòng không xác định". */
export function useOfficeName() {
  const t = useTranslations("Policies.scope");
  const offices = useOffices();
  const byId = useMemo(() => new Map((offices.data ?? []).map((office) => [office.id, office])), [offices.data]);
  return useCallback(
    (officeId: string) => {
      const office = byId.get(officeId);
      if (!office) return t("unknownOffice");
      return office.active ? office.name : t("inactiveOffice", { name: office.name });
    },
    [byId, t],
  );
}
