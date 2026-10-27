"use client";

import { useEffect, useState } from "react";
import { CameraIcon, CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { captureSquare, useCamera } from "../camera";
import { scorePercent } from "../daily";
import { useAttendanceErrorMessage, usePunchWithMyFace } from "../hooks";
import type { ScanResult } from "../types";
import { CameraView } from "./camera-view";

/**
 * Nhân viên tự chấm công trên máy của mình: chụp một ảnh, backend so 1:1 với khuôn mặt đã đăng ký của chính người
 * đang đăng nhập. Chỉ khớp cao mới ghi lần chấm.
 */
export function PersonalPunchDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Attendance.personal");
  const errorMessage = useAttendanceErrorMessage();
  const camera = useCamera();
  const punch = usePunchWithMyFace();
  const [result, setResult] = useState<ScanResult | null>(null);
  const { start, stop } = camera;

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  async function captureAndPunch() {
    const video = camera.videoRef.current;
    if (!video) return;
    const image = await captureSquare(video);
    if (!image) return;
    setResult(null);
    try {
      setResult(await punch.mutateAsync(image));
    } catch {
      // Lỗi hiện ở Alert bên dưới (punch.error).
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <CameraView videoRef={camera.videoRef} status={camera.status} error={camera.error} />

        {result && (
          <Alert>
            <CircleCheckIcon className="text-success" />
            <AlertDescription>
              {result.status === "DUPLICATE"
                ? t("duplicate", { time: formatTime(result.punch?.punchedAt) })
                : t("success", { time: formatTime(result.punch?.punchedAt) })}{" "}
              {t("score", { score: scorePercent(result.score) })}
            </AlertDescription>
          </Alert>
        )}
        {punch.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(punch.error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
          <Button onClick={captureAndPunch} disabled={camera.status !== "ready" || punch.isPending}>
            {punch.isPending ? <Spinner /> : <CameraIcon />} {t("capture")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
