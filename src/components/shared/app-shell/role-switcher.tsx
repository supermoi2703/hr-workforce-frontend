"use client";

import { ChevronDownIcon, DramaIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthMode, useCurrentUser } from "@/lib/auth/auth-provider";
import { ROLES, type RoleCode } from "@/lib/auth/types";

/** Đổi vai trò giả lập để kiểm tra menu/quyền. Chỉ hiện khi NEXT_PUBLIC_AUTH_MODE=mock. */
export function RoleSwitcher() {
  const t = useTranslations("Shell");
  const tRole = useTranslations("Roles");
  const { mode, setMockRole } = useAuthMode();
  const { user } = useCurrentUser();
  if (mode !== "mock" || !setMockRole || !user) return null;

  const current = user.roles[0] as RoleCode;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <DramaIcon />
        <span className="hidden sm:inline">{t("roleLabel")} </span>
        {tRole(current)}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("demoSignIn")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current} onValueChange={(value) => setMockRole(value as RoleCode)}>
            {ROLES.map((role) => (
              <DropdownMenuRadioItem key={role} value={role}>
                {tRole(role)} <span className="ml-auto text-xs text-muted-foreground">{role}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
