"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, FileQuestionIcon, HistoryIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate, formatNumber, todayIsoDate } from "@/lib/format";
import { getPolicyError } from "../error-messages";
import {
  MANAGE_PERMISSION,
  useDeletePolicyValue,
  useFormatPolicyValue,
  useOfficeName,
  usePolicy,
  usePolicyLabels,
} from "../hooks";
import { COMPANY_SCOPE } from "../schemas";
import type { PolicyDetail, ValueStatus } from "../types";
import { effectiveValueType, formatRange, groupValues, type StatusedValue } from "../values";
import { AddValueDialog } from "./add-value-dialog";

const LIST_PATH = "/admin/policies";
const STATUS_VARIANT: Record<ValueStatus, "info" | "success" | "secondary"> = {
  upcoming: "info",
  current: "success",
  superseded: "secondary",
};

/** Một khóa chính sách: định nghĩa, giá trị toàn công ty và từng văn phòng theo ngày hiệu lực. */
export function PolicyDetailPage({ policyKey }: { policyKey: string }) {
  const t = useTranslations("Policies.Detail");
  const query = usePolicy(policyKey);

  const backLink = (
    <Link href={LIST_PATH} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
      <ArrowLeftIcon /> {t("back")}
    </Link>
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return (
      <>
        {backLink}
        {notFound ? (
          <EmptyState
            icon={<FileQuestionIcon />}
            title={t("notFound")}
            description={t("notFoundDescription")}
            className="border border-dashed"
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {backLink}
      <PolicyDetailContent policy={query.data} />
    </>
  );
}

function PolicyDetailContent({ policy }: { policy: PolicyDetail }) {
  const t = useTranslations("Policies.Detail");
  const tScope = useTranslations("Policies.scope");
  const tPolicyErrors = useTranslations("Policies.errors");
  const tErrors = useTranslations("Errors");
  const labels = usePolicyLabels();
  const officeName = useOfficeName();
  const { hasPermission } = useCurrentUser();
  const canManage = hasPermission(MANAGE_PERMISSION);
  const canReadAudit = hasPermission("audit:read");
  const remove = useDeletePolicyValue(policy.key);

  const [today] = useState(todayIsoDate);
  const [addScope, setAddScope] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StatusedValue | null>(null);

  const valueType = effectiveValueType(policy.valueType, policy.values.map((v) => v.value));
  const groups = useMemo(() => groupValues(policy.values, today), [policy.values, today]);
  const range = formatRange(policy.minValue, policy.maxValue, formatNumber);
  const name = labels.name(policy.key);
  const auditHref = `/admin/audit-logs?${new URLSearchParams({ targetType: "POLICY", targetId: policy.key, targetLabel: name })}`;

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(t("deleted"));
    } catch (error) {
      toast.error(getPolicyError(error, tPolicyErrors, tErrors));
      throw error;
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">{name}</h1>
          <p className="text-sm text-muted-foreground">{labels.description(policy.key, policy.description)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canReadAudit && (
            <Link href={auditHref} className={buttonVariants({ variant: "outline" })}>
              <HistoryIcon /> {t("auditLog")}
            </Link>
          )}
          {canManage && (
            <Button onClick={() => setAddScope(COMPANY_SCOPE)}>
              <PlusIcon /> {t("addValue")}
            </Button>
          )}
        </div>
      </div>

      <DetailList className="max-w-3xl">
        <DetailRow label={t("key")}>
          <code className="font-mono text-xs break-all">{policy.key}</code>
        </DetailRow>
        <DetailRow label={t("module")}>{labels.module(policy.ownerModule)}</DetailRow>
        <DetailRow label={t("type")}>{labels.type(valueType)}</DetailRow>
        {range && (
          <DetailRow label={t("range")}>
            <span className="tabular-nums">{range}</span>
          </DetailRow>
        )}
        <DetailRow label={t("officeOverridable")}>
          {policy.officeOverridable ? t("officeOverridableYes") : t("officeOverridableNo")}
        </DetailRow>
      </DetailList>

      <p className="max-w-3xl text-sm text-muted-foreground">{t("howItWorks")}</p>

      <ValueSection
        title={tScope("company")}
        values={groups.company}
        valueType={valueType}
        canManage={canManage}
        onDelete={setDeleting}
      />

      {groups.offices.map((group) => (
        <ValueSection
          key={group.officeId}
          title={officeName(group.officeId!)}
          values={group.values}
          valueType={valueType}
          canManage={canManage}
          onAdd={() => setAddScope(group.officeId)}
          onDelete={setDeleting}
        />
      ))}

      {policy.officeOverridable && groups.offices.length === 0 && (
        <p className="max-w-3xl text-sm text-muted-foreground">{t("noOfficeValues")}</p>
      )}

      <AddValueDialog policy={policy} valueType={valueType} scope={addScope} onClose={() => setAddScope(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        description={
          deleting
            ? t("deleteDescription", { date: formatDate(deleting.validFrom) })
            : undefined
        }
        confirmLabel={t("delete")}
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}

type ValueSectionProps = {
  title: string;
  values: StatusedValue[];
  valueType: string;
  canManage: boolean;
  /** Có thì hiện nút thêm giá trị cho đúng phạm vi này (mục văn phòng). */
  onAdd?: () => void;
  onDelete: (value: StatusedValue) => void;
};

/** Lịch sử giá trị của một phạm vi, mới nhất trước. Chỉ giá trị chưa tới ngày mới xóa được. */
function ValueSection({ title, values, valueType, canManage, onAdd, onDelete }: ValueSectionProps) {
  const t = useTranslations("Policies.Detail");
  const tStatus = useTranslations("Policies.status");
  const formatValue = useFormatPolicyValue();

  return (
    <section className="flex max-w-3xl flex-col gap-2" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {canManage && onAdd && (
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <PlusIcon /> {t("addForOffice")}
          </Button>
        )}
      </div>
      <ol className="flex flex-col divide-y rounded-xl border bg-card text-sm">
        {values.map((value) => (
          <li key={value.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <span className="min-w-24 font-medium tabular-nums break-all">{formatValue(valueType, value.value)}</span>
            <span className="text-muted-foreground">
              {t("from")}{" "}
              <time dateTime={value.validFrom} className="tabular-nums">
                {formatDate(value.validFrom)}
              </time>
            </span>
            <Badge variant={STATUS_VARIANT[value.status]}>{tStatus(value.status)}</Badge>
            {canManage && value.status === "upcoming" && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                onClick={() => onDelete(value)}
                aria-label={t("deleteValue", { date: formatDate(value.validFrom) })}
              >
                <Trash2Icon />
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
