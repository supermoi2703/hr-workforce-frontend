"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { RequireAccess } from "@/components/shared/require-access";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { useRoleLabel, useRoles } from "../../hooks";
import { ADMIN_ROLE, sortRoles } from "../../role-rules";
import { CreateRoleDialog } from "./create-role-dialog";
import { RoleTypeBadge } from "./role-type-badge";

/** Danh sách vai trò (ngắn, không phân trang): role hệ thống trước, role tự tạo sau. */
export function RoleListPage() {
  const t = useTranslations("RoleAdmin");
  const roles = useRoles();
  const roleLabel = useRoleLabel();

  return (
    <>
      <PageHeader
        title={t("List.title")}
        description={t("List.description")}
        actions={
          <RequireAccess access={{ permissions: ["role:manage"] }} fallback={null}>
            <CreateRoleDialog />
          </RequireAccess>
        }
      />

      {roles.isPending ? (
        <LoadingState />
      ) : roles.isError ? (
        <ErrorState error={roles.error} onRetry={() => roles.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Columns.role")}</TableHead>
                <TableHead>{t("Columns.code")}</TableHead>
                <TableHead>{t("Columns.type")}</TableHead>
                <TableHead className="text-right">{t("Columns.permissions")}</TableHead>
                <TableHead className="text-right">{t("Columns.people")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortRoles(roles.data).map((role) => (
                <TableRow key={role.code}>
                  <TableCell className="max-w-80">
                    <Link
                      href={`/admin/roles/${encodeURIComponent(role.code)}`}
                      className="font-medium hover:underline"
                    >
                      {roleLabel(role.code)}
                    </Link>
                    {role.description && (
                      <span className="block truncate text-xs text-muted-foreground">{role.description}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs">{role.code}</code>
                  </TableCell>
                  <TableCell>
                    <RoleTypeBadge role={role} />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* ADMIN luôn có mọi quyền (kể cả quyền module sau này thêm). */}
                    {role.code === ADMIN_ROLE ? t("List.allPermissions") : role.permissionCodes.length}
                  </TableCell>
                  <TableCell className="text-right">{role.userCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
