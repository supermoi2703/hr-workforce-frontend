"use client";

import type { ReactNode, RefObject } from "react";
import { CameraOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { CameraErrorKind, CameraStatus } from "../camera";

type CameraViewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: CameraErrorKind | null;
  /** Lớp phủ trên video (kết quả nhận diện, nút xác nhận...). */
  overlay?: ReactNode;
  className?: string;
};

/**
 * Khung camera vuông 1:1 có oval hướng dẫn đứng vào. Ảnh gửi đi cũng là khung vuông ở giữa (captureSquare),
 * nên thứ người dùng thấy trong khung chính là thứ được chụp. Video lật gương cho tự nhiên như soi gương.
 */
export function CameraView({ videoRef, status, error, overlay, className }: CameraViewProps) {
  const t = useTranslations("Attendance.camera");

  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-xl bg-muted", className)}>
      <video
        ref={videoRef}
        className={cn("size-full -scale-x-100 object-cover", status !== "ready" && "invisible")}
        playsInline
        muted
      />
      {status === "ready" && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[68%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.25)]"
        />
      )}
      {status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {t("starting")}
        </div>
      )}
      {status === "error" && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <CameraOffIcon className="size-8" aria-hidden />
          <p>{t(`errors.${error}`)}</p>
        </div>
      )}
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
          <CameraOffIcon className="size-8" aria-hidden />
          <p>{t("off")}</p>
        </div>
      )}
      {overlay}
    </div>
  );
}
