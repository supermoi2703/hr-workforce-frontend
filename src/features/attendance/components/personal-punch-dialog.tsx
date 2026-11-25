"use client";

import { useEffect, useState } from "react";
import { CameraIcon, CircleCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { useBlinkCapture } from "../blink-capture";
import { useCamera } from "../camera";
import { scorePercent } from "../daily";
import { useAttendanceErrorMessage, usePunchWithMyFace } from "../hooks";
import type { ScanResult } from "../types";
import { BlinkHint } from "./blink-hint";
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
  const [armed, setArmed] = useState(false);
  const { start, stop } = camera;

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  async function captureAndPunch(image: Blob, signal: AbortSignal) {
    setArmed(false);
    try {
      const result = await punch.mutateAsync({ image, signal });
      if (!signal.aborted) setResult(result);
    } catch {
      // Lỗi hiện ở Alert bên dưới (punch.error).
    }
  }

  const ready = camera.status === "ready";
  const blinkStatus = useBlinkCapture(camera.videoRef, ready, armed, captureAndPunch);

  function startPunch() {
    setResult(null);
    punch.reset();
    setArmed(true);
  }

  function close() {
    stop();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <CameraView videoRef={camera.videoRef} status={camera.status} error={camera.error} className="mx-auto max-w-[50svh]" />

        {ready && (armed || blinkStatus === "loading" || blinkStatus === "error") && (
          <div className="text-center text-sm text-muted-foreground">
            <BlinkHint status={blinkStatus} />
          </div>
        )}

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
          <Button variant="outline" onClick={close}>
            {t("close")}
          </Button>
          <Button onClick={startPunch} disabled={!ready || armed || punch.isPending || blinkStatus === "loading" || blinkStatus === "error"}>
            {punch.isPending ? <Spinner /> : <CameraIcon />} {t("capture")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
