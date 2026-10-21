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
    "ROLE_CREATED",
    "ROLE_UPDATED",
    "ROLE_DELETED",
  ],
} as const;

export type AuditCategory = keyof typeof AUDIT_ACTIONS_BY_CATEGORY;
export type AuditAction = (typeof AUDIT_ACTIONS_BY_CATEGORY)[AuditCategory][number];
export const AUDIT_ACTIONS: readonly AuditAction[] = Object.values(AUDIT_ACTIONS_BY_CATEGORY).flat();

export const AUDIT_OUTCOMES = ["SUCCESS", "FAILURE"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const AUDIT_TARGET_TYPES = ["USER", "ROLE"] as const;
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
