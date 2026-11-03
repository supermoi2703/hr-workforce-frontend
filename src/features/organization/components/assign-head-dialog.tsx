"use client";

import { useState } from "react";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { assignDepartmentHead, assignTeamLead } from "../api";
import { getOrgError } from "../error-messages";
import { useOrgAdminMutation, useOrgMembers } from "../hooks";
import type { OrgChartPerson } from "../types";

export type HeadTarget = {
  kind: "department" | "team";
  id: string;
  name: string;
  current: OrgChartPerson | null;
};

/** Giá trị "để trống" của Select (Select không nhận chuỗi rỗng làm một lựa chọn). */
const VACANT = "vacant";

/** Gán / đổi / bỏ trống trưởng phòng hoặc trưởng team (cần org:manage). Chỉ chọn trong người của chính đơn vị đó. */
export function AssignHeadDialog({ target, onClose }: { target: HeadTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && <AssignHeadForm key={`${target.kind}-${target.id}`} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AssignHeadForm({ target, onDone }: { target: HeadTarget; onDone: () => void }) {
  const t = useTranslations("Organization.Admin");
  const tOrgErrors = useTranslations("Organization.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const [selected, setSelected] = useState<string>(target.current?.id ?? VACANT);

  // Ứng viên: mọi người của đơn vị, ở mọi văn phòng (tối đa 100; đơn vị lớn hơn thì cần ô tìm, chưa cần ở quy mô này)
  const candidates = useOrgMembers(
    target.kind === "department" ? { departmentId: target.id } : { teamId: target.id },
    { page: 0, size: 100 },
  );
  const mutation = useOrgAdminMutation((employeeId: string | null) =>
    target.kind === "department" ? assignDepartmentHead(target.id, employeeId) : assignTeamLead(target.id, employeeId),
  );

  const people = candidates.data?.content ?? [];
  const items: Record<string, string> = {
    [VACANT]: t("vacantOption"),
    ...Object.fromEntries(
      people.map((person) => [person.id, `${person.fullName} (${person.employeeCode})${person.position ? ` · ${person.position.name}` : ""}`]),
    ),
  };
  const unchanged = selected === (target.current?.id ?? VACANT);

  function submit() {
    const employeeId = selected === VACANT ? null : selected;
    mutation.mutate(employeeId, {
      onSuccess: () => {
        toast.success(
          employeeId
            ? t("headAssigned", { name: people.find((person) => person.id === employeeId)?.fullName ?? "", unit: target.name })
            : t("headCleared", { unit: target.name }),
        );
        onDone();
      },
    });
  }

  const role = target.kind === "department" ? t("roleDepartmentHead") : t("roleTeamLead");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("assignTitle", { role, unit: target.name })}</DialogTitle>
        <DialogDescription>{t(target.kind === "department" ? "assignDepartmentHint" : "assignTeamHint")}</DialogDescription>
      </DialogHeader>

      {mutation.isError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{getOrgError(mutation.error, tOrgErrors, tErrors)}</AlertDescription>
        </Alert>
      )}

      <Field>
        <FieldLabel htmlFor="org-head-select">{role}</FieldLabel>
        {candidates.isPending ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <Select value={selected} onValueChange={(value) => value && setSelected(String(value))} items={items}>
            <SelectTrigger id="org-head-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(items).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <FieldDescription>{t("assignActiveOnly")}</FieldDescription>
      </Field>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button onClick={submit} disabled={unchanged || mutation.isPending || candidates.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
