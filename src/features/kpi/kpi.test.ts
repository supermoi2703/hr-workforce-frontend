import { describe, expect, it, vi } from "vitest";
import { http } from "@/lib/api/http-client";
import { getRatingQueue, getReviewPage, runKpiAction } from "./api";
import { initialKpiMonth, nextPeriodStatus, parseCoefficient } from "./rules";
import type { PeriodStatus } from "./types";

vi.mock("@/lib/api/http-client", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("KPI entry and validation", () => {
  it("opens a notification's month and falls back for invalid or repeated values", () => {
    expect(initialKpiMonth("2026-07", "2026-11")).toBe("2026-07");
    expect(initialKpiMonth("2026-13", "2026-11")).toBe("2026-11");
    expect(initialKpiMonth(["2026-05", "2026-07"], "2026-11")).toBe("2026-11");
  });

  it("accepts up to three decimals without exceeding the policy cap", () => {
    expect(parseCoefficient("1,125", 1.2)).toBe(1.125);
    expect(parseCoefficient("0", 1.2)).toBe(0);
    for (const value of ["", "-1", "1.201", "1.0005", "1e0"]) {
      expect(parseCoefficient(value, 1.2)).toBeUndefined();
    }
  });

  it.each([
    ["OPEN", "RATING"],
    ["RATING", "REVIEW"],
    ["REVIEW", "LOCKED"],
    ["LOCKED", null],
  ] as const)("advances %s only to %s", (status: PeriodStatus, next) => {
    expect(nextPeriodStatus(status)).toBe(next);
  });
});

describe("K3 API contract", () => {
  it("sends the chosen month and uses zero-based review pagination", () => {
    getRatingQueue("2026-07");
    getReviewPage("2026-07", 0, { departmentId: "department-1", status: "LOCKED" });
    expect(http.get).toHaveBeenCalledWith("/api/kpi-ratings/mine", { query: { month: "2026-07" } });
    expect(http.get).toHaveBeenCalledWith("/api/kpi-reviews", {
      query: { month: "2026-07", page: 0, size: 50, departmentId: "department-1", status: "LOCKED" },
    });
  });

  it("distinguishes an adjustment reset from zero, and row unlock from period unlock", async () => {
    const input = { coefficient: null, reason: "Restore the machine coefficient" };
    await runKpiAction({ type: "adjust", id: "review-1", input });
    await runKpiAction({ type: "unlockReview", id: "review-1", reason: "Review correction" });
    await runKpiAction({ type: "unlockPeriod", month: "2026-07", reason: "Period correction" });
    expect(http.put).toHaveBeenCalledWith("/api/kpi-reviews/review-1/adjustment", input);
    expect(http.post).toHaveBeenCalledWith("/api/kpi-reviews/review-1/unlock", { reason: "Review correction" });
    expect(http.post).toHaveBeenCalledWith("/api/kpi-periods/2026-07/unlock", { reason: "Period correction" });
  });
});
