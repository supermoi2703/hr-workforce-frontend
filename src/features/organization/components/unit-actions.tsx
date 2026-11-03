"use client";

import { useState } from "react";
import { ArchiveIcon, ChevronDownIcon, PencilIcon, PlusIcon, SettingsIcon, UserRoundCogIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { deactivateDepartment, deactivateTeam } from "../api";
import { getOrgError } from "../error-messages";
import { useOrgAdminMutation } from "../hooks";
import type { ResolvedNode } from "../rules";
import type { OrgNode } from "../types";
import { AssignHeadDialog, type HeadTarget } from "./assign-head-dialog";
import { UnitFormDialog, type UnitFormTarget } from "./unit-form-dialog";

/** Quyền tạo / sửa / ngừng dùng đơn vị và gán trưởng (ADMIN, HR, HR_COMPANY). */
export const ORG_MANAGE_PERMISSION = "org:manage";

export function useCanManageOrg() {
  return useCurrentUser().hasPermission(ORG_MANAGE_PERMISSION);
}

/** Nút "Thêm phòng ban" ở trang toàn công ty. */
export function AddDepartmentButton() {
  const t = useTranslations("Organization.Admin");
  const [target, setTarget] = useState<UnitFormTarget | null>(null);
  if (!useCanManageOrg()) return null;
  return (
    <>
      <Button size="sm" onClick={() => setTarget({ kind: "department", mode: "create" })}>
        <PlusIcon /> {t("createDepartment")}
      </Button>
      <UnitFormDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

/**
 * Menu "Quản lý" trên đầu trang một phòng ban / team: gán trưởng, thêm team, sửa, ngừng dùng. Ngừng dùng xong thì quay
 * về đơn vị cha (đơn vị đã ngừng dùng không còn trên cây).
 */
export function UnitActions({ resolved, onSelect }: { resolved: ResolvedNode; onSelect: (node: OrgNode | undefined) => void }) {
  const t = useTranslations("Organization.Admin");
  const tOrgErrors = useTranslations("Organization.Errors");
  const tErrors = useTranslations("Errors");
  const canManage = useCanManageOrg();
  const [form, setForm] = useState<UnitFormTarget | null>(null);
  const [head, setHead] = useState<HeadTarget | null>(null);
  const [confirming, setConfirming] = useState(false);
  const deactivate = useOrgAdminMutation((node: OrgNode) =>
    node.kind === "team" ? deactivateTeam(node.id) : deactivateDepartment(node.kind === "department" ? node.id : node.departmentId),
  );

  if (!canManage || resolved.kind === "noTeam") return null;
  const { department } = resolved;
  const isTeam = resolved.kind === "team";
  const unitName = isTeam ? resolved.team.name : department.name;
  const unitNode: OrgNode =
    resolved.kind === "team" ? { kind: "team", id: resolved.team.id } : { kind: "department", id: department.id };

  function confirmDeactivate() {
    return deactivate.mutateAsync(unitNode).then(
      () => {
        toast.success(t("deactivated", { name: unitName }));
        onSelect(isTeam ? { kind: "department", id: department.id } : undefined);
      },
      (error: unknown) => {
        toast.error(getOrgError(error, tOrgErrors, tErrors));
        throw error;
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          <SettingsIcon /> {t("manage")} <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() =>
              setHead(
                resolved.kind === "team"
                  ? { kind: "team", id: resolved.team.id, name: resolved.team.name, current: resolved.team.lead }
                  : { kind: "department", id: department.id, name: department.name, current: department.head },
              )
            }
          >
            <UserRoundCogIcon /> {t(isTeam ? "assignTeamLead" : "assignDepartmentHead")}
          </DropdownMenuItem>
          {!isTeam && (
            <DropdownMenuItem
              onClick={() =>
                setForm({ kind: "team", mode: "create", departmentId: department.id, departmentName: department.name })
              }
            >
              <PlusIcon /> {t("createTeam")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() =>
              setForm(
                resolved.kind === "team"
                  ? {
                      kind: "team",
                      mode: "edit",
                      id: resolved.team.id,
                      code: resolved.team.code,
                      name: resolved.team.name,
                      departmentId: department.id,
                      departmentName: department.name,
                    }
                  : {
                      kind: "department",
                      mode: "edit",
                      id: department.id,
                      code: department.code,
                      name: department.name,
                      executive: department.executive,
                    },
              )
            }
          >
            <PencilIcon /> {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <ArchiveIcon /> {t(isTeam ? "deactivateTeam" : "deactivateDepartment")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UnitFormDialog target={form} onClose={() => setForm(null)} />
      <AssignHeadDialog target={head} onClose={() => setHead(null)} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        title={t("deactivateTitle", { name: unitName })}
        description={t(isTeam ? "deactivateTeamHint" : "deactivateDepartmentHint")}
        confirmLabel={t("deactivateConfirm")}
        onConfirm={confirmDeactivate}
      />
    </>
  );
}
