"use client";

import { useCallback } from "react";
import { EmployeeHistoryTab } from "@/features/audit/components/employee-history-tab";
import { useOrgUnits } from "@/features/employees/hooks";

/** Ghép tab Lịch sử với danh mục tổ chức để hiện tên đơn vị thay cho id (feature không import nhau). */
export function EmployeeHistory({ employeeId }: { employeeId: string }) {
  const { lookup } = useOrgUnits();

  const unitName = useCallback(
    (field: string, id: string) => {
      if (field === "officeId") return lookup.office(id)?.name;
      if (field === "departmentId") return lookup.department(id)?.name;
      if (field === "teamId") return lookup.team(id)?.name;
      return lookup.position(id)?.name;
    },
    [lookup],
  );

  return <EmployeeHistoryTab employeeId={employeeId} unitName={unitName} />;
}
