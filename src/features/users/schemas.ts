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
