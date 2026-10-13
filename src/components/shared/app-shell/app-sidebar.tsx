"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRoundIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { DOMAIN_TONE_TEXT } from "../icon-tile";
import { findNavMatch, getNavGroups } from "./navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const { can } = useCurrentUser();
  const activeHref = findNavMatch(pathname)?.item.href;

  const groups = getNavGroups()
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.access)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="HRM Workforce">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <UsersRoundIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">HRM Workforce</span>
                <span className="truncate text-xs text-muted-foreground">Quản lý và điều phối nhân lực</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        {/* Icon mang màu nhóm chức năng; mục đang mở dùng màu thương hiệu. */}
                        <item.icon className={isActive ? undefined : DOMAIN_TONE_TEXT[item.tone ?? group.tone]} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="text-[0.7rem] font-normal text-muted-foreground">{item.badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
