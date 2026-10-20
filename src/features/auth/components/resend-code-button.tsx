"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getCodeFlowError } from "../error-messages";
import { authLinkClassName } from "./auth-form-header";

type ResendCodeButtonProps = {
  /** Gọi API gửi lại mã. Trả về false nếu không gửi (vd email trong form chưa hợp lệ). */
  onResend: () => Promise<boolean>;
  /** Từ useCooldown(): số giây còn phải chờ và hàm bắt đầu đếm. */
  cooldown: { remaining: number; start: () => void };
};

/** "0:42" */
function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Nút dạng link "Gửi lại mã", khóa trong 60 giây sau mỗi lần gửi. */
export function ResendCodeButton({ onResend, cooldown }: ResendCodeButtonProps) {
  const t = useTranslations("Auth.CodeFlow");
  const tAuthErrors = useTranslations("Auth.Errors");
  const tErrors = useTranslations("Errors");
  const [pending, setPending] = useState(false);
  const waiting = cooldown.remaining > 0;

  async function handleClick() {
    setPending(true);
    try {
      if (await onResend()) {
        toast.success(t("resent"));
        cooldown.start();
      }
    } catch (error) {
      toast.error(getCodeFlowError(error, tAuthErrors, tErrors).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={waiting || pending}
      className={cn(
        authLinkClassName,
        "inline-flex items-center gap-1.5 disabled:pointer-events-none disabled:text-muted-foreground",
      )}
    >
      {pending && <Spinner className="size-3.5" />}
      {waiting ? t("resendIn", { time: formatSeconds(cooldown.remaining) }) : t("resend")}
    </button>
  );
}
