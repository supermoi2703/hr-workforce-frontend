"use client";

import { useState, type ReactElement, type ReactNode } from "react";
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
  /** Phần tử mở hộp thoại, vd. `<Button variant="destructive" />`. */
  trigger: ReactElement;
  triggerLabel: ReactNode;
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
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

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
      <AlertDialogTrigger render={trigger}>{triggerLabel}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} disabled={pending} onClick={handleConfirm}>
            {pending && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
