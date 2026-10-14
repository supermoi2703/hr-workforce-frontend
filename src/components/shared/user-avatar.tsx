"use client";

import type { CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarHue, getInitials } from "@/lib/people";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  /** id hoặc mã nhân viên: quyết định màu, để một người luôn cùng màu ở mọi màn hình. */
  seed: string;
  imageUrl?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
};

/**
 * Avatar người dùng/nhân viên. Chưa có ảnh thì hiện chữ cái đầu trên nền màu riêng của người đó.
 * Dùng cho mọi danh sách có người: duyệt, thành viên dự án, phân bổ, người nghỉ hôm nay...
 */
export function UserAvatar({ name, seed, imageUrl, size = "default", className }: UserAvatarProps) {
  const style = { "--avatar-hue": getAvatarHue(seed) } as CSSProperties;

  return (
    <Avatar size={size} className={className} style={style}>
      {imageUrl && <AvatarImage src={imageUrl} alt="" />}
      <AvatarFallback
        aria-label={name}
        className={cn(
          "font-medium",
          "bg-[oklch(0.92_0.05_var(--avatar-hue))] text-[oklch(0.4_0.13_var(--avatar-hue))]",
          "dark:bg-[oklch(0.33_0.08_var(--avatar-hue))] dark:text-[oklch(0.88_0.08_var(--avatar-hue))]",
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
