"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChoiceSelect } from "@/components/shared/choice-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/format";
import { buildAdjustment, parsePaidUnits, type AdjustmentKind } from "../adjustment";
import { timesheetKeys, useAdjustTimesheetDay, useTimesheetErrorMessage } from "../hooks";
import type { TimesheetDay } from "../types";
import { DayHistory } from "./day-history";

type Props = {
  employeeId: string;
  employeeName: string | null;
  day: TimesheetDay;
  canEdit?: boolean;
  initiallyEditing?: boolean;
  onReload?: () => Promise<boolean>;
  onClose: () => void;
};

const ADJUSTMENT_KINDS = ["paidUnits", "hours", "clear"] as const;

export function TimesheetDayDialog({ employeeId, employeeName, day, canEdit, initiallyEditing, onReload, onClose }: Props) {
  const t = useTranslations("Timesheet");
  const errorMessage = useTimesheetErrorMessage("adjustment");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(initiallyEditing ? "edit" : "history");
  const [kind, setKind] = useState<AdjustmentKind>("paidUnits");
  const [units, setUnits] = useState(day.paidUnits?.toString() ?? "");
  const [checkIn, setCheckIn] = useState(formatTime(day.firstIn, ""));
  const [checkOut, setCheckOut] = useState(formatTime(day.lastOut, ""));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [reloadNeeded, setReloadNeeded] = useState(false);
  const [reloading, setReloading] = useState(false);
  const mutation = useAdjustTimesheetDay(async (failure) => {
    setError(errorMessage(failure));
    setReloadNeeded(true);
    await reload();
  });

  const busy = mutation.isPending || reloading;
  const activeTab = canEdit && tab === "edit" ? "edit" : "history";
  const invalidUnits = kind === "paidUnits" && !!units.trim() && parsePaidUnits(units) === null;
  const adjustment = buildAdjustment(
    { employeeId, date: day.workDate, currentAdjustmentId: day.currentAdjustmentId ?? null },
    { kind, reason, units, checkIn, checkOut },
  );

  async function reload() {
    if (!onReload) return;
    setReloading(true);
    try {
      const [fresh] = await Promise.all([
        onReload(),
        queryClient.invalidateQueries({ queryKey: timesheetKeys.history(employeeId, day.workDate) }),
      ]);
      if (fresh) setReloadNeeded(false);
    } finally {
      setReloading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !adjustment || busy || reloadNeeded) return;
    setError("");
    try {
      await mutation.mutateAsync(adjustment);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t(activeTab === "edit" ? "adjustment.edit" : "adjustment.title")}</DialogTitle>
          <DialogDescription>{[employeeName, formatDate(day.workDate)].filter(Boolean).join(" · ")}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {reloadNeeded && !reloading && <Button type="button" variant="outline" onClick={reload}>{t("adjustment.reload")}</Button>}
        <Tabs value={activeTab} onValueChange={(value) => setTab(String(value))}>
          <TabsList>
            {canEdit && <TabsTrigger value="edit">{t("adjustment.edit")}</TabsTrigger>}
            <TabsTrigger value="history">{t("history.title")}</TabsTrigger>
          </TabsList>
          {canEdit && (
            <TabsContent value="edit" className="mt-4">
              <form id="timesheet-adjustment-form" onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment-kind">{t("adjustment.kind")}</Label>
                  <ChoiceSelect
                    id="adjustment-kind"
                    value={kind}
                    choices={ADJUSTMENT_KINDS.map((value) => ({
                      value, label: t(`adjustment.${value}`),
                    }))}
                    onChange={(value) => {
                      if (value === "paidUnits" || value === "hours" || value === "clear") setKind(value);
                    }}
                    disabled={busy}
                  />
                </div>
                {kind === "paidUnits" && (
                  <div className="space-y-2">
                    <Label htmlFor="adjustment-units">{t("adjustment.paidUnits")}</Label>
                    <Input id="adjustment-units" inputMode="decimal" value={units} disabled={busy}
                      onChange={(event) => setUnits(event.target.value)} aria-invalid={invalidUnits}
                      aria-describedby={invalidUnits ? "adjustment-units-error" : undefined} />
                    {invalidUnits && <p id="adjustment-units-error" role="alert" className="text-destructive">{t("errors.invalidPaidUnits")}</p>}
                  </div>
                )}
                {kind === "hours" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="adjustment-in">{t("table.in")}</Label>
                      <Input id="adjustment-in" type="time" value={checkIn} disabled={busy} onChange={(event) => setCheckIn(event.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adjustment-out">{t("table.out")}</Label>
                      <Input id="adjustment-out" type="time" value={checkOut} disabled={busy} onChange={(event) => setCheckOut(event.target.value)} required />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="adjustment-reason">{t("history.reason")}</Label>
                  <Textarea id="adjustment-reason" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} required />
                </div>
              </form>
            </TabsContent>
          )}
          <TabsContent value="history" className="mt-4">
            {activeTab === "history" && <DayHistory employeeId={employeeId} date={day.workDate} />}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>{t("adjustment.close")}</Button>
          {activeTab === "edit" && (
            <Button type="submit" form="timesheet-adjustment-form" disabled={!adjustment || busy || reloadNeeded}>{t("adjustment.save")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
