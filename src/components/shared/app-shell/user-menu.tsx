"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthMode, useCurrentUser } from "@/lib/auth/auth-provider";
import { UserAvatar } from "../user-avatar";

export function UserMenu() {
  const { user } = useCurrentUser();
  const { mode } = useAuthMode();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Tài khoản" />}>
        <UserAvatar name={user.displayName} seed={user.id} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="font-medium text-foreground">{user.displayName}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* TODO(cuongvv): đổi mật khẩu, đăng xuất thật (POST /api/auth/logout). */}
        <DropdownMenuItem disabled={mode === "mock"}>
          <LogOutIcon /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
