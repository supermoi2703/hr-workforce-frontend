"use client";

import { EmployeeTransfers } from "@/features/transfers/components/employee-transfers";
import { useOrgUnits } from "@/features/employees/hooks";
import type { EmployeeDetail } from "@/features/employees/types";

/** Ghép tab Công tác với danh mục tổ chức (feature không import nhau). */
export function EmployeeTransfersTab({ employee }: { employee: EmployeeDetail }) {
  const org = useOrgUnits();

  return (
    <EmployeeTransfers
      employee={{
        id: employee.id,
        fullName: employee.fullName,
        status: employee.status,
        officeId: employee.officeId,
        departmentId: employee.departmentId,
        teamId: employee.teamId,
        positionId: employee.positionId,
      }}
      org={{
        offices: org.offices,
        departments: org.departments,
        teams: org.teams,
        positions: org.positions,
        isPending: org.isPending,
      }}
    />
  );
}
