"use client";

import Link from "next/link";
import { LogOutIcon, UserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useAuthActions, useAuthMode, useCurrentUser } from "@/lib/auth/auth-provider";
import { UserAvatar } from "../user-avatar";

export function UserMenu() {
  const t = useTranslations("Shell");
  const { user } = useCurrentUser();
  const { mode } = useAuthMode();
  const { signOut } = useAuthActions();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={t("account")} />}>
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
        <DropdownMenuItem render={<Link href="/account" />}>
          <UserRoundIcon /> {t("account")}
        </DropdownMenuItem>
        {/* Chế độ mock không có phiên để đăng xuất. */}
        <DropdownMenuItem disabled={mode === "mock"} onClick={() => void signOut()}>
          <LogOutIcon /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
