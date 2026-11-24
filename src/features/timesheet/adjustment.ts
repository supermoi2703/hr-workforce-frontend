import type { PeriodStatus, TimesheetAdjustment } from "./types";

export type AdjustmentKind = "paidUnits" | "hours" | "clear";

export function canAdjustDay({
  canManage, employeeId, ownEmployeeId, date, today, period,
}: {
  canManage: boolean;
  employeeId: string;
  ownEmployeeId?: string | null;
  date: string;
  today: string;
  period?: PeriodStatus;
}) {
  return canManage && employeeId !== ownEmployeeId && date < today && period === "OPEN";
}

export function parsePaidUnits(value: string): number | null {
  const decimal = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d0*)?|\.\d0*)$/.test(decimal)) return null;
  const units = Number(decimal);
  return units <= 1 ? units : null;
}

export function buildAdjustment(
  target: Pick<TimesheetAdjustment, "employeeId" | "date" | "currentAdjustmentId">,
  draft: { kind: AdjustmentKind; reason: string; units: string; checkIn: string; checkOut: string },
): TimesheetAdjustment | null {
  const reason = draft.reason.trim();
  if (!reason) return null;
  const common = { ...target, reason };

  switch (draft.kind) {
    case "paidUnits": {
      const paidUnits = parsePaidUnits(draft.units);
      return paidUnits === null ? null : { ...common, paidUnits };
    }
    case "hours": {
      const { checkIn, checkOut } = draft;
      const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      return time.test(checkIn) && time.test(checkOut) ? { ...common, checkIn, checkOut } : null;
    }
    case "clear":
      return { ...common, clear: true };
  }
}
