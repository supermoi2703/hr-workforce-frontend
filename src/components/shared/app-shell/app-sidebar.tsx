"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, UsersRoundIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { findNavMatch, getNavGroups, type NavItem } from "./navigation";

// Trạng thái đóng/mở của các nhóm thu gọn được, theo tên nhóm. Lưu ở trình duyệt để giữ khi tải lại trang.
const OPEN_GROUPS_KEY = "hrm.sidebar.openGroups";

function readOpenGroups(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(OPEN_GROUPS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeOpenGroups(value: Record<string, boolean>) {
  try {
    window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn storage: vẫn đóng/mở được trong phiên hiện tại.
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const { can } = useCurrentUser();
  const { state, isMobile } = useSidebar();
  const contentRef = useRef<HTMLDivElement>(null);

  const activeMatch = findNavMatch(pathname);
  const activeHref = activeMatch?.item.href;
  const activeGroup = activeMatch?.group.label;

  // Sidebar chỉ render ở trình duyệt (sau khi xác định đăng nhập) nên đọc localStorage ngay được.
  const [openGroups, setOpenGroups] = useState(() => {
    const stored = readOpenGroups();
    return activeGroup ? { ...stored, [activeGroup]: true } : stored;
  });

  // Chuyển sang trang thuộc một nhóm đang đóng thì tự mở nhóm đó.
  const [prevActiveGroup, setPrevActiveGroup] = useState(activeGroup);
  if (activeGroup !== prevActiveGroup) {
    setPrevActiveGroup(activeGroup);
    if (activeGroup && !openGroups[activeGroup]) setOpenGroups({ ...openGroups, [activeGroup]: true });
  }

  function setGroupOpen(label: string, open: boolean) {
    const next = { ...openGroups, [label]: open };
    setOpenGroups(next);
    writeOpenGroups(next);
  }

  // Mở thẳng một trang ở cuối menu: cuộn mục đang chọn vào giữa (tránh vùng mờ ở mép).
  useEffect(() => {
    contentRef.current
      ?.querySelector('[data-slot="sidebar-menu-button"][data-active]')
      ?.scrollIntoView({ block: "center" });
  }, [activeHref]);

  // Chế độ chỉ có icon không hiện tên nhóm, nên mọi nhóm luôn mở để không mất mục nào.
  const iconOnly = state === "collapsed" && !isMobile;

  const groups = getNavGroups()
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.access)) }))
    .filter((group) => group.items.length > 0);

  function renderItems(items: NavItem[]) {
    return (
      <SidebarMenu>
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.title}>
                {/* Icon xám; mục đang mở và lúc rê chuột thì theo màu chữ của mục. */}
                <item.icon
                  className={isActive ? undefined : "text-muted-foreground transition-colors group-hover/menu-button:text-sidebar-accent-foreground"}
                />
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.badge && (
                <SidebarMenuBadge className="text-[0.7rem] font-normal text-muted-foreground">{item.badge}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

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
      {/* scroll-fade-y: mép trên/dưới mờ dần khi còn mục bị che, tự hết khi cuộn tới đầu/cuối. */}
      <SidebarContent ref={contentRef} className="scroll-fade-y group-data-[collapsible=icon]:overflow-y-auto">
        {groups.map((group) => {
          if (!group.collapsible) {
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>{renderItems(group.items)}</SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const open = iconOnly || (openGroups[group.label] ?? false);
          return (
            <Collapsible key={group.label} open={open} onOpenChange={(next) => setGroupOpen(group.label, next)}>
              <SidebarGroup>
                <SidebarGroupLabel
                  render={<CollapsibleTrigger />}
                  className="w-full cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {group.label}
                  <ChevronRightIcon className={cn("ml-auto transition-transform", open && "rotate-90")} aria-hidden />
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>{renderItems(group.items)}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
