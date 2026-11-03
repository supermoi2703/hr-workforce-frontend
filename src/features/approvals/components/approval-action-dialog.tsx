"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getApprovalError, isStaleApprovalError } from "../error-messages";
import { useDecideApproval, useWithdrawApproval } from "../hooks";
import { commentSchema, MAX_COMMENT_LENGTH, type CommentFormValues } from "../schemas";

export type ApprovalAction = "approve" | "reject" | "withdraw";

const FORM_ID = "approval-action-form";

type ApprovalActionDialogProps = {
  approvalId: string;
  title: string;
  /** null = đóng. */
  action: ApprovalAction | null;
  onClose: () => void;
};

/**
 * Hộp thoại cho 3 thao tác: duyệt (ghi chú không bắt buộc), từ chối (lý do bắt buộc), rút (lý do không bắt buộc).
 * Lỗi "dữ liệu đã cũ" (người khác vừa duyệt, đơn đã kết thúc): báo bằng toast rồi đóng, trang tự tải lại.
 */
export function ApprovalActionDialog({ approvalId, title, action, onClose }: ApprovalActionDialogProps) {
  const t = useTranslations("Approvals.Action");
  const tValidation = useTranslations("Approvals.Validation");
  const tApprovalErrors = useTranslations("Approvals.errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const decide = useDecideApproval();
  const withdraw = useWithdrawApproval();
  const mutation = action === "withdraw" ? withdraw : decide;

  const required = action === "reject";
  const schema = useMemo(() => commentSchema(tValidation, required), [tValidation, required]);
  const form = useForm<CommentFormValues>({ resolver: zodResolver(schema), defaultValues: { comment: "" } });

  function close() {
    form.reset();
    decide.reset();
    withdraw.reset();
    onClose();
  }

  async function submit({ comment }: CommentFormValues) {
    if (!action) return;
    try {
      if (action === "withdraw") await withdraw.mutateAsync({ id: approvalId, reason: comment });
      else await decide.mutateAsync({ id: approvalId, approved: action === "approve", comment });
      toast.success(t(`${action}.success`));
      close();
    } catch (error) {
      if (isStaleApprovalError(error)) {
        toast.error(getApprovalError(error, tApprovalErrors, tErrors));
        close();
      }
      // Lỗi khác: giữ hộp thoại mở, hiện Alert bên dưới để thử lại.
    }
  }

  const { errors } = form.formState;
  const formError =
    mutation.isError && !isStaleApprovalError(mutation.error)
      ? getApprovalError(mutation.error, tApprovalErrors, tErrors)
      : null;

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && !mutation.isPending && close()}>
      <DialogContent className="sm:max-w-md">
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>{t(`${action}.title`)}</DialogTitle>
              <DialogDescription>{t(`${action}.description`, { title })}</DialogDescription>
            </DialogHeader>

            {formError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
              <Field data-invalid={!!errors.comment}>
                <FieldLabel htmlFor="approval-comment">{t(`${action}.label`)}</FieldLabel>
                <Textarea
                  id="approval-comment"
                  rows={3}
                  maxLength={MAX_COMMENT_LENGTH}
                  aria-invalid={!!errors.comment}
                  aria-required={required}
                  {...form.register("comment")}
                />
                {!required && <FieldDescription>{t("optional")}</FieldDescription>}
                <FieldError errors={[errors.comment]} />
              </Field>
            </form>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />} disabled={mutation.isPending}>
                {tCommon("cancel")}
              </DialogClose>
              <Button
                type="submit"
                form={FORM_ID}
                variant={action === "approve" ? "default" : "destructive"}
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Spinner />}
                {t(`${action}.submit`)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
