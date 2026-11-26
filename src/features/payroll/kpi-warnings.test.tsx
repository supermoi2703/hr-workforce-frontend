import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { useWarningLabel } from "./use-warning-label";
import { WARNING_CODES } from "./warnings";

const messages = { en, vi };
type Warning = Parameters<ReturnType<typeof useWarningLabel>>[0];

function WarningLabel({ warning }: { warning: Warning }) {
  return <>{useWarningLabel()(warning)}</>;
}

function renderLabel(locale: keyof typeof messages, warning: Warning) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Ho_Chi_Minh">
      <WarningLabel warning={warning} />
    </NextIntlClientProvider>,
  );
}

describe("T1-FE KPI warnings", () => {
  it.each([
    ["vi", "KPI chưa khóa, đang dùng số máy 1.1."],
    ["en", "KPI is not locked. Using the system coefficient 1.1."],
  ] as const)("T17 shows the system coefficient in %s", (locale, expected) => {
    expect(renderLabel(locale, { code: "KPI_NOT_LOCKED", params: { coefficient: 1.1 } })).toBe(expected);
  });

  it.each([
    ["vi", "Hệ số KPI nhập tay thay số hệ thống (0.9).", "Đang dùng hệ số KPI nhập tay vì hệ thống chưa có số."],
    ["en", "The manually entered KPI coefficient replaces the system coefficient (0.9).",
      "The manually entered KPI coefficient is in use because the system has no coefficient."],
  ] as const)("T18 shows the manual override in %s with or without a system coefficient", (locale, withCoefficient, withoutCoefficient) => {
    const code = "KPI_MANUAL_OVERRIDE";
    expect(renderLabel(locale, { code, params: { systemCoefficient: 0.9 } })).toBe(withCoefficient);
    expect(renderLabel(locale, { code, params: { systemCoefficient: null } })).toBe(withoutCoefficient);
  });

  it("T1-FE filter exposes both warning codes with standalone labels in both languages", () => {
    expect(WARNING_CODES).toEqual(expect.arrayContaining(["KPI_NOT_LOCKED", "KPI_MANUAL_OVERRIDE"]));
    expect(renderLabel("vi", { code: "KPI_NOT_LOCKED" })).toBe("KPI chưa khóa");
    expect(renderLabel("en", { code: "KPI_NOT_LOCKED" })).toBe("KPI not locked");
    expect(renderLabel("vi", { code: "KPI_MANUAL_OVERRIDE" })).toBe("KPI nhập tay");
    expect(renderLabel("en", { code: "KPI_MANUAL_OVERRIDE" })).toBe("Manual KPI override");
  });
});

describe("K5-7 first-month KPI warning", () => {
  it("is in the filter and reads the same rule in vi and en", () => {
    expect(WARNING_CODES).toContain("KPI_FIRST_MONTH");
    expect(renderLabel("vi", { code: "KPI_FIRST_MONTH" })).toBe("Tháng đầu vào làm, chưa có KPI: tính hệ số 1,0 theo ngày công");
    expect(renderLabel("en", { code: "KPI_FIRST_MONTH" })).toBe("First month, no KPI yet: coefficient 1.0 prorated by working days");
  });
});
