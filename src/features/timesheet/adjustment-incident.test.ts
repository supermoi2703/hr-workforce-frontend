import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { http } from "@/lib/api/http-client";
import en from "../../../messages/en.json";
import viMessages from "../../../messages/vi.json";
import { buildAdjustment, parsePaidUnits, type AdjustmentKind } from "./adjustment";
import { adjustTimesheetDay, cancelAttendanceIncident, createAttendanceIncident, getAttendanceIncidents, getTimesheetHistory } from "./api";
import { useAdjustTimesheetDay } from "./hooks";
import { buildIncident, buildIncidentCancellation } from "./incident";

vi.mock("@/lib/api/http-client", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

const post = vi.mocked(http.post);
const get = vi.mocked(http.get);
const target = { employeeId: "employee-1", date: "2026-10-08", currentAdjustmentId: "adjustment-1" };
const validDraft = { reason: "  Approved correction ", units: "0,7", checkIn: "08:30", checkOut: "17:30" };
const incident = { officeId: "office-1", startAt: "2026-10-08T08:30", endAt: "2026-10-08T09:30", reason: "  Network outage " };
const t = createTranslator({ locale: "vi", messages: viMessages, namespace: "Timesheet" });

function leafKeys(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = `${prefix}${key}`;
    return typeof value === "object" ? leafKeys(value, `${path}.`) : [path];
  });
}

describe("timesheet adjustments and attendance incidents", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(["", " \t "])("UF-2 rejects an empty or whitespace-only reason (%j) in all adjustment modes", (reason) => {
    for (const kind of ["paidUnits", "hours", "clear"] as const) {
      expect(buildAdjustment(target, { ...validDraft, kind, reason })).toBeNull();
    }
  });

  it.each(["1,3", "0,55", "1.3", "0.55"])("UF-3 rejects invalid paid units (%s) before creating a request", (units) => {
    expect(parsePaidUnits(units)).toBeNull();
    expect(buildAdjustment(target, { ...validDraft, kind: "paidUnits", units })).toBeNull();
  });

  it.each([
    ["paidUnits", { paidUnits: 0.7 }],
    ["hours", { checkIn: "08:30", checkOut: "17:30" }],
    ["clear", { clear: true }],
  ] satisfies [AdjustmentKind, object][])("UF-4 posts only the %s fields and the current adjustment ID", async (kind, values) => {
    const request = buildAdjustment(target, { ...validDraft, kind });
    expect(request).not.toBeNull();
    if (!request) throw new Error("Invalid test draft");
    await adjustTimesheetDay(request);
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/timesheet-days/adjustments", {
      ...target,
      ...values,
      reason: "Approved correction",
    });
  });

  it("UF-4 sends a null adjustment ID for a previously unadjusted day and supports zero paid units", () => {
    const request = buildAdjustment({ ...target, currentAdjustmentId: null }, { ...validDraft, kind: "paidUnits", units: "0" });
    expect(request).toMatchObject({ currentAdjustmentId: null, paidUnits: 0 });
  });

  it("UF-5 calls the day reload handler on a 409 conflict and has the Vietnamese reload message", async () => {
    const conflict = new ApiError({ status: 409, code: "ADJUSTMENT_CONFLICT", message: "Conflict" });
    post.mockRejectedValueOnce(conflict);
    const reload = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    let submit: ReturnType<typeof useAdjustTimesheetDay>["mutateAsync"] | undefined;
    function CaptureMutation() {
      submit = useAdjustTimesheetDay(reload).mutateAsync;
      return null;
    }
    const client = new QueryClient();
    renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(CaptureMutation)));
    await expect(submit?.({ ...target, reason: "Correction", clear: true })).rejects.toBe(conflict);
    expect(reload).toHaveBeenCalledExactlyOnceWith(conflict);
    expect(t("errors.adjustmentConflict")).toBe("Ngày này vừa được người khác sửa, tải lại.");
    client.clear();
  });

  it("UF-8 sends timestamps with the application time zone and formats the returned affected day count", async () => {
    post.mockResolvedValueOnce({ id: "incident-1", affectedEmployees: 3, affectedDays: 7 });
    const request = buildIncident(incident);
    expect(request).not.toBeNull();
    if (!request) throw new Error("Invalid test incident");
    const result = await createAttendanceIncident(request);
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/attendance-incidents", {
      officeId: "office-1",
      startAt: "2026-10-08T08:30:00+07:00",
      endAt: "2026-10-08T09:30:00+07:00",
      reason: "Network outage",
    });
    expect(t("incidents.createdNotice", { days: result.affectedDays })).toContain("Số ngày công bị ảnh hưởng: 7");
  });

  it("UF-8 propagates an overlap error and has the localized overlap message", async () => {
    const overlap = new ApiError({ status: 409, code: "INCIDENT_OVERLAP", message: "Conflict" });
    post.mockRejectedValueOnce(overlap);
    const request = buildIncident(incident);
    if (!request) throw new Error("Invalid test incident");
    await expect(createAttendanceIncident(request)).rejects.toBe(overlap);
    expect(t("errors.incidentOverlap")).toContain("trùng khoảng thời gian");
  });

  it("UF-9 requires a nonblank cancellation reason and submits the trimmed value", async () => {
    expect(buildIncidentCancellation("incident-1", "")).toBeNull();
    expect(buildIncidentCancellation("incident-1", " \t ")).toBeNull();
    const request = buildIncidentCancellation("incident-1", " Duplicate report ");
    if (!request) throw new Error("Invalid test cancellation");
    await cancelAttendanceIncident(request);
    expect(post).toHaveBeenCalledExactlyOnceWith("/api/attendance-incidents/incident-1/cancel", { reason: "Duplicate report" });
  });

  it("UF-10 has matching keys in the English and Vietnamese catalogs", () => {
    expect(leafKeys(viMessages).sort()).toEqual(leafKeys(en).sort());
  });

  it("uses the requested employee, date, month and office in the history and incident queries", async () => {
    await getTimesheetHistory("employee-1", "2026-10-08");
    await getAttendanceIncidents("2026-10", "office-1");
    expect(get).toHaveBeenNthCalledWith(1, "/api/timesheet-days/employee-1/2026-10-08/history");
    expect(get).toHaveBeenNthCalledWith(2, "/api/attendance-incidents", { query: { month: "2026-10", officeId: "office-1" } });
  });
});
