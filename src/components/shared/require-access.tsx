"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldXIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import type { Access } from "@/lib/auth/types";
import { LoadingState } from "./states";

export function ForbiddenState() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldXIcon />
        </EmptyMedia>
        <EmptyTitle>Bạn không có quyền xem trang này</EmptyTitle>
        <EmptyDescription>Liên hệ quản trị viên nếu bạn cần được cấp quyền.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Về trang chủ
        </Link>
      </EmptyContent>
    </Empty>
  );
}

type RequireAccessProps = {
  access?: Access;
  children: ReactNode;
  /** Hiện gì khi không đủ quyền. Mặc định: trang báo không có quyền. Truyền `null` để ẩn hẳn (dùng cho nút). */
  fallback?: ReactNode;
};

/**
 * Chỉ hiện nội dung khi người dùng thỏa `access`. Dùng bọc cả trang hoặc từng nút/khối.
 * Đây chỉ là ẩn/hiện giao diện: API backend vẫn phải tự kiểm tra quyền.
 */
export function RequireAccess({ access, children, fallback = <ForbiddenState /> }: RequireAccessProps) {
  const { status, can } = useCurrentUser();
  if (status === "loading") return fallback === null ? null : <LoadingState />;
  return can(access) ? children : fallback;
}
