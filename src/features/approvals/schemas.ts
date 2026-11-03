import type { Messages } from "next-intl";
import { z } from "zod";

type ValidationKey = keyof Messages["Approvals"]["Validation"];
/** Hàm dịch của namespace "Approvals.Validation". */
export type ApprovalsValidationTranslator = (key: ValidationKey) => string;

/** Khớp ApproveRequest / RejectRequest / WithdrawRequest của backend: tối đa 1000 ký tự. */
export const MAX_COMMENT_LENGTH = 1000;

/**
 * Ghi chú khi duyệt / rút (không bắt buộc) hoặc lý do khi từ chối (`required`: backend @NotBlank).
 * Khoảng trắng đầu cuối bị bỏ trước khi kiểm tra.
 */
export function commentSchema(t: ApprovalsValidationTranslator, required: boolean) {
  const base = z.string().trim().max(MAX_COMMENT_LENGTH, t("commentTooLong"));
  return z.object({ comment: required ? base.min(1, t("reasonRequired")) : base });
}

export type CommentFormValues = z.infer<ReturnType<typeof commentSchema>>;
