import { http } from "@/lib/api/http-client";
import type { CancelTransferInput, CreatedTransfer, CreateTransferInput, Transfer } from "./types";

const enc = encodeURIComponent;

/** Đề xuất điều chuyển (employee:transfer). Hồ sơ chỉ đổi khi duyệt xong và tới ngày hiệu lực. */
export const createTransfer = (body: CreateTransferInput) => http.post<CreatedTransfer>("/api/transfers", body);

/** Lịch sử công tác của một nhân viên, mới nhất trước (employee:read, trong phạm vi). Ngoài phạm vi → 404. */
export const getEmployeeTransfers = (employeeId: string) =>
  http.get<Transfer[]>(`/api/employees/${enc(employeeId)}/transfers`);

/** Hủy đề xuất đã duyệt mà chưa tới ngày hiệu lực (employee:manage). Đề xuất đang chờ thì rút ở /approvals. */
export const cancelTransfer = (id: string, body: CancelTransferInput) =>
  http.post<Transfer>(`/api/transfers/${enc(id)}/cancel`, body);
