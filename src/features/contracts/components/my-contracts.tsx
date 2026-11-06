"use client";

import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { formatDate } from "@/lib/format";
import { useMyContracts } from "../hooks";
import { ContractStateBadge } from "./contract-state-badge";
import { SalaryHistory } from "./salary-history";

/** Hợp đồng và lịch sử lương của chính mình, chỉ đọc. Chỉ dựng khi tài khoản có gắn hồ sơ. */
export function MyContracts() {
  const t = useTranslations("Contracts.Mine");
  const tType = useTranslations("Contracts.types");
  const query = useMyContracts(true);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <EmptyState title={t("empty")} className="border border-dashed" />;

  return (
    <div className="flex flex-col gap-6">
      {query.data.map((detail) => {
        const { contract } = detail;
        return (
          <div key={contract.id} className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{contract.contractNumber}</span>
              <ContractStateBadge state={contract.state} />
              <span className="text-muted-foreground">
                {tType(contract.type)} · {formatDate(contract.startDate)} –{" "}
                {contract.endDate ? formatDate(contract.endDate) : t("noEndDate")}
              </span>
            </p>
            <SalaryHistory detail={detail} />
          </div>
        );
      })}
    </div>
  );
}
