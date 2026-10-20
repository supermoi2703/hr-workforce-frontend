"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const OTP_LENGTH = 6;

type OtpFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
};

/**
 * Ô nhập mã xác thực 6 số (6 ô riêng). Dán cả mã một lần được; điện thoại tự gợi ý mã từ email/SMS
 * nhờ autoComplete="one-time-code". Dùng với react-hook-form qua <Controller>.
 */
export function OtpField({ id, value, onChange, onBlur, invalid, disabled }: OtpFieldProps) {
  return (
    <InputOTP
      id={id}
      maxLength={OTP_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={invalid}
      containerClassName="w-full"
    >
      {/* 6 ô tách rời (mỗi ô viền + bo góc riêng) thay vì dính liền mặc định của shadcn: dễ nhìn từng chữ số hơn. */}
      <InputOTPGroup className="w-full gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            aria-invalid={invalid}
            className="h-12 min-w-0 flex-1 rounded-lg border bg-transparent text-lg font-medium tabular-nums first:rounded-lg last:rounded-lg"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
