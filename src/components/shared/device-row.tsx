"use client";

import type { ReactNode } from "react";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/format";
import { describeUserAgent, formatDevice } from "@/lib/user-agent";

type DeviceRowProps = {
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  /** Hạn của phiên; có thì hiện thêm "Hết hạn …". */
  expiresAt?: string;
  /** Phần bên phải: badge "Thiết bị này", nút đăng xuất... */
  trailing?: ReactNode;
};

/**
 * Một thiết bị / phiên đăng nhập trong danh sách (dùng trong <ul className="divide-y ...">):
 * icon máy tính / điện thoại, "Chrome · Windows", IP, lần hoạt động cuối.
 */
export function DeviceRow({ userAgent, ipAddress, lastActiveAt, expiresAt, trailing }: DeviceRowProps) {
  const t = useTranslations("Devices");
  const Icon = describeUserAgent(userAgent).mobile ? SmartphoneIcon : MonitorIcon;
  const details = [
    ipAddress ?? t("unknownIp"),
    t("lastActive", { time: formatDateTime(lastActiveAt) }),
    expiresAt && t("expires", { time: formatDateTime(expiresAt) }),
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{formatDevice(userAgent, t("unknownDevice"))}</p>
        <p className="truncate text-xs text-muted-foreground">{details.join(" · ")}</p>
      </div>
      {trailing}
    </li>
  );
}
