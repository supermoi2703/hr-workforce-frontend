"use client";

import { EmployeeContracts } from "@/features/contracts/components/employee-contracts";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";
import { EmployeeHistory } from "./employee-history";
import { EmployeeTransfersTab } from "./employee-transfers";

/**
 * Ghép hồ sơ với tab hợp đồng, công tác (điều chuyển) và lịch sử. Feature không import nhau, và page.tsx là Server Component nên không truyền được hàm
 * render: việc ghép nằm ở client component của route.
 */
export function EmployeePage({ id }: { id: string }) {
  return (
    <EmployeeDetailPage
      id={id}
      renderContracts={(employee) => (
        <EmployeeContracts
          employee={{ id: employee.id, hireDate: employee.hireDate, terminated: employee.status === "TERMINATED" }}
        />
      )}
      renderTransfers={(employee) => <EmployeeTransfersTab employee={employee} />}
      renderHistory={(employee) => <EmployeeHistory employeeId={employee.id} />}
    />
  );
}
