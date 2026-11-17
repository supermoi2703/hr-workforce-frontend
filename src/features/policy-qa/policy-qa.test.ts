import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { booleanOf, HISTORY_TURNS, isValidQuestion, MAX_QUESTION_LENGTH, toHistory } from "./conversation";
import { getPolicyQaError } from "./error-messages";
import type { PolicyQaAnswer, PolicyQaEntry } from "./types";

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
