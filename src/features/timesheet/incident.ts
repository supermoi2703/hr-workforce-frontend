import type { IncidentDraft } from "./types";

export function buildIncident({ officeId, startAt, endAt, reason }: IncidentDraft): IncidentDraft | null {
  const trimmedReason = reason.trim();
  if (!officeId || !trimmedReason || !startAt || !endAt) return null;

  // Ô nhập giờ dùng giờ Việt Nam, đồng nhất với ngày công và cách hiển thị của ứng dụng.
  const start = `${startAt}:00+07:00`;
  const end = `${endAt}:00+07:00`;
  if (!(Date.parse(start) < Date.parse(end))) return null;
  return { officeId, startAt: start, endAt: end, reason: trimmedReason };
}

export function buildIncidentCancellation(id: string, reason: string) {
  const trimmedReason = reason.trim();
  return trimmedReason ? { id, reason: trimmedReason } : null;
}
