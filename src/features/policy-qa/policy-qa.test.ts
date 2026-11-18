import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { booleanOf, HISTORY_TURNS, isValidQuestion, MAX_QUESTION_LENGTH, toHistory } from "./conversation";
import { getPolicyQaError } from "./error-messages";
import {
  formatParameterValue,
  humanizeExcerpt,
  PARAMETER_KEYS,
  parameterLabel,
  sourceTitle,
  type ParameterTranslate,
} from "./parameter-labels";
import type { PolicyQaAnswer, PolicyQaEntry } from "./types";

const parameterTranslator = (messages: typeof vi | typeof en, locale: "vi" | "en") =>
  createTranslator({ locale, messages, namespace: "PolicyQa.parameters" }) as unknown as ParameterTranslate;

const answer = (overrides: Partial<PolicyQaAnswer> = {}): PolicyQaAnswer => ({
  answered: true,
  answer: "Tối đa 1 ngày mỗi tuần.",
  sources: [],
  parameters: [],
  latencyMs: 1200,
  ...overrides,
});

const done = (id: string, question: string, result: PolicyQaAnswer): PolicyQaEntry => ({
  id,
  question,
  state: "done",
  answer: result,
});

describe("isValidQuestion", () => {
  it("cần có chữ và không quá dài", () => {
    expect(isValidQuestion("Phép năm?")).toBe(true);
    expect(isValidQuestion("   ")).toBe(false);
    expect(isValidQuestion("")).toBe(false);
    expect(isValidQuestion("a".repeat(MAX_QUESTION_LENGTH))).toBe(true);
    expect(isValidQuestion("a".repeat(MAX_QUESTION_LENGTH + 1))).toBe(false);
  });

  it("độ dài tính sau khi cắt khoảng trắng hai đầu", () => {
    expect(isValidQuestion(`  ${"a".repeat(MAX_QUESTION_LENGTH)}  `)).toBe(true);
  });
});

describe("toHistory", () => {
  it("chỉ lấy các lượt đã được trả lời, theo thứ tự cũ đến mới", () => {
    const entries: PolicyQaEntry[] = [
      done("1", "Q1", answer({ answer: "A1" })),
      done("2", "Q2 bị từ chối", answer({ answered: false, answer: "" })),
      { id: "3", question: "Q3 đang chờ", state: "pending" },
      { id: "4", question: "Q4 lỗi", state: "error", error: new Error("x") },
      done("5", "Q5", answer({ answer: "A5" })),
    ];

    expect(toHistory(entries)).toEqual([
      { question: "Q1", answer: "A1" },
      { question: "Q5", answer: "A5" },
    ]);
  });

  it("chỉ giữ vài lượt gần nhất", () => {
    const entries = Array.from({ length: 6 }, (_, i) => done(String(i), `Q${i}`, answer({ answer: `A${i}` })));

    const history = toHistory(entries);

    expect(history).toHaveLength(HISTORY_TURNS);
    expect(history.map((turn) => turn.question)).toEqual(["Q3", "Q4", "Q5"]);
    expect(toHistory(entries, 1)).toEqual([{ question: "Q5", answer: "A5" }]);
  });

  it("chưa có gì thì rỗng", () => {
    expect(toHistory([])).toEqual([]);
  });
});

describe("booleanOf", () => {
  it("chỉ đổi true / false, giá trị khác giữ nguyên", () => {
    expect(booleanOf("true")).toBe(true);
    expect(booleanOf("false")).toBe(false);
    expect(booleanOf("2")).toBeNull();
    expect(booleanOf("PT2M")).toBeNull();
    expect(booleanOf("08:30")).toBeNull();
  });
});

describe("getPolicyQaError", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "PolicyQa.errors" });
  const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

  it("mã lỗi của trợ lý có câu riêng", () => {
    const disabled = new ApiError({ status: 503, code: "FEATURE_DISABLED", message: "x" });
    const unavailable = new ApiError({ status: 503, code: "AI_SERVICE_UNAVAILABLE", message: "x" });

    expect(getPolicyQaError(disabled, t, tErrors)).toBe(en.PolicyQa.errors.disabled);
    expect(getPolicyQaError(unavailable, t, tErrors)).toBe(en.PolicyQa.errors.unavailable);
  });

  it("hỏi quá nhanh (429) dùng câu chung", () => {
    const limited = new ApiError({ status: 429, code: "TOO_MANY_REQUESTS", message: "x" });

    expect(getPolicyQaError(limited, t, tErrors)).toBe(en.Errors.tooManyRequests);
  });
});

describe("nhãn và giá trị tham số", () => {
  const tVi = parameterTranslator(vi, "vi");
  const tEn = parameterTranslator(en, "en");

  it("mọi khóa đều có nhãn ở cả tiếng Việt và tiếng Anh", () => {
    for (const key of PARAMETER_KEYS) {
      expect(parameterLabel(key, tVi), `vi ${key}`).toBeTruthy();
      expect(parameterLabel(key, tEn), `en ${key}`).toBeTruthy();
    }
  });

  it("không có nhãn thừa so với danh sách khóa", () => {
    const labelled = Object.keys(vi.PolicyQa.parameters.labels).sort();
    expect(labelled).toEqual(PARAMETER_KEYS.map((key) => key.replaceAll(".", "_")).sort());
    expect(Object.keys(en.PolicyQa.parameters.labels).sort()).toEqual(labelled);
  });

  it("khóa lạ hoặc kỹ thuật không có nhãn nên không được hiển thị", () => {
    expect(parameterLabel("face.match_threshold", tVi)).toBeNull();
    expect(parameterLabel("attendance.duplicate_punch_window", tVi)).toBeNull();
    expect(parameterLabel("leave.carry_over_max_days", tVi)).toBeNull();
  });

  it("giá trị có đơn vị theo ngôn ngữ", () => {
    expect(formatParameterValue("leave.annual_days", "11", tVi)).toBe("11 ngày");
    expect(formatParameterValue("leave.annual_days", "1", tEn)).toBe("1 day");
    expect(formatParameterValue("leave.annual_days", "11", tEn)).toBe("11 days");
    expect(formatParameterValue("payroll.rate_health", "0.015", tVi)).toBe("1,5%");
    expect(formatParameterValue("attendance.min_span_percent", "50", tVi)).toBe("50%");
    expect(formatParameterValue("payroll.ot_rate_normal", "1.5", tVi)).toBe("×1.5");
    expect(formatParameterValue("payroll.insurance_cap_multiple", "20", tVi)).toBe("20 lần");
    expect(formatParameterValue("schedule.start_step_minutes", "30", tVi)).toBe("30 phút");
    expect(formatParameterValue("remote.allow_intern", "false", tVi)).toBe("Không");
    expect(formatParameterValue("calendar.work_start", "08:30", tVi)).toBe("08:30");
    expect(formatParameterValue("payroll.base_salary", "2530000", tVi)).toContain("2.530.000");
  });

  it("giá trị không đọc được thì giữ nguyên", () => {
    expect(formatParameterValue("leave.annual_days", "abc", tVi)).toBe("abc");
    expect(formatParameterValue("leave.annual_days", "", tVi)).toBe("");
  });
});

describe("humanizeExcerpt", () => {
  const t = parameterTranslator(vi, "vi");

  it("bỏ câu 'Tham số ...' đứng đầu câu", () => {
    const text = "- Nhân viên làm đủ 12 tháng được **12 ngày phép năm**. Tham số `leave.annual_days`.\n- Dòng khác.";

    expect(humanizeExcerpt(text, t)).toBe("- Nhân viên làm đủ 12 tháng được **12 ngày phép năm**.\n- Dòng khác.");
  });

  it("bỏ cả cụm nhiều khóa chưa có nhãn", () => {
    const text = "Quá hạn thì hết hiệu lực. Tham số `leave.carry_over_max_days`, `leave.carry_over_expiry`.";

    expect(humanizeExcerpt(text, t)).not.toContain("`");
    expect(humanizeExcerpt(text, t)).not.toContain("carry_over");
  });

  it("thay khóa còn lại giữa câu bằng nhãn, khóa lạ thì bỏ", () => {
    expect(humanizeExcerpt("Khi tắt `attendance.remote_requires_punch`: tính 1 công.", t)).toBe(
      "Khi tắt Ngày WFH bắt buộc chấm công: tính 1 công.",
    );
    expect(humanizeExcerpt("Giá trị `face.match_threshold` xem thêm.", t)).not.toContain("face.");
  });

  it("giữ nguyên tên file tài liệu và thụt lề danh sách", () => {
    expect(humanizeExcerpt("Xem `approval.md` mục 6.", t)).toBe("Xem `approval.md` mục 6.");
    expect(humanizeExcerpt("  - dòng thụt lề", t)).toBe("  - dòng thụt lề");
  });

  it("không còn tên khóa kỹ thuật nào sau khi xử lý", () => {
    const text = PARAMETER_KEYS.map((key) => `Giá trị \`${key}\` ở đây.`).join("\n");

    expect(humanizeExcerpt(text, t)).not.toMatch(/`|[a-z]+\.[a-z_]+/);
  });
});

describe("sourceTitle", () => {
  it("lấy tiêu đề tài liệu, không lấy tên file", () => {
    expect(sourceTitle("Quy định nghỉ phép › 2. Quỹ phép năm", "leave.md")).toBe("Quy định nghỉ phép");
    expect(sourceTitle("", "leave.md")).toBe("leave.md");
  });
});

describe("bản dịch", () => {
  const keysOf = (value: unknown, prefix = ""): string[] =>
    Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      child !== null && typeof child === "object" ? keysOf(child, `${prefix}${key}.`) : [`${prefix}${key}`],
    );

  it("tiếng Việt và tiếng Anh có cùng bộ khóa", () => {
    expect(keysOf(en.PolicyQa).sort()).toEqual(keysOf(vi.PolicyQa).sort());
  });

  it("mỗi câu gợi ý có ở cả hai ngôn ngữ", () => {
    for (const messages of [en, vi]) {
      for (const key of ["leave", "remote", "lunch", "approval"]) {
        expect(messages.PolicyQa.suggestions).toHaveProperty(key);
      }
    }
  });
});
