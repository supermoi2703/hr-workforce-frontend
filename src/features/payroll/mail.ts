import type { MailStatus, MailStatusResponse } from "./types";

export const MAX_INTRO = 300;

/** Lời nhắn đầu mail: tối đa 300 ký tự sau khi cắt khoảng trắng (backend kiểm lại). */
export function validateIntro(intro: string): "tooLong" | null {
  return intro.trim().length > MAX_INTRO ? "tooLong" : null;
}

/** Lời nhắn gửi đi; rỗng thì không gửi trường này. */
export const introOrUndefined = (intro: string): string | undefined => intro.trim() || undefined;

export type MailSummary = { sent: number; failed: number; pending: number; total: number };

/** Gom `counts` của backend (thiếu trạng thái nào coi như 0). */
export function summarizeCounts(counts: MailStatusResponse["counts"] | undefined): MailSummary {
  const n = (status: MailStatus) => counts?.[status] ?? 0;
  const sent = n("SENT");
  const failed = n("FAILED");
  const pending = n("PENDING");
  return { sent, failed, pending, total: sent + failed + pending };
}

/** Còn PENDING thì làm mới mỗi 5 giây, hết PENDING thì dừng. */
export function mailRefetchInterval(counts: MailStatusResponse["counts"] | undefined): number | false {
  return summarizeCounts(counts).pending > 0 ? 5000 : false;
}

/** Lỗi ngắn của một dòng thất bại: mã đã biết thì dịch, mã lạ hiện nguyên. */
export function knownMailError(error: string | null): "NO_EMAIL" | null {
  return error === "NO_EMAIL" ? "NO_EMAIL" : null;
}

/** Chỉ kỳ PUBLISHED mới gửi, gửi lại và xem trước được. */
export const canSendMail = (status: string) => status === "PUBLISHED";
