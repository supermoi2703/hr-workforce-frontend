"use client";

import { useState } from "react";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate, formatTime, todayIsoDate } from "@/lib/format";
import {
  useAssignOvertime,
  useClaimDraft,
  useClaimOvertime,
  useDuration,
  useOvertimeErrorMessage,
  useOvertimeUsage,
} from "../hooks";
import { canSubmitClaim, checkWindow, type WindowIssue } from "../rules";
import type { ClaimDraft, OvertimeUsage } from "../types";

/** PM giao: người làm và task cố định (người đang được giao task). */
export type AssignTarget = { employeeId: string; employeeName: string; taskId: string; taskKey: string; taskTitle: string };

type OvertimeFormDialogProps =
  | { mode: "assign"; target: AssignTarget; onClose: () => void }
  | { mode: "claim"; initialDate?: string; onClose: () => void };

/**
 * Hộp giao làm thêm giờ (PM) hoặc khai báo làm thêm (nhân viên): ngày, giờ bắt đầu / kết thúc (kết thúc không sau bắt
 * đầu là sang hôm sau), lý do. Hiện mức đã dùng / trần và kiểm trước khi gửi; backend vẫn kiểm lại, lỗi hiện ngay trong hộp.
 */
export function OvertimeFormDialog(props: OvertimeFormDialogProps) {
  const { mode, onClose } = props;
  const t = useTranslations("Overtime.form");
  const errorMessage = useOvertimeErrorMessage();
  const duration = useDuration();
  const { user } = useCurrentUser();
  const today = todayIsoDate();

  const [workDate, setWorkDate] = useState(mode === "claim" ? (props.initialDate ?? today) : today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [taskId, setTaskId] = useState(mode === "assign" ? props.target.taskId : "");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const draft = useClaimDraft(mode === "claim" ? workDate : "");
  const employeeId = mode === "assign" ? props.target.employeeId : user?.employeeId;
  const usage = useOvertimeUsage(employeeId, workDate);
  const assign = useAssignOvertime();
  const claim = useClaimOvertime();
  const pending = assign.isPending || claim.isPending;

  // Bản gợi ý của ngày mới về: điền sẵn khung giờ từ lần chấm và chọn task nếu chỉ có một.
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (mode === "claim" && draft.data && draft.data.workDate !== prefilledFor) {
    setPrefilledFor(draft.data.workDate);
    if (draft.data.suggestedStart) setStartTime(draft.data.suggestedStart.slice(0, 5));
    if (draft.data.suggestedEnd) setEndTime(draft.data.suggestedEnd.slice(0, 5));
    if (!draft.data.tasks.some((task) => task.taskId === taskId)) {
      setTaskId(draft.data.tasks.length === 1 ? draft.data.tasks[0].taskId : "");
    }
  }

  const check = checkWindow({ workDate, startTime, endTime }, usage.data, {
    mode,
    today,
    nowTime: formatTime(new Date()),
  });
  const shownErrors = touched ? check.errors : check.errors.filter((issue) => issue !== "required");
  const submittable =
    mode === "claim"
      ? canSubmitClaim({ draft: draft.data, taskId, check, pending })
      : !pending && (!touched || check.errors.length === 0);

  async function submit() {
    setTouched(true);
    setServerError(null);
    if (check.errors.length > 0) return;
    const body = { workDate, startTime, endTime, reason: reason.trim() || null };
    try {
      if (mode === "assign") {
        await assign.mutateAsync({ ...body, employeeId: props.target.employeeId, taskId: props.target.taskId });
        toast.success(t("assigned"));
      } else {
        await claim.mutateAsync({ ...body, taskId });
        toast.success(t("claimed"));
      }
      onClose();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  }

  const issueText = (issue: WindowIssue) =>
    t(`issues.${issue}`, {
      time: usage.data?.scheduledEnd?.slice(0, 5) ?? "",
      duration: duration(usage.data?.maxDayMinutes ?? 0),
      monthCap: duration(usage.data?.monthCapMinutes ?? 0),
      yearCap: duration(usage.data?.yearCapMinutes ?? 0),
    });

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "assign" ? t("assignTitle") : t("claimTitle")}</DialogTitle>
          <DialogDescription>{mode === "assign" ? t("assignDescription") : t("claimDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "assign" && (
            <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{t("employee")}</dt>
              <dd className="font-medium">{props.target.employeeName}</dd>
              <dt className="text-muted-foreground">{t("task")}</dt>
              <dd className="min-w-0 break-words">
                <span className="font-mono text-xs text-muted-foreground">{props.target.taskKey}</span> {props.target.taskTitle}
              </dd>
            </dl>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ot-date">{t("date")}</Label>
              <Input
                id="ot-date"
                type="date"
                value={workDate}
                max={mode === "claim" ? today : undefined}
                min={mode === "assign" ? today : undefined}
                onChange={(e) => {
                  setWorkDate(e.target.value);
                  setServerError(null);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ot-start">{t("start")}</Label>
              <Input id="ot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ot-end">{t("end")}</Label>
              <Input id="ot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {check.window && (
            <p className="text-sm tabular-nums">
              {t("total", { duration: duration(check.window.minutes) })}
              {check.window.nextDay && <span className="text-muted-foreground"> · {t("nextDay")}</span>}
            </p>
          )}

          {mode === "claim" && <ClaimSection draft={draft} taskId={taskId} onTaskChange={setTaskId} />}

          <UsageHint usage={usage} hasEmployee={!!employeeId} remaining={check.remainingMinutes} />

          {(shownErrors.length > 0 || check.warnings.length > 0) && (
            <ul className="space-y-1 text-sm">
              {shownErrors.map((issue) => (
                <li key={issue} className="text-destructive">
                  {issueText(issue)}
                </li>
              ))}
              {check.warnings.map((issue) => (
                <li key={issue} className="text-warning">
                  {t("capWarning", { text: issueText(issue) })}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1">
            <Label htmlFor="ot-reason">{t("reason")}</Label>
            <Textarea
              id="ot-reason"
              rows={2}
              maxLength={500}
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {serverError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={!submittable}>
            {pending && <Spinner />} {mode === "assign" ? t("submitAssign") : t("submitClaim")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClaimSection({
  draft,
  taskId,
  onTaskChange,
}: {
  draft: { data?: ClaimDraft; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown; fetchStatus: string };
  taskId: string;
  onTaskChange: (taskId: string) => void;
}) {
  const t = useTranslations("Overtime.form");
  const errorMessage = useOvertimeErrorMessage();

  if (draft.isPending && draft.fetchStatus !== "idle") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> {t("draftLoading")}
      </p>
    );
  }
  if (draft.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription className="flex flex-wrap items-center gap-2">
          {errorMessage(draft.error)}
          <Button variant="outline" size="sm" onClick={() => draft.refetch()}>
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const data = draft.data;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {data.withinWindow ? (
        <p className="text-sm text-muted-foreground">{t("deadline", { date: formatDate(data.deadline) })}</p>
      ) : (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{t("outsideWindow", { date: formatDate(data.deadline) })}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        {data.suggestedStart && data.suggestedEnd
          ? t("suggested", { start: data.suggestedStart.slice(0, 5), end: data.suggestedEnd.slice(0, 5) })
          : t("noSuggestion")}
      </p>
      <div className="space-y-1">
        <Label htmlFor="ot-task">{t("task")}</Label>
        {data.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTasks")}</p>
        ) : (
          <ChoiceSelect
            id="ot-task"
            value={taskId}
            onChange={onTaskChange}
            placeholder={t("taskPlaceholder")}
            choices={data.tasks.map((task) => ({ value: task.taskId, label: `${task.taskKey} · ${task.taskTitle} (${task.projectName})` }))}
          />
        )}
      </div>
    </div>
  );
}

function UsageHint({
  usage,
  hasEmployee,
  remaining,
}: {
  usage: { data?: OvertimeUsage; isPending: boolean; isError: boolean; fetchStatus: string };
  hasEmployee: boolean;
  remaining: number | null;
}) {
  const t = useTranslations("Overtime.form");
  const duration = useDuration();
  if (!hasEmployee) return null;
  if (usage.isPending && usage.fetchStatus !== "idle") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> {t("usageLoading")}
      </p>
    );
  }
  // Không lấy được mức đã dùng: vẫn cho gửi, backend tự kiểm.
  if (usage.isError) return <p className="text-sm text-muted-foreground">{t("usageUnavailable")}</p>;
  const u = usage.data;
  if (!u) return null;

  return (
    <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <ul className="space-y-0.5 tabular-nums">
        <li>{u.scheduledEnd ? t("scheduledEnd", { time: u.scheduledEnd.slice(0, 5) }) : t("offDay")}</li>
        <li>
          {t("usedMonth", { used: duration(u.usedMonthMinutes), cap: duration(u.monthCapMinutes) })} ·{" "}
          {t("usedYear", { used: duration(u.usedYearMinutes), cap: duration(u.yearCapMinutes) })}
        </li>
        <li>
          {t("maxDay", { duration: duration(u.maxDayMinutes) })}
          {remaining !== null && remaining < u.maxDayMinutes && <> · {t("remaining", { duration: duration(remaining) })}</>}
        </li>
      </ul>
    </div>
  );
}
