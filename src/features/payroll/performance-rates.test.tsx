import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Access } from "@/lib/auth/types";
import en from "../../../messages/en.json";
import { PerformanceRatesPage } from "./components/performance-rates-page";
import { usePerformanceRates } from "./hooks";
import { performanceRateSchema } from "./performance-rates";
import type { PerformanceRate } from "./types";

const { permissions } = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock("@/lib/auth/auth-provider", () => ({
  useCurrentUser: () => ({
    status: "authenticated",
    can: (access: Access) => access.permissions?.some((permission) => permissions.has(permission)),
  }),
}));

vi.mock("./hooks", () => ({
  usePerformanceRates: vi.fn(() => ({
    data: [
      { id: "historical", level: "SENIOR", positionId: null, amount: 4_000_000, effectiveFrom: "2026-01-01", active: false },
      { id: "current", level: "SENIOR", positionId: null, amount: 4_500_000, effectiveFrom: "2026-11-24", active: true },
      { id: "scheduled", level: "SENIOR", positionId: "lead", amount: 5_000_000, effectiveFrom: "2026-11-25", active: false },
    ] satisfies PerformanceRate[],
  })),
  usePerformanceRatePositions: () => ({ data: [{ id: "lead", code: "LEAD", name: "Team lead", active: true }] }),
  useRemovePerformanceRate: () => ({ mutateAsync: vi.fn() }),
  usePayrollErrorMessage: () => vi.fn(),
}));

function renderPage() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Ho_Chi_Minh">
      <PerformanceRatesPage />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  permissions.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("T1-FE performance pay configuration", () => {
  it("T1-FE access hides the screen and does not load rates without payroll:config", () => {
    permissions.add("payroll:read");
    expect(renderPage()).not.toContain(en.Payroll.performanceRates.title);
    expect(usePerformanceRates).not.toHaveBeenCalled();
  });

  it("T1-FE deletion shows the button only after today's business date", () => {
    permissions.add("payroll:config");
    // 24 November in Vietnam, still 23 November in UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T18:00:00Z"));
    const rows = renderPage().match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    expect(rows).toHaveLength(4);
    expect(rows[1]).toContain(en.Payroll.performanceRates.historical);
    expect(rows[1]).not.toContain(en.Payroll.performanceRates.delete);
    expect(rows[2]).toContain(en.Payroll.performanceRates.active);
    expect(rows[2]).not.toContain(en.Payroll.performanceRates.delete);
    expect(rows[3]).toContain("Team lead");
    expect(rows[3]).toContain(en.Payroll.performanceRates.delete);
  });

  it("T1-FE amount rejects negative values and accepts zero", () => {
    const schema = performanceRateSchema((key) => en.Payroll.performanceRates[key]);
    const values = { level: "SENIOR", positionId: "", effectiveFrom: "2026-12-01" };
    const negative = schema.safeParse({ ...values, amount: "-1" });
    expect(negative.error?.issues[0]).toMatchObject({ path: ["amount"], message: en.Payroll.performanceRates.invalidAmount });
    expect(schema.parse({ ...values, amount: "0" }).amount).toBe(0);
  });
});
