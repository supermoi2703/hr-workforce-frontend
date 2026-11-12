// Kiểu dữ liệu khớp DTO của module transfer (backend README transfer mục 5).

/** Đang chờ duyệt → đã duyệt, chờ tới ngày hiệu lực → hồ sơ đã đổi; hoặc bị từ chối / rút / hủy. */
export const TRANSFER_STATUSES = ["PENDING", "APPROVED", "APPLIED", "REJECTED", "WITHDRAWN", "CANCELLED"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

/** Bốn thứ có thể đổi. `teamId` null = không thuộc team nào. */
export type UnitSet = {
  officeId: string;
  departmentId: string;
  teamId: string | null;
  positionId: string;
};

export type UnitKind = "office" | "department" | "team" | "position";

/** Một lần điều chuyển; dòng APPLIED là lịch sử công tác. */
export type Transfer = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  from: UnitSet;
  to: UnitSet;
  /** "yyyy-MM-dd" */
  effectiveDate: string;
  reason: string;
  status: TransferStatus;
  /** Ngày hồ sơ thực sự đổi. */
  appliedOn: string | null;
  /** Chữ HR nhập khi hủy, hoặc mã hệ thống (EMPLOYEE_TERMINATED, ORG_UNIT_UNAVAILABLE). */
  cancelReason: string | null;
  /** Yêu cầu duyệt tương ứng, để link sang /approvals. */
  approvalRequestId: string | null;
  createdAt: string;
};

/** Body POST /api/transfers: trạng thái đích ĐẦY ĐỦ (đơn vị không đổi thì gửi lại giá trị hiện tại). */
export type CreateTransferInput = {
  employeeId: string;
  officeId: string;
  departmentId: string;
  teamId: string | null;
  positionId: string;
  effectiveDate: string;
  reason: string;
};

export type CancelTransferInput = { reason: string };

/** `warnings`: EMPLOYEE_IS_UNIT_HEAD = người này đang là trưởng phòng / trưởng team. */
export type CreatedTransfer = { transfer: Transfer; warnings: string[] };

export const UNIT_HEAD_WARNING = "EMPLOYEE_IS_UNIT_HEAD";

// ===== Danh mục đơn vị: route truyền vào (feature không import features/employees) =====

export type UnitOption = { id: string; name: string; active: boolean };
export type TeamOption = UnitOption & { departmentId: string };

export type OrgOptions = {
  offices?: UnitOption[];
  departments?: UnitOption[];
  teams?: TeamOption[];
  positions?: UnitOption[];
  isPending: boolean;
};

/** Phần của hồ sơ mà tab Công tác cần, khai bằng kiểu nguyên thủy. */
export type TransferEmployee = UnitSet & {
  id: string;
  fullName: string;
  status: string;
};
