"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelTransfer, createTransfer, getEmployeeTransfers } from "./api";
import type { CancelTransferInput } from "./types";

/** Query key của domain điều chuyển. Mọi key bắt đầu bằng "transfers" để invalidate cả nhóm sau khi ghi. */
export const transferKeys = {
  all: ["transfers"] as const,
  employee: (employeeId: string) => ["transfers", "employee", employeeId] as const,
};

/** Điều chuyển có hiệu lực thì hồ sơ đổi (key "employees"), đơn duyệt đổi trạng thái (key "approvals"). */
const RELATED_KEYS = [["employees"], ["approvals"], ["audit"]] as const;

/** Chỉ gọi khi đang mở tab Công tác. */
export function useEmployeeTransfers(employeeId: string) {
  return useQuery({ queryKey: transferKeys.employee(employeeId), queryFn: () => getEmployeeTransfers(employeeId) });
}

function useRefreshAfterWrite() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transferKeys.all }),
      ...RELATED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ]);
}

/** Tải lại danh sách sau lỗi "dữ liệu cũ" (vd người khác vừa đề xuất, hoặc đề xuất đã tới ngày hiệu lực). */
export function useRefreshTransfers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: transferKeys.all });
}

export function useCreateTransfer() {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: createTransfer, onSuccess: refresh });
}

export function useCancelTransfer(id: string) {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: (body: CancelTransferInput) => cancelTransfer(id, body), onSuccess: refresh });
}
