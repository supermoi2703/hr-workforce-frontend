/** Mọi AuditAction của backend (enum AuditAction), theo nhóm. Module mới thêm action → thêm ở đây + bản dịch AuditActions. */
export const AUDIT_ACTIONS_BY_CATEGORY = {
  AUTHENTICATION: [
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "LOGIN_LOCKED_OUT",
    "LOGOUT",
    "LOGOUT_ALL",
    "SESSION_REVOKED",
    "SESSIONS_REVOKED_BY_ADMIN",
    "REFRESH_TOKEN_REUSE_DETECTED",
  ],
  ACCOUNT: [
    "ACCOUNT_ACTIVATED",
    "ACTIVATION_CODE_RESENT",
    "GOOGLE_LINKED",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET",
    "PASSWORD_CHANGED",
    "PASSWORD_CHANGE_FAILED",
  ],
  ADMINISTRATION: [
    "USER_CREATED",
    "USER_UPDATED",
    "USER_LOCKED",
    "USER_UNLOCKED",
    "USER_DISABLED",
    "USER_ENABLED",
    "USER_ROLES_CHANGED",
    "ORG_UNIT_CREATED",
    "ORG_UNIT_UPDATED",
    "ORG_UNIT_DEACTIVATED",
    "ORG_UNIT_ACTIVATED",
    "ORG_UNIT_HEAD_CHANGED",
    "USER_LINKED_TO_EMPLOYEE",
    "EMPLOYEE_CREATED",
    "EMPLOYEE_UPDATED",
    "EMPLOYEE_STATUS_CHANGED",
    "EMPLOYEE_SENSITIVE_UPDATED",
    "CONTRACT_CREATED",
    "CONTRACT_UPDATED",
    "CONTRACT_ENDED",
    "CONTRACT_DELETED",
    "CONTRACT_SALARY_ADDED",
    "CONTRACT_SALARY_UPDATED",
    "CONTRACT_SALARY_DELETED",
    "TRANSFER_CREATED",
    "TRANSFER_APPLIED",
    "TRANSFER_CANCELLED",
    "SKILL_CREATED",
    "SKILL_UPDATED",
    "SKILL_DEACTIVATED",
    "SKILL_ACTIVATED",
    "ROLE_CREATED",
    "ROLE_UPDATED",
    "ROLE_DELETED",
    "POLICY_UPDATED",
    "POLICY_VALUE_DELETED",
  ],
  WORKFLOW: [
    "PROJECT_CREATED",
    "PROJECT_UPDATED",
    "PROJECT_CLOSED",
    "PROJECT_PM_CHANGED",
    "PROJECT_OBSERVER_ADDED",
    "PROJECT_OBSERVER_REMOVED",
    "ALLOCATION_APPLIED",
    "ALLOCATION_ENDED",
    "APPROVAL_SUBMITTED",
    "APPROVAL_APPROVED",
    "APPROVAL_REJECTED",
    "APPROVAL_WITHDRAWN",
    "EMPLOYEE_SKILL_DECLARED",
    "EMPLOYEE_SKILL_REMOVED",
    "EMPLOYEE_SKILL_CONFIRMED",
  ],
} as const;

export type AuditCategory = keyof typeof AUDIT_ACTIONS_BY_CATEGORY;
export type AuditAction = (typeof AUDIT_ACTIONS_BY_CATEGORY)[AuditCategory][number];
export const AUDIT_ACTIONS: readonly AuditAction[] = Object.values(AUDIT_ACTIONS_BY_CATEGORY).flat();

export const AUDIT_OUTCOMES = ["SUCCESS", "FAILURE"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_TARGET_TYPES = ["USER", "ROLE", "POLICY", "EMPLOYEE", "CONTRACT"] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/** Một dòng nhật ký (AuditLogResponse). Thời điểm là chuỗi ISO. */
export type AuditLogEntry = {
  id: string;
  /** Thường là AuditAction; để string vì backend có thể thêm action mới trước frontend. */
  action: string;
  category: string;
  outcome: AuditOutcome;
  /** Người thực hiện; null khi không xác định (vd đăng nhập sai bằng email chưa đăng ký, job tự chạy). */
  actor: { id: string | null; email: string | null } | null;
  target: { type: string; id: string | null; label: string | null } | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** Nhóm sự kiện ở tab Lịch sử (enum EmployeeHistoryGroup). Nhóm người xem không có quyền thì backend bỏ qua. */
export const EMPLOYEE_HISTORY_GROUPS = [
  "PROFILE",
  "SENSITIVE",
  "CONTRACT",
  "ACCOUNT",
  "APPROVAL",
  "TRANSFER",
  "SKILL",
] as const;
export type EmployeeHistoryGroup = (typeof EMPLOYEE_HISTORY_GROUPS)[number];

/** Một dòng ở tab Lịch sử (EmployeeHistoryItem). Không có IP, thiết bị. `actorEmail` null = hệ thống. */
export type EmployeeHistoryItem = {
  id: string;
  action: string;
  group: EmployeeHistoryGroup;
  actorEmail: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Bộ lọc (lưu trên URL). `from` / `to` là ngày "yyyy-MM-dd" theo giờ Việt Nam, tính cả hai đầu.
 * `actorLabel` / `targetLabel` chỉ để hiện chip, không gửi lên API.
 */
export type AuditFilters = {
  action?: AuditAction;
  outcome?: AuditOutcome;
  actorId?: string;
  actorLabel?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  targetLabel?: string;
  from?: string;
  to?: string;
};
