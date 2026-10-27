import type { ReactNode } from "react";
import Link from "next/link";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LoginNotice } from "../error-messages";

/** Tiêu đề + mô tả của các trang đăng nhập / quên mật khẩu / kích hoạt (cùng cỡ chữ, khoảng cách). */
export function AuthFormHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Thông báo ngay trên form: lỗi chung (đỏ) hoặc thông tin, có thể kèm một link hành động. */
export function AuthNotice({ notice }: { notice: LoginNotice | null }) {
  if (!notice) return null;
  const isError = notice.tone === "error";
  return (
    <Alert variant={isError ? "destructive" : "default"}>
      {isError ? <CircleAlertIcon /> : <InfoIcon />}
      <AlertDescription>
        {notice.message}
        {notice.action && (
          <>
            {" "}
            <Link href={notice.action.href} className="font-medium">
              {notice.action.label}
            </Link>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** Link nhỏ dạng chữ (quay lại đăng nhập, đổi email...). */
export const authLinkClassName =
  "rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";
