import type { Messages } from "next-intl";
import { z } from "zod";

type ValidationKey = keyof Messages["Users"]["Validation"];
/** Hàm dịch của namespace "Users.Validation". */
export type UsersValidationTranslator = (key: ValidationKey) => string;

// Khớp CreateUserRequest / UpdateUserRequest của backend (email ≤ 254, displayName 1–150, không chỉ có khoảng trắng).

function displayNameField(t: UsersValidationTranslator) {
  return z.string().trim().min(1, t("displayNameRequired")).max(150, t("displayNameTooLong"));
}

export function createUserSchema(t: UsersValidationTranslator) {
  return z.object({
    email: z.email(t("emailInvalid")).max(254, t("emailInvalid")),
    displayName: displayNameField(t),
    roleCodes: z.array(z.string()),
  });
}

export type CreateUserFormValues = z.infer<ReturnType<typeof createUserSchema>>;

export function updateUserSchema(t: UsersValidationTranslator) {
  return z.object({ displayName: displayNameField(t) });
}

export type UpdateUserFormValues = z.infer<ReturnType<typeof updateUserSchema>>;

// ----- Vai trò -----

type RoleValidationKey = keyof Messages["RoleAdmin"]["Validation"];
/** Hàm dịch của namespace "RoleAdmin.Validation". */
export type RoleValidationTranslator = (key: RoleValidationKey) => string;

/** Mã role: khớp CreateRoleRequest của backend (3–50 ký tự, chữ HOA / số / gạch dưới, bắt đầu bằng chữ). */
export const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,49}$/;

function roleNameFields(t: RoleValidationTranslator) {
  return {
    name: z.string().trim().min(1, t("nameRequired")).max(100, t("nameTooLong")),
    description: z.string().trim().max(500, t("descriptionTooLong")),
  };
}

export function createRoleSchema(t: RoleValidationTranslator) {
  return z.object({
    // Gõ chữ thường vẫn được: đổi sang HOA trước khi kiểm tra (ô nhập cũng hiện chữ HOA bằng CSS).
    code: z.string().trim().toUpperCase().regex(ROLE_CODE_PATTERN, t("codeInvalid")),
    ...roleNameFields(t),
  });
}

export type CreateRoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;

export function updateRoleSchema(t: RoleValidationTranslator) {
  return z.object({ ...roleNameFields(t), permissionCodes: z.array(z.string()) });
}

export type UpdateRoleFormValues = z.infer<ReturnType<typeof updateRoleSchema>>;
