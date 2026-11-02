"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  enrollFace,
  getFaceProfile,
  getPhotoUrl,
  kioskConfirm,
  kioskScan,
  listFaceProfiles,
  listPunches,
  punchWithMyFace,
  revokeFace,
} from "./api";
import type { PunchFilters } from "./types";

export const attendanceKeys = {
  punches: (filters: PunchFilters) => ["attendance", "punches", filters] as const,
  faceProfiles: (keyword: string | undefined, page: number) => ["attendance", "face-profiles", keyword, page] as const,
  faceProfile: (employeeId: string) => ["attendance", "face-profile", employeeId] as const,
  photo: (fileId: string) => ["attendance", "photo", fileId] as const,
};

export function usePunches(filters: PunchFilters) {
  return useQuery({
    queryKey: attendanceKeys.punches(filters),
    queryFn: () => listPunches(filters),
    placeholderData: keepPreviousData,
  });
}

export function useFaceProfiles(keyword: string | undefined, page: number, size = 20) {
  return useQuery({
    queryKey: attendanceKeys.faceProfiles(keyword, page),
    queryFn: () => listFaceProfiles(keyword, page, size),
    placeholderData: keepPreviousData,
  });
}

export function useFaceProfile(employeeId: string | null) {
  return useQuery({
    queryKey: attendanceKeys.faceProfile(employeeId ?? ""),
    queryFn: () => getFaceProfile(employeeId!),
    enabled: !!employeeId,
    retry: false,
  });
}

/** URL ảnh có hạn 10 phút: làm mới sau 8 phút. */
export function usePhotoUrl(fileId: string | null) {
  return useQuery({
    queryKey: attendanceKeys.photo(fileId ?? ""),
    queryFn: () => getPhotoUrl(fileId!),
    enabled: !!fileId,
    staleTime: 8 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
  });
}

export function useEnrollFace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, photos, consent }: { employeeId: string; photos: Blob[]; consent: boolean }) =>
      enrollFace(employeeId, photos, consent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", "face-profiles"] }),
  });
}

export function useRevokeFace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeFace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function usePunchWithMyFace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: punchWithMyFace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", "punches"] }),
  });
}

export function useKioskScan() {
  return useMutation({ mutationFn: kioskScan });
}

export function useKioskConfirm() {
  return useMutation({
    mutationFn: ({ confirmationId, accepted }: { confirmationId: string; accepted: boolean }) =>
      kioskConfirm(confirmationId, accepted),
  });
}

type AttendanceErrorKey = keyof Messages["Attendance"]["errors"];

// Mã lỗi riêng của chấm công / khuôn mặt (backend ErrorCode) → key trong messages Attendance.errors.
const ERROR_KEYS: Record<string, AttendanceErrorKey> = {
  FEATURE_DISABLED: "featureDisabled",
  FACE_SERVICE_UNAVAILABLE: "faceServiceUnavailable",
  FACE_IMAGE_INVALID: "imageInvalid",
  FACE_NOT_DETECTED: "noFace",
  FACE_MULTIPLE: "multipleFaces",
  FACE_TOO_SMALL: "faceTooSmall",
  FACE_CONSENT_REQUIRED: "consentRequired",
  FACE_ENROLL_PHOTO_COUNT: "photoCount",
  FACE_ENROLL_INCONSISTENT: "inconsistent",
  FACE_NOT_ENROLLED: "notEnrolled",
  FACE_NOT_MATCHED: "notMatched",
  PUNCH_CONFIRMATION_NOT_FOUND: "confirmationExpired",
  EMPLOYEE_PROFILE_REQUIRED: "employeeProfileRequired",
  STORAGE_UNAVAILABLE: "storageUnavailable",
};

/** Câu thông báo lỗi chấm công theo ngôn ngữ đang chọn; mã chung (mất mạng...) dùng thông báo chung. */
export function useAttendanceErrorMessage() {
  const t = useTranslations("Attendance.errors");
  const generic = useErrorMessage();
  return useCallback(
    (error: unknown) => {
      if (isApiError(error)) {
        const key = ERROR_KEYS[error.code];
        if (key) return t(key);
      }
      return generic(error);
    },
    [t, generic],
  );
}
