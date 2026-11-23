"use client";

import { useState } from "react";
import { ClockPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { canAssignOvertime, type AssignEligibility } from "../rules";
import { OvertimeFormDialog, type AssignTarget } from "./overtime-form-dialog";

/**
 * Nút "Giao làm thêm giờ" trong chi tiết task. Chỉ hiện cho PM của dự án, khi task đã có người làm (khác PM) và chưa xong.
 * Trang dự án truyền dữ liệu task vào (feature không import nhau).
 */
export function AssignOvertimeButton({
  target,
  eligibility,
}: {
  target: Omit<AssignTarget, "employeeId" | "employeeName"> & { assignee: { id: string; fullName: string } | null };
  eligibility: Omit<AssignEligibility, "myEmployeeId" | "assigneeId">;
}) {
  const t = useTranslations("Overtime");
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const { assignee } = target;
  if (!canAssignOvertime({ ...eligibility, assigneeId: assignee?.id ?? null, myEmployeeId: user?.employeeId }) || !assignee) return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ClockPlusIcon /> {t("assignAction")}
      </Button>
      {open && (
        <OvertimeFormDialog
          mode="assign"
          target={{
            employeeId: assignee.id,
            employeeName: assignee.fullName,
            taskId: target.taskId,
            taskKey: target.taskKey,
            taskTitle: target.taskTitle,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
