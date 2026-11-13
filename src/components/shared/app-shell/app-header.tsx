"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageToggle } from "../language-toggle";
import { findNavMatch } from "./navigation";
import { RoleSwitcher } from "./role-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

function AppBreadcrumbs() {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const pathname = usePathname();
  const match = findNavMatch(pathname);
  const crumbs: { label: string; href?: string }[] = [];
  if (match && match.item.href !== "/") {
    crumbs.push({ label: t(`groups.${match.group.id}`) });
    crumbs.push({
      label: t(`items.${match.item.id}`),
      href: match.item.href !== pathname ? match.item.href : undefined,
    });
  } else if (pathname === "/") {
    crumbs.push({ label: t("items.home") });
  } else if (pathname === "/account") {
    // Trang tài khoản mở từ menu avatar, không nằm trong menu bên trái.
    crumbs.push({ label: tShell("account") });
  } else if (pathname === "/profile") {
    crumbs.push({ label: tShell("myProfile") });
  } else if (pathname === "/notifications") {
    // Mở từ chuông trên header.
    crumbs.push({ label: tShell("notifications") });
  }

  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              ) : index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <span>{crumb.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** `actions`: nút thêm trước menu tài khoản (vd chuông thông báo). */
export function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-1">
        <RoleSwitcher />
        <LanguageToggle />
        <ThemeToggle />
        {actions}
        <UserMenu />
      </div>
    </header>
  );
}
