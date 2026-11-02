/** Kiểu dữ liệu khớp DTO backend (modules/attendance, modules/face). */

export type MatchLevel = "HIGH" | "MEDIUM" | "LOW";
export type PunchSource = "KIOSK" | "WEB";

export type EmployeeRef = {
  id: string;
  employeeCode: string | null;
  fullName: string | null;
};

/** Một lần chấm công (quét mặt). Check-in = lần đầu trong ngày, check-out = lần cuối. */
export type Punch = {
  id: string;
  employee: EmployeeRef;
  workDate: string;
  punchedAt: string;
  source: PunchSource;
  matchScore: number | null;
  matchLevel: MatchLevel | null;
  userConfirmed: boolean;
  photoFileId: string | null;
};

export type ScanStatus = "RECORDED" | "DUPLICATE" | "CONFIRM_REQUIRED" | "NOT_RECOGNIZED";

export type ScanResult = {
  status: ScanStatus;
  employee: EmployeeRef | null;
  /** Điểm cosine 0..1 của người khớp nhất. */
  score: number;
  level: MatchLevel;
  confirmationId: string | null;
  confirmationExpiresAt: string | null;
  punch: Punch | null;
  timingMs: Record<string, number>;
};

export type FaceProfileStatus = "ACTIVE" | "REVOKED";

export type EmployeeFaceStatus = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  officeId: string | null;
  /** null = chưa từng đăng ký. */
  status: FaceProfileStatus | null;
  enrolledAt: string | null;
  templateCount: number;
};

export type FaceProfile = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  status: FaceProfileStatus;
  model: string;
  consentVersion: string;
  consentedAt: string;
  enrolledAt: string;
  revokedAt: string | null;
  templates: { id: string; photoFileId: string | null; detScore: number | null }[];
  /** Điểm thấp nhất giữa các cặp ảnh mẫu, chỉ có ngay sau khi đăng ký. */
  minPairSimilarity: number | null;
};

export type PunchFilters = {
  from: string;
  to: string;
  employeeId?: string;
};

/** Tóm tắt một ngày của một nhân viên: lần quét đầu (check-in) và cuối (check-out). */
export type DailyAttendance = {
  key: string;
  workDate: string;
  employee: EmployeeRef;
  first: Punch;
  last: Punch | null;
  punches: Punch[];
};
