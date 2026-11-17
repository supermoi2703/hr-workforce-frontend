"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { askPolicyQa, getPolicyQaStatus } from "./api";

export const POLICY_QA_PERMISSION = "ai:policy-qa";

export const policyQaKeys = {
  status: ["policy-qa", "status"] as const,
};

/** Trạng thái đổi hiếm (bật tắt, chế độ tìm); 30 giây là đủ tươi. */
export function usePolicyQaStatus() {
  return useQuery({ queryKey: policyQaKeys.status, queryFn: getPolicyQaStatus, staleTime: 30_000 });
}

/** Mỗi câu hỏi là một lần gọi riêng; kết quả giữ ở state trang, không cache (câu trả lời có thể đổi theo cài đặt). */
export function useAskPolicyQa() {
  return useMutation({ mutationFn: askPolicyQa });
}
