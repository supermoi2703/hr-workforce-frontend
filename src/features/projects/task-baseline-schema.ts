import { z } from "zod";
import { parseHours } from "./work-rules";

export function taskBaselineSchema(messages: {
  estimateInvalid: string;
  dueDateInvalid: string;
  reasonRequired: string;
  reasonTooLong: string;
}) {
  return z.object({
    estimateMinutes: z.string().trim().transform((hours, ctx) => {
      if (!hours) return null;
      const minutes = parseHours(hours);
      if (minutes === null || minutes > 100_000) {
        ctx.addIssue({ code: "custom", message: messages.estimateInvalid });
        return z.NEVER;
      }
      return minutes;
    }),
    dueDate: z.union([z.literal(""), z.iso.date()], { error: messages.dueDateInvalid })
      .transform((date) => date || null),
    reason: z.string().trim().min(1, messages.reasonRequired).max(500, messages.reasonTooLong),
  });
}
