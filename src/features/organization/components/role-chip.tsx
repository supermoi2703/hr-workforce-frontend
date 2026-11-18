"use client";

import { Building2Icon, LandmarkIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { LeaderRole } from "../rules";

const ROLE_ICONS = {
  director: LandmarkIcon,
  departmentHead: Building2Icon,
  teamLead: UsersRoundIcon,
} as const;

/**
 * Chip vai trò trưởng (giám đốc, trưởng phòng, trưởng team): nền tím nhạt của nhóm Tổ chức, chữ màu thường, icon tím.
 * Không dùng badge màu xanh để danh sách giữ một tông với sơ đồ.
 */
export function RoleChip({ role, className }: { role: LeaderRole; className?: string }) {
  const t = useTranslations("Organization.Members");
  const Icon = ROLE_ICONS[role];
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full bg-chart-5/10 px-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <Icon className="size-3 text-chart-5" aria-hidden />
      {t(role)}
    </span>
  );
}
