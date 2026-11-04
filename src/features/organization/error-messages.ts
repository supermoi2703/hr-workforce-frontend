import type { Messages } from "next-intl";
import { getErrorMessage, isApiError, type ErrorsTranslator } from "@/lib/api/errors";

type OrgErrorKey = keyof Messages["Organization"]["Errors"];
/** Hàm dịch của namespace "Organization.Errors". */
export type OrgErrorsTranslator = (key: OrgErrorKey) => string;

// Mã lỗi riêng của module tổ chức (README backend modules/organization mục 9.3).
const ERROR_KEYS: Record<string, OrgErrorKey> = {
  ORG_CODE_EXISTS: "codeExists",
  DEPARTMENT_HAS_ACTIVE_TEAMS: "departmentHasTeams",
  ORG_UNIT_HAS_EMPLOYEES: "unitHasEmployees",
  EXECUTIVE_DEPARTMENT_EXISTS: "executiveExists",
  EXECUTIVE_DEPARTMENT_IN_USE: "executiveInUse",
  DEPARTMENT_INACTIVE: "departmentInactive",
  TEAM_INACTIVE: "teamInactive",
  ORG_HEAD_NOT_FOUND: "headNotFound",
  ORG_HEAD_NOT_ACTIVE: "headNotActive",
  ORG_HEAD_NOT_MEMBER: "headNotMember",
};

/** Mã bị trùng thì gắn lỗi vào ô "Mã" của form thay vì báo chung. */
export function isCodeExistsError(error: unknown): boolean {
  return isApiError(error) && error.code === "ORG_CODE_EXISTS";
}

export function getOrgError(error: unknown, t: OrgErrorsTranslator, tErrors: ErrorsTranslator): string {
  if (isApiError(error)) {
    const key = ERROR_KEYS[error.code];
    if (key) return t(key);
  }
  return getErrorMessage(error, tErrors);
}
