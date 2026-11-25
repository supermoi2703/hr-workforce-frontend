import { http } from "@/lib/api/http-client";
import type { PageResponse } from "@/lib/api/types";
import { kioskRequestOptions } from "./kiosk-api";
import type { EmployeeFaceStatus, FaceProfile, MyFaceConsent, Punch, PunchFilters, ScanResult } from "./types";

// Backend giới hạn 100 dòng mỗi trang; bản demo lấy một trang (đủ cho vài người chấm thử).
const PUNCH_PAGE_SIZE = 100;

function imageForm(image: Blob): FormData {
  const form = new FormData();
  form.append("image", image, "frame.jpg");
  return form;
}

export const listPunches = (filters: PunchFilters) =>
  http.get<PageResponse<Punch>>("/api/attendance-punches", {
    query: { from: filters.from, to: filters.to, employeeId: filters.employeeId, size: PUNCH_PAGE_SIZE },
  });

/** Chấm công cá nhân: so 1:1 với khuôn mặt đã đăng ký của người đang đăng nhập. */
export const punchWithMyFace = (image: Blob, signal?: AbortSignal) =>
  http.post<ScanResult>("/api/attendance-punches/me", imageForm(image), { signal });

/** Kiosk: nhận diện 1:N, khớp cao thì ghi lần chấm luôn. */
export const kioskScan = (image: Blob, token: string, signal?: AbortSignal) =>
  http.post<ScanResult>("/api/kiosk/scans", imageForm(image), { ...kioskRequestOptions(token), signal });

/** Trả lời "Đây có phải bạn không?" cho lần quét khớp vừa. */
export const kioskConfirm = (confirmationId: string, accepted: boolean, token: string) =>
  http.post<ScanResult>(`/api/kiosk/scans/${encodeURIComponent(confirmationId)}/confirmation`, { accepted }, kioskRequestOptions(token));

export const listFaceProfiles = (keyword: string | undefined, page: number, size: number, withdrawalRequested = false) =>
  http.get<PageResponse<EmployeeFaceStatus>>("/api/face-profiles", { query: { keyword, page, size, withdrawalRequested: withdrawalRequested || undefined } });

export const getFaceProfile = (employeeId: string) => http.get<FaceProfile>(`/api/face-profiles/${employeeId}`);

export function enrollFace(employeeId: string, photos: Blob[]) {
  const form = new FormData();
  photos.forEach((photo, index) => form.append("photos", photo, `photo-${index + 1}.jpg`));
  return http.post<FaceProfile>(`/api/face-profiles/${employeeId}`, form);
}

export const revokeFace = (employeeId: string) => http.delete<void>(`/api/face-profiles/${employeeId}`);

export const getMyFaceConsent = (signal?: AbortSignal) => http.get<MyFaceConsent>("/api/face-consents/me", { signal });
export const acceptMyFaceConsent = (version: number) => http.post<MyFaceConsent>("/api/face-consents/me", { version });
export const requestMyFaceConsentWithdrawal = () => http.post<MyFaceConsent>("/api/face-consents/me/withdrawal-request");

/** URL có hạn (10 phút) để hiện ảnh chấm công / ảnh mẫu từ kho file. */
export const getPhotoUrl = (fileId: string) =>
  http.get<{ url: string; expiresAt: string }>(`/api/files/${fileId}/download-url`);
