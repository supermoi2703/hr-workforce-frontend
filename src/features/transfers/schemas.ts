import type { Messages } from "next-intl";
import { z } from "zod";
import type { CancelTransferInput, CreateTransferInput } from "./types";

type ValidationKey = keyof Messages["Transfers"]["Validation"];
/** Hàm dịch của namespace "Transfers.Validation". */
export type TransfersValidationTranslator = (key: ValidationKey) => string;

// Khớp CreateTransferRequest của backend. Backend vẫn kiểm tra lại (đơn vị còn dùng, quyền, ngày).
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `today` "yyyy-MM-dd": ngày hiệu lực từ hôm nay trở đi (backend TRANSFER_INVALID_DATE). */
export function transferSchema(t: TransfersValidationTranslator, today: string) {
  return z.object({
    officeId: z.string().min(1, t("required")),
    departmentId: z.string().min(1, t("required")),
    /** "" = không thuộc team. */
    teamId: z.string(),
    positionId: z.string().min(1, t("required")),
    effectiveDate: z
      .string()
      .refine((value) => DATE.test(value), t("required"))
      .refine((value) => !DATE.test(value) || value >= today, t("pastDate")),
    reason: z.string().trim().min(1, t("required")).max(500, t("tooLong")),
  });
}

export type TransferFormValues = z.infer<ReturnType<typeof transferSchema>>;

export function toTransferRequest(employeeId: string, values: TransferFormValues): CreateTransferInput {
  return {
    employeeId,
    officeId: values.officeId,
    departmentId: values.departmentId,
    teamId: values.teamId || null,
    positionId: values.positionId,
    effectiveDate: values.effectiveDate,
    reason: values.reason.trim(),
  };
}

export function cancelSchema(t: TransfersValidationTranslator) {
  return z.object({ reason: z.string().trim().min(1, t("required")).max(500, t("tooLong")) });
}

export type CancelFormValues = z.infer<ReturnType<typeof cancelSchema>>;

export const toCancelRequest = (values: CancelFormValues): CancelTransferInput => ({ reason: values.reason.trim() });
