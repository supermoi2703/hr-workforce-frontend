"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ScanFaceIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate, formatTime, todayIsoDate } from "@/lib/format";
import { groupByDay, scorePercent } from "../daily";
import { usePunches } from "../hooks";
import type { Punch } from "../types";
import { PersonalPunchDialog } from "./personal-punch-dialog";
import { PunchPhoto } from "./punch-photo";

function daysAgo(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Lịch sử chấm công theo phạm vi quyền (nhân viên thấy mình, quản lý thấy đội, HR thấy tất cả).
 * Mỗi dòng là một ngày của một người: lần quét đầu = check-in, lần cuối = check-out; mở ra để xem mọi lần quét và ảnh.
 * Giai đoạn demo hiện mọi ảnh để dễ kiểm tra; quyền xem ảnh siết lại sau.
 */
export function AttendancePage() {
  const t = useTranslations("Attendance");
  const { hasPermission } = useCurrentUser();
  const today = todayIsoDate();
  const [from, setFrom] = useState(daysAgo(today, 6));
  const [to, setTo] = useState(today);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [punching, setPunching] = useState(false);
  const punches = usePunches({ from, to });
  const days = useMemo(() => groupByDay(punches.data?.content ?? []), [punches.data]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          hasPermission("attendance:punch") && (
            <Button onClick={() => setPunching(true)}>
              <ScanFaceIcon /> {t("punchWithFace")}
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="punch-from">{t("from")}</Label>
          <Input id="punch-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="punch-to">{t("to")}</Label>
          <Input id="punch-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {punches.isPending ? (
        <LoadingState />
      ) : punches.isError ? (
        <ErrorState error={punches.error} onRetry={() => punches.refetch()} />
      ) : days.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead>{t("columns.checkIn")}</TableHead>
                <TableHead>{t("columns.checkOut")}</TableHead>
                <TableHead className="text-right">{t("columns.scans")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => {
                const open = expanded === day.key;
                return (
                  <Fragment key={day.key}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded(open ? null : day.key)}>
                      <TableCell>{open ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(day.workDate)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{day.employee.fullName}</div>
                        <div className="text-xs text-muted-foreground">{day.employee.employeeCode}</div>
                      </TableCell>
                      <TableCell>
                        <PunchCell punch={day.first} />
                      </TableCell>
                      <TableCell>{day.last ? <PunchCell punch={day.last} /> : <span className="text-muted-foreground">{t("noCheckOut")}</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{day.punches.length}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={6}>
                          <div className="flex flex-wrap gap-4 py-2">
                            {day.punches.map((punch) => (
                              <div key={punch.id} className="flex items-center gap-3 rounded-lg border bg-background p-2">
                                <PunchPhoto fileId={punch.photoFileId} alt={t("photoAlt", { time: formatTime(punch.punchedAt) })} className="size-20" />
                                <div className="space-y-1 text-sm">
                                  <div className="font-medium tabular-nums">{formatTime(punch.punchedAt)}</div>
                                  <PunchMeta punch={punch} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {punches.data && punches.data.totalElements > punches.data.content.length && (
        <p className="text-sm text-muted-foreground">{t("truncated", { shown: punches.data.content.length, total: punches.data.totalElements })}</p>
      )}

      {punching && <PersonalPunchDialog onClose={() => setPunching(false)} />}
    </>
  );
}

function PunchCell({ punch }: { punch: Punch }) {
  const t = useTranslations("Attendance");
  return (
    <div className="flex items-center gap-2">
      <PunchPhoto fileId={punch.photoFileId} alt={t("photoAlt", { time: formatTime(punch.punchedAt) })} className="size-10" />
      <div>
        <div className="font-medium tabular-nums">{formatTime(punch.punchedAt)}</div>
        <div className="text-xs text-muted-foreground">{t(`source.${punch.source}`)}</div>
      </div>
    </div>
  );
}

function PunchMeta({ punch }: { punch: Punch }) {
  const t = useTranslations("Attendance");
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="outline">{t(`source.${punch.source}`)}</Badge>
      <Badge variant={punch.matchLevel === "HIGH" ? "success" : "warning"}>{t("matchScore", { score: scorePercent(punch.matchScore) })}</Badge>
      {punch.userConfirmed && <Badge variant="info">{t("userConfirmed")}</Badge>}
    </div>
  );
}
