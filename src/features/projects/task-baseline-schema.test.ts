import { describe, expect, it } from "vitest";
import { taskBaselineSchema } from "./task-baseline-schema";

const schema = taskBaselineSchema({
  estimateInvalid: "estimate",
  dueDateInvalid: "date",
  reasonRequired: "reason",
  reasonTooLong: "length",
});

const values = { estimateMinutes: "1:30", dueDate: "2026-11-24", reason: "  Clarified scope  " };

describe("taskBaselineSchema", () => {
  it("converts hours to minutes and trims the reason", () => {
    expect(schema.parse(values)).toEqual({
      estimateMinutes: 90,
      dueDate: "2026-11-24",
      reason: "Clarified scope",
    });
  });

  it("leaves empty baseline fields as null", () => {
    expect(schema.parse({ ...values, estimateMinutes: "", dueDate: "" })).toMatchObject({
      estimateMinutes: null,
      dueDate: null,
    });
  });

  it.each([0, 100_000])("accepts the estimate boundary of %i minutes", (minutes) => {
    expect(schema.parse({ ...values, estimateMinutes: String(minutes / 60) }).estimateMinutes).toBe(minutes);
  });

  it.each(["-1", "invalid", String(100_001 / 60)])("rejects an invalid hour estimate (%s)", (estimateMinutes) => {
    expect(schema.safeParse({ ...values, estimateMinutes }).success).toBe(false);
  });

  it("rejects an invalid due date", () => {
    expect(schema.safeParse({ ...values, dueDate: "2026-02-30" }).success).toBe(false);
  });

  it("requires a nonblank reason up to 500 characters", () => {
    expect(schema.safeParse({ ...values, reason: " \n " }).success).toBe(false);
    expect(schema.safeParse({ ...values, reason: "a".repeat(500) }).success).toBe(true);
    expect(schema.safeParse({ ...values, reason: "a".repeat(501) }).success).toBe(false);
  });
});
