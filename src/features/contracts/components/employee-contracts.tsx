"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate } from "@/lib/format";
import { useContracts } from "../hooks";
import { ContractFormDialog } from "./contract-form-dialog";
import { ContractStateBadge } from "./contract-state-badge";

/** Một hồ sơ hiếm khi có nhiều hợp đồng: lấy một trang lớn, không phân trang trong tab. */
const PAGE = { page: 0, size: 50, sort: ["startDate,desc"] };

type EmployeeContractsProps = {
  /** Khai bằng kiểu nguyên thủy để feature này không phụ thuộc features/employees. */
  employee: { id: string; hireDate: string; terminated: boolean };
};

/**
 * Tab "Hợp đồng" trong hồ sơ: các hợp đồng của một nhân viên (không có số tiền) và nút tạo. Đây là nơi duy nhất tạo
 * hợp đồng mới, nên luôn đúng nhân viên và biết sẵn ngày vào làm. Đã nghỉ việc thì không tạo được.
 */
export function EmployeeContracts({ employee }: EmployeeContractsProps) {
  const t = useTranslations("Contracts.EmployeeTab");
  const tType = useTranslations("Contracts.types");
  const { hasPermission } = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const query = useContracts({ employeeId: employee.id }, PAGE);
  const canCreate = hasPermission("contract:manage") && !employee.terminated;

  let content;
  if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.content.length === 0) {
    content = <EmptyState title={t("empty")} className="border border-dashed" />;
  } else {
    content = (
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {query.data.content.map((contract) => (
          <li key={contract.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={`/contracts/${contract.id}`} className="font-medium hover:underline">
                {contract.contractNumber}
              </Link>
              <ContractStateBadge state={contract.state} />
              <span className="text-muted-foreground">{tType(contract.type)}</span>
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatDate(contract.startDate)} – {contract.endDate ? formatDate(contract.endDate) : t("noEndDate")}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> {t("create")}
          </Button>
        </div>
      )}
      {content}
      {canCreate && (
        <ContractFormDialog
          mode={{ kind: "create", employeeId: employee.id, hireDate: employee.hireDate }}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </div>
  );
}
