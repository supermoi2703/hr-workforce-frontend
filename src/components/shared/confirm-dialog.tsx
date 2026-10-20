"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

type ConfirmDialogProps = {
  /**
   * Phần tử mở hộp thoại, vd. `<Button variant="destructive" />`. Bỏ trống khi mở từ nơi khác
   * (vd. một mục trong DropdownMenu) bằng `open` / `onOpenChange`.
   */
  trigger?: ReactElement;
  triggerLabel?: ReactNode;
  /** Điều khiển từ ngoài (không có thì hộp thoại tự giữ trạng thái đóng / mở). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * Thao tác khi xác nhận. Nếu trả về Promise (vd. `mutation.mutateAsync(...)`), hộp thoại hiện
   * trạng thái đang xử lý, đóng khi xong và giữ nguyên khi lỗi (lỗi do nơi gọi tự báo, vd. toast).
   */
  onConfirm: () => void | Promise<unknown>;
};

/** Hộp xác nhận trước thao tác khó hoàn tác (xóa, khóa tài khoản, chốt công...). */
export function ConfirmDialog({
  trigger,
  triggerLabel,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("Common");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // Giữ hộp thoại mở để người dùng thử lại hoặc hủy.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      {trigger && <AlertDialogTrigger render={trigger}>{triggerLabel}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel ?? t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} disabled={pending} onClick={handleConfirm}>
            {pending && <Spinner />}
            {confirmLabel ?? t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
