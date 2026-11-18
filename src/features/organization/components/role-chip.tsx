"use client";

import { Building2Icon, LandmarkIcon, UsersRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { TintChip } from "@/components/shared/tint-chip";
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
  return (
    <TintChip icon={ROLE_ICONS[role]} tone="people" className={className}>
      {t(role)}
    </TintChip>
  );
}
