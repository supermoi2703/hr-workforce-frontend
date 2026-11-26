"use client";

import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations, type Messages } from "next-intl";
import { isApiError } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/api/use-error-message";
import {
  acceptMyFaceConsent,
  enrollFace,
  getFaceProfile,
  getMyFaceConsent,
  getPhotoUrl,
  kioskConfirm,
  kioskScan,
  listFaceProfiles,
  listPunches,
  punchWithMyFace,
  requestMyFaceConsentWithdrawal,
  revokeFace,
} from "./api";
import type { MyFaceConsent, PunchFilters } from "./types";

export const attendanceKeys = {
  punches: (filters: PunchFilters) => ["attendance", "punches", filters] as const,
  faceProfiles: (keyword: string | undefined, page: number, size: number, withdrawalRequested: boolean) =>
    ["attendance", "face-profiles", keyword, page, size, withdrawalRequested] as const,
  faceProfile: (employeeId: string) => ["attendance", "face-profile", employeeId] as const,
  myFaceConsent: (employeeId: string | null) => ["attendance", "face-consent", employeeId] as const,
  photo: (fileId: string) => ["attendance", "photo", fileId] as const,
};

export function usePunches(filters: PunchFilters) {
  return useQuery({
    queryKey: attendanceKeys.punches(filters),
    queryFn: () => listPunches(filters),
    placeholderData: keepPreviousData,
  });
}

export function useFaceProfiles(keyword: string | undefined, page: number, size = 20, withdrawalRequested = false) {
  return useQuery({
    queryKey: attendanceKeys.faceProfiles(keyword, page, size, withdrawalRequested),
    queryFn: () => listFaceProfiles(keyword, page, size, withdrawalRequested),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: "always",
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
    mutationFn: ({ employeeId, photos }: { employeeId: string; photos: Blob[] }) => enrollFace(employeeId, photos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", "face-profiles"] }),
    onError: (error) => {
      if (isApiError(error) && error.code === "CONSENT_REQUIRED") {
        void queryClient.invalidateQueries({ queryKey: ["attendance", "face-profiles"] });
      }
    },
  });
}

export function useRevokeFace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeFace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useMyFaceConsent(employeeId: string | null) {
  return useQuery({
    queryKey: attendanceKeys.myFaceConsent(employeeId),
    queryFn: ({ signal }) => getMyFaceConsent(signal),
    enabled: employeeId !== null,
    refetchOnWindowFocus: "always",
  });
}

function useUpdateMyFaceConsent<T>(employeeId: string | null, update: (input: T) => Promise<MyFaceConsent>) {
  const queryClient = useQueryClient();
  const queryKey = attendanceKeys.myFaceConsent(employeeId);
  return useMutation({
    mutationFn: update,
    networkMode: "always",
    onSuccess: async (consent) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, consent);
      void queryClient.invalidateQueries({ queryKey: ["attendance", "face-profiles"] });
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

export const useAcceptMyFaceConsent = (employeeId: string | null) => useUpdateMyFaceConsent(employeeId, acceptMyFaceConsent);
export const useRequestMyFaceConsentWithdrawal = (employeeId: string | null) =>
  useUpdateMyFaceConsent<void>(employeeId, requestMyFaceConsentWithdrawal);

export function usePunchWithMyFace() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always", // Ảnh từ một lần chớp mắt không chờ gửi lại khi có mạng.
    mutationFn: ({ image, signal }: { image: Blob; signal: AbortSignal }) => punchWithMyFace(image, signal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", "punches"] }),
  });
}

export function useKioskScan() {
  return useMutation({
    networkMode: "always",
    mutationFn: ({ image, token, signal }: { image: Blob; token: string; signal?: AbortSignal }) => kioskScan(image, token, signal),
  });
}

export function useKioskConfirm() {
  return useMutation({
    networkMode: "always",
    mutationFn: ({ confirmationId, accepted, token }: { confirmationId: string; accepted: boolean; token: string }) =>
      kioskConfirm(confirmationId, accepted, token),
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
  CONSENT_REQUIRED: "consentRequired",
  CONSENT_VERSION_MISMATCH: "consentVersionMismatch",
  CONSENT_WITHDRAWAL_PENDING: "consentWithdrawalPending",
  FACE_ENROLL_PHOTO_COUNT: "photoCount",
  FACE_ENROLL_INCONSISTENT: "inconsistent",
  FACE_NOT_ENROLLED: "notEnrolled",
  FACE_NOT_MATCHED: "notMatched",
  PUNCH_CONFIRMATION_NOT_FOUND: "confirmationExpired",
  EMPLOYEE_PROFILE_REQUIRED: "employeeProfileRequired",
  STORAGE_UNAVAILABLE: "storageUnavailable",
  KIOSK_PAIRING_CODE_INVALID: "kioskPairingCodeInvalid",
  KIOSK_OUTSIDE_OFFICE_NETWORK: "kioskOutsideOfficeNetwork",
  KIOSK_OFFICE_NETWORK_NOT_CONFIGURED: "kioskOfficeNetworkNotConfigured",
  KIOSK_CIDR_INVALID: "kioskCidrInvalid",
  KIOSK_CIDR_DUPLICATE: "kioskCidrDuplicate",
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
