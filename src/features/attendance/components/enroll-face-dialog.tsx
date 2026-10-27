"use client";

import { useEffect, useMemo, useState } from "react";
import { CameraIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { captureSquare, useCamera } from "../camera";
import { failedPhotoIndex, scorePercent } from "../daily";
import { useAttendanceErrorMessage, useEnrollFace } from "../hooks";
import type { EmployeeFaceStatus } from "../types";
import { CameraView } from "./camera-view";

// Khớp FaceEnrollmentService.MIN_PHOTOS / MAX_PHOTOS ở backend.
const MIN_PHOTOS = 3;
const MAX_PHOTOS = 5;

type Shot = { blob: Blob; url: string };

/**
 * HR đăng ký khuôn mặt cho nhân viên đang đứng trước camera (ngày onboarding): chụp 3–5 ảnh (nên đổi góc nhẹ giữa
 * các ảnh), tick xác nhận nhân viên đã đồng ý, rồi lưu. Backend kiểm tra các ảnh có cùng một người; ảnh nào lệch thì
 * được đánh dấu để chụp lại.
 */
export function EnrollFaceDialog({ employee, onClose }: { employee: EmployeeFaceStatus; onClose: () => void }) {
  const t = useTranslations("Attendance.enroll");
  const errorMessage = useAttendanceErrorMessage();
  const camera = useCamera();
  const enroll = useEnrollFace();
  const [shots, setShots] = useState<Shot[]>([]);
  const [consent, setConsent] = useState(false);
  const [badIndex, setBadIndex] = useState<number | null>(null);
  const { start, stop } = camera;

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  // Thu hồi URL tạm của ảnh xem trước khi đóng dialog.
  useEffect(() => () => shots.forEach((shot) => URL.revokeObjectURL(shot.url)), [shots]);

  const error = useMemo(() => (enroll.error ? errorMessage(enroll.error) : null), [enroll.error, errorMessage]);

  async function capture() {
    const video = camera.videoRef.current;
    if (!video || shots.length >= MAX_PHOTOS) return;
    const blob = await captureSquare(video);
    if (blob) setShots((list) => [...list, { blob, url: URL.createObjectURL(blob) }]);
    setBadIndex(null);
  }

  function remove(index: number) {
    setShots((list) => list.filter((_, i) => i !== index));
    setBadIndex(null);
  }

  async function submit() {
    try {
      const profile = await enroll.mutateAsync({ employeeId: employee.employeeId, photos: shots.map((s) => s.blob), consent });
      toast.success(t("success", { name: employee.fullName, score: scorePercent(profile.minPairSimilarity) }));
      onClose();
    } catch (cause) {
      setBadIndex(isApiError(cause) ? failedPhotoIndex(cause.message) : null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { name: employee.fullName })}</DialogTitle>
          <DialogDescription>{t("dialogDescription", { min: MIN_PHOTOS, max: MAX_PHOTOS })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <CameraView videoRef={camera.videoRef} status={camera.status} error={camera.error} />
          <div className="flex flex-col gap-3">
            <Button onClick={capture} disabled={camera.status !== "ready" || shots.length >= MAX_PHOTOS}>
              <CameraIcon /> {t("capture")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("photoCount", { count: shots.length, min: MIN_PHOTOS, max: MAX_PHOTOS })}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {shots.map((shot, index) => (
                <div key={shot.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.url}
                    alt={t("photoAlt", { index: index + 1 })}
                    className={cn("aspect-square w-full -scale-x-100 rounded-md object-cover", badIndex === index && "ring-2 ring-destructive")}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-background p-0.5 shadow"
                    aria-label={t("remove", { index: index + 1 })}
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Checkbox id="face-consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
          <Label htmlFor="face-consent" className="block text-sm leading-snug font-normal">
            <span className="font-medium">{t("consentLabel")}</span> {t("consentText")}
          </Label>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              {badIndex !== null && ` ${t("retakePhoto", { index: badIndex + 1 })}`}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={!consent || shots.length < MIN_PHOTOS || enroll.isPending}>
            {enroll.isPending && <Spinner />} {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
