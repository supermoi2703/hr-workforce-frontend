/** Kiểu giá trị của một khóa (PolicyValueType của backend). TIME = giờ trong ngày "HH:mm". */
export const POLICY_VALUE_TYPES = ["INTEGER", "DECIMAL", "BOOLEAN", "STRING", "DURATION", "TIME"] as const;
export type PolicyValueType = (typeof POLICY_VALUE_TYPES)[number];

/** Thứ tự module trên trang danh sách. Module mới chưa có ở đây thì xếp cuối theo tên. */
export const POLICY_MODULES = ["approval", "leave", "timesheet", "calendar", "attendance", "face"] as const;

/** Một khóa trong danh sách (PolicySummaryResponse): giá trị toàn công ty đang áp dụng hôm nay. */
export type PolicySummary = {
  key: string;
  /** Thường là PolicyValueType; để string vì backend có thể thêm kiểu mới trước frontend. */
  valueType: string;
  /** Mô tả tiếng Anh do module sở hữu khóa đặt; giao diện ưu tiên bản dịch theo khóa. */
  description: string;
  ownerModule: string;
  minValue: number | null;
  maxValue: number | null;
  officeOverridable: boolean;
  /** null khi chưa có giá trị toàn công ty hiệu lực (lỗi cấu hình, app không khởi động được). */
  currentValue: string | null;
  officeOverrideCount: number;
};

/** Một giá trị theo ngày hiệu lực (PolicyValueResponse). */
export type PolicyValue = {
  id: string;
  /** null = toàn công ty. */
  officeId: string | null;
  value: string;
  /** "yyyy-MM-dd" */
  validFrom: string;
  /** Đã tới ngày hiệu lực (validFrom ≤ hôm nay). KHÔNG có nghĩa là đang áp dụng: mọi bản cũ cũng là true. */
  inEffect: boolean;
};

/** Định nghĩa + toàn bộ lịch sử giá trị, mới nhất trước (PolicyDetailResponse). */
export type PolicyDetail = Omit<PolicySummary, "currentValue" | "officeOverrideCount"> & { values: PolicyValue[] };

/** Văn phòng (OfficeResponse của module tổ chức): chỉ các trường cần để hiện tên. */
export type Office = { id: string; code: string; name: string; active: boolean };

export type AddPolicyValueInput = { officeId: string | null; value: string; validFrom: string };

/** Trạng thái của một giá trị trong phạm vi của nó (toàn công ty hoặc một văn phòng). */
export type ValueStatus = "upcoming" | "current" | "superseded";

export type DurationUnit = "SECONDS" | "MINUTES" | "HOURS";
