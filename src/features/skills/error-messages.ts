import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type SkillErrorKey = keyof Messages["Skills"]["Errors"];
/** Hàm dịch của namespace "Skills.Errors". */
export type SkillErrorsTranslator = (key: SkillErrorKey) => string;

// Mã lỗi riêng của module kỹ năng (backend ErrorCode, README modules/skill mục 3 và 5).
const ERROR_KEYS: Record<string, SkillErrorKey> = {
  SKILL_NOT_FOUND: "skillNotFound",
  SKILL_CODE_EXISTS: "codeExists",
  SKILL_NAME_EXISTS: "nameExists",
  SKILL_INACTIVE: "skillInactive",
  EMPLOYEE_SKILL_NOT_FOUND: "employeeSkillNotFound",
  SKILL_NOT_SELF_DECLARED: "notSelfDeclared",
  SKILL_VERIFY_SELF: "verifySelf",
  SKILL_VERIFY_OUT_OF_SCOPE: "outOfScope",
  EMPLOYEE_NOT_WORKING: "employeeNotWorking",
  SKILL_CONFIRM_NOTE_REQUIRED: "noteRequired",
};

export function isSkillErrorCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}

/** Tài khoản chưa gắn hồ sơ nhân viên (vd Admin): tab "Của tôi" hiện hướng dẫn thay vì báo lỗi. */
export function isProfileRequired(error: unknown): boolean {
  return isSkillErrorCode(error, "EMPLOYEE_PROFILE_REQUIRED");
}

/**
 * Lỗi "dữ liệu đã đổi" khi thao tác trên hàng chờ (người khác vừa xác nhận / nhân viên vừa xóa kỹ năng): nên tải lại
 * danh sách để màn hình đúng.
 */
export function isStaleSkillError(error: unknown): boolean {
  return (
    isSkillErrorCode(error, "EMPLOYEE_SKILL_NOT_FOUND") ||
    isSkillErrorCode(error, "SKILL_NOT_SELF_DECLARED") ||
    isSkillErrorCode(error, "EMPLOYEE_NOT_WORKING")
  );
}

export function getSkillError(error: unknown, t: SkillErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
