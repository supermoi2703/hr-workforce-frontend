"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useFormatPolicyValue, usePolicies, usePolicyLabels } from "../hooks";
import { effectiveValueType, groupByModule } from "../values";

/** Mọi khóa chính sách theo module, kèm giá trị toàn công ty đang áp dụng hôm nay. */
export function PolicyListPage() {
  const t = useTranslations("Policies");
  const policies = usePolicies();
  const labels = usePolicyLabels();
  const formatValue = useFormatPolicyValue();
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const matches = (policies.data ?? []).filter(
      (policy) =>
        !term ||
        [policy.key, labels.name(policy.key), labels.description(policy.key, policy.description)].some((text) =>
          text.toLocaleLowerCase().includes(term),
        ),
    );
    return groupByModule(matches);
  }, [policies.data, labels, search]);

  return (
    <>
      <PageHeader title={t("List.title")} description={t("List.description")} />

      {policies.isPending ? (
        <LoadingState />
      ) : policies.isError ? (
        <ErrorState error={policies.error} onRetry={() => policies.refetch()} />
      ) : (
        <>
          <div className="relative sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("List.search")}
              aria-label={t("List.search")}
              className="bg-card pl-8"
            />
          </div>

          {groups.length === 0 ? (
            <EmptyState title={t("List.empty")} className="border border-dashed" />
          ) : (
            groups.map((group) => (
              <section key={group.module} className="flex flex-col gap-2" aria-labelledby={`policy-module-${group.module}`}>
                <h2 id={`policy-module-${group.module}`} className="font-heading text-base font-semibold">
                  {labels.module(group.module)}
                </h2>
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Columns.policy")}</TableHead>
                        <TableHead className="w-40">{t("Columns.current")}</TableHead>
                        <TableHead className="w-44">{t("Columns.offices")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.policies.map((policy) => (
                        <TableRow key={policy.key}>
                          <TableCell className="max-w-xl min-w-64 whitespace-normal">
                            <Link
                              href={`/admin/policies/${encodeURIComponent(policy.key)}`}
                              className="font-medium hover:underline"
                            >
                              {labels.name(policy.key)}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {labels.description(policy.key, policy.description)}
                            </p>
                          </TableCell>
                          <TableCell className="font-medium tabular-nums">
                            {formatValue(effectiveValueType(policy.valueType, [policy.currentValue]), policy.currentValue)}
                          </TableCell>
                          <TableCell>
                            {policy.officeOverrideCount > 0 ? (
                              <Badge variant="info">{t("List.officeCount", { count: policy.officeOverrideCount })}</Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {policy.officeOverridable ? t("List.noOfficeValues") : t("List.companyOnly")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))
          )}
        </>
      )}
    </>
  );
}
