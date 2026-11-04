import { http } from "@/lib/api/http-client";
import type { AddPolicyValueInput, Office, PolicyDetail, PolicySummary, PolicyValue } from "./types";

const base = (key: string) => `/api/policies/${encodeURIComponent(key)}`;

/** Mọi khóa kèm giá trị toàn công ty hôm nay (policy:read). Ít khóa nên không phân trang. */
export const getPolicies = () => http.get<PolicySummary[]>("/api/policies");

/** Định nghĩa + lịch sử giá trị, mới nhất trước. Khóa không tồn tại → 404 POLICY_NOT_FOUND. */
export const getPolicy = (key: string) => http.get<PolicyDetail>(base(key));

/**
 * Thêm giá trị từ hôm nay trở đi (policy:manage). Trùng (văn phòng, ngày) với giá trị CHƯA tới ngày thì backend ghi đè
 * giá trị đó; trùng với giá trị đã có hiệu lực → 409.
 */
export const addPolicyValue = (key: string, input: AddPolicyValueInput) =>
  http.post<PolicyValue>(`${base(key)}/values`, input);

/** Chỉ xóa được giá trị chưa tới ngày hiệu lực. */
export const deletePolicyValue = (key: string, valueId: string) =>
  http.delete<void>(`${base(key)}/values/${encodeURIComponent(valueId)}`);

/**
 * Văn phòng (module tổ chức của Quang, chỉ cần đăng nhập), kể cả văn phòng đã ngừng hoạt động: giá trị cũ của chúng vẫn
 * phải hiện được tên. Frontend chưa có feature tổ chức nên tạm gọi ở đây; chuyển lên lib/ khi có.
 */
export const getOffices = () => http.get<Office[]>("/api/offices", { query: { includeInactive: true } });
