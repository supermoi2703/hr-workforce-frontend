"use client";

import { ChevronDownIcon, DramaIcon } from "lucide-react";
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
import { ROLE_LABELS } from "@/lib/auth/mock-users";
import { ROLES, type RoleCode } from "@/lib/auth/types";

/** Đổi vai trò giả lập để kiểm tra menu/quyền. Chỉ hiện khi NEXT_PUBLIC_AUTH_MODE=mock. */
export function RoleSwitcher() {
  const { mode, setMockRole } = useAuthMode();
  const { user } = useCurrentUser();
  if (mode !== "mock" || !setMockRole || !user) return null;

  const current = user.roles[0] as RoleCode;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <DramaIcon />
        <span className="hidden sm:inline">Vai trò: </span>{ROLE_LABELS[current]}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Đăng nhập giả lập</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current} onValueChange={(value) => setMockRole(value as RoleCode)}>
            {ROLES.map((role) => (
              <DropdownMenuRadioItem key={role} value={role}>
                {ROLE_LABELS[role]} <span className="ml-auto text-xs text-muted-foreground">{role}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
