"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon, MoonIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, formatTime, todayIsoDate } from "@/lib/format";
import { useAcceptOvertime, useCancelOvertime, useDeclineOvertime, useDuration, useOvertimeErrorMessage } from "../hooks";
import { endsNextDay, isSettled, rowActions } from "../rules";
import type { OvertimeRequest } from "../types";
import { OvertimeKindBadge, OvertimeStatusBadge } from "./overtime-badges";
import { ReasonDialog, type ReasonAction } from "./reason-dialog";

type OvertimeListProps = {
  items: OvertimeRequest[];
  /** Cột người làm: trang dự án và trang HR. */
  showEmployee?: boolean;
  /** Tên dự án: trang của nhân viên và HR (trang dự án thì thừa). */
  showProject?: boolean;
  /** Danh sách của chính người xem: "Chờ bạn xác nhận" thay "Chờ nhân viên xác nhận". */
  forMe?: boolean;
};

const toVnDate = (value: string) => todayIsoDate(new Date(value));

/** Khung giờ "18:00–21:00", thêm "kết thúc hôm sau" khi qua nửa đêm. */
export function useWindowLabel() {
  const t = useTranslations("Overtime.list");
  return useCallback(
    (item: Pick<OvertimeRequest, "startAt" | "endAt" | "workDate">) => ({
      range: t("window", { start: formatTime(item.startAt), end: formatTime(item.endAt) }),
      nextDay: endsNextDay(item, toVnDate) ? t("nextDay") : null,
    }),
    [t],
  );
}

/** Danh sách phiếu dạng thẻ (đọc được trên điện thoại). Nút hiện theo cờ can* của backend. */
export function OvertimeList({ items, showEmployee = false, showProject = true, forMe = false }: OvertimeListProps) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <OvertimeRow key={item.id} item={item} showEmployee={showEmployee} showProject={showProject} forMe={forMe} />
      ))}
    </ul>
  );
}

function OvertimeRow({ item, showEmployee, showProject, forMe }: { item: OvertimeRequest } & Required<Omit<OvertimeListProps, "items">>) {
  const t = useTranslations("Overtime.list");
  const tDay = useTranslations("Overtime.dayTypes");
  const duration = useDuration();
  const windowLabel = useWindowLabel()(item);
  const errorMessage = useOvertimeErrorMessage();
  const accept = useAcceptOvertime();
  const decline = useDeclineOvertime();
  const cancel = useCancelOvertime();
  const [dialog, setDialog] = useState<ReasonAction | null>(null);
  const actions = rowActions(item);
  const settled = isSettled(item);
  const subject = `${item.taskKey ?? ""} · ${formatDate(item.workDate)} ${windowLabel.range}`.replace(/^ · /, "");

  async function run(action: ReasonAction, reason: string) {
    try {
      if (action === "decline") await decline.mutateAsync({ id: item.id, reason });
      else await cancel.mutateAsync({ id: item.id, reason });
      toast.success(t(`done.${action}`));
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  function doAccept() {
    accept.mutate(item.id, {
      onSuccess: () => toast.success(t("done.accept")),
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium tabular-nums">{formatDate(item.workDate)}</span>
          <span className="tabular-nums">{windowLabel.range}</span>
          {windowLabel.nextDay && <span className="text-xs text-muted-foreground">({windowLabel.nextDay})</span>}
          <span className="text-muted-foreground">· {duration(item.plannedMinutes)}</span>
        </p>
        {showEmployee && <p className="text-sm font-medium">{item.employeeName}</p>}
        <p className="min-w-0 text-sm">
          {item.taskKey ? (
            <>
              <span className="font-mono text-xs text-muted-foreground">{item.taskKey}</span>{" "}
              <span className="break-words">{item.taskTitle}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t("noTask")}</span>
          )}
          {showProject && item.projectName && <span className="text-muted-foreground"> · {item.projectName}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <OvertimeKindBadge kind={item.kind} />
          <OvertimeStatusBadge status={item.status} forMe={forMe} />
          {item.dayType !== "WORKING_DAY" && tDay.has(item.dayType) && <Badge variant="outline">{tDay(item.dayType)}</Badge>}
          {item.pendingHrDecision && (
            <Badge variant="warning" title={t("pendingHrHint")}>
              {t("pendingHr")}
            </Badge>
          )}
        </div>
        {settled && (
          <p className="flex flex-wrap items-center gap-x-3 text-sm tabular-nums">
            <span>{t("paidNormal", { duration: duration(item.paidMinutesNormal ?? 0) })}</span>
            {(item.paidMinutesNight ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <MoonIcon className="size-3.5 text-muted-foreground" aria-hidden />
                {t("paidNight", { duration: duration(item.paidMinutesNight) })}
              </span>
            )}
          </p>
        )}
        {forMe && item.kind === "ASSIGNED" && (
          <p className="text-xs text-muted-foreground">{t("assignedBy", { name: item.createdByName })}</p>
        )}
        {item.reason && <p className="line-clamp-2 text-xs break-words text-muted-foreground">{t("reason", { reason: item.reason })}</p>}
      </div>

      {(actions.accept || actions.decline || actions.cancel || actions.approvalLink) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions.approvalLink && (
            <Link href={actions.approvalLink} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("viewApproval")} <ExternalLinkIcon />
            </Link>
          )}
          {actions.cancel && (
            <Button variant="outline" size="sm" onClick={() => setDialog(actions.cancel)}>
              {t(actions.cancel)}
            </Button>
          )}
          {actions.decline && (
            <Button variant="outline" size="sm" onClick={() => setDialog("decline")}>
              {t("decline")}
            </Button>
          )}
          {actions.accept && (
            <Button size="sm" onClick={doAccept} disabled={accept.isPending}>
              {accept.isPending && <Spinner />} {t("accept")}
            </Button>
          )}
        </div>
      )}

      {dialog && <ReasonDialog action={dialog} subject={subject} onConfirm={(reason) => run(dialog, reason)} onClose={() => setDialog(null)} />}
    </li>
  );
}
