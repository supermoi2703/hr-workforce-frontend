"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "error";

/** Lỗi bật camera, đã phân loại để hiện thông báo dễ hiểu. */
export type CameraErrorKind = "insecure" | "denied" | "notFound" | "busy" | "unknown";

/**
 * Bật / tắt camera trước của thiết bị và gắn vào thẻ <video>.
 * Camera chỉ chạy trên HTTPS hoặc localhost (trình duyệt chặn ở http://192.168...).
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraErrorKind | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("insecure");
      setStatus("error");
      return;
    }
    setStatus("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "notFound" : name === "NotReadableError" ? "busy" : "unknown",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, start, stop };
}

/**
 * Chụp một khung hình vuông 1:1 ở giữa video (cắt, không phóng to), thu về tối đa `size` px, JPEG.
 * Ảnh vuông khớp với khung oval hướng dẫn trên màn hình; backend chỉ lưu ảnh nhỏ quanh mặt.
 */
export function captureSquare(video: HTMLVideoElement, size = 640, quality = 0.9): Promise<Blob | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return Promise.resolve(null);
  const side = Math.min(width, height);
  const output = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(video, (width - side) / 2, (height - side) / 2, side, side, 0, 0, output, output);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Ngưỡng chênh lệch điểm ảnh trung bình (0–255) giữa hai khung liên tiếp, đo trên ảnh xám 32x24.
// Có chuyển động: người bước vào khung. Đứng yên: dưới ngưỡng thấp đủ lâu → chụp.
export const MOTION_THRESHOLD = 10;
export const STILL_THRESHOLD = 4;
export const STILL_DURATION_MS = 700;
const SAMPLE_INTERVAL_MS = 120;
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 24;

/**
 * Bộ phát hiện "có người bước vào rồi đứng yên một chút" bằng so sánh khung hình (không cần model AI ở trình
 * duyệt). Cảnh trống đứng yên không kích hoạt vì chưa thấy chuyển động. Sau mỗi lần kích hoạt phải có chuyển động
 * mới (người khác bước vào, hoặc người cũ đi ra rồi vào lại) mới kích hoạt tiếp.
 */
export function useStillnessTrigger(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onStill: () => void,
) {
  const onStillRef = useRef(onStill);
  const [motion, setMotion] = useState(0);

  useEffect(() => {
    onStillRef.current = onStill;
  }, [onStill]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let previous: Uint8ClampedArray | null = null;
    let motionSeen = false;
    let stillSince: number | null = null;

    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!context || !video || video.readyState < 2) return;
      context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const frame = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
      if (previous) {
        const diff = meanGrayDiff(previous, frame);
        setMotion(diff);
        const now = performance.now();
        if (diff > MOTION_THRESHOLD) {
          motionSeen = true;
          stillSince = null;
        } else if (diff < STILL_THRESHOLD && motionSeen) {
          stillSince ??= now;
          if (now - stillSince >= STILL_DURATION_MS) {
            motionSeen = false;
            stillSince = null;
            onStillRef.current();
          }
        }
      }
      previous = new Uint8ClampedArray(frame);
    }, SAMPLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, videoRef]);

  return { motion };
}

/** Chênh lệch trung bình của độ sáng (ảnh RGBA) giữa hai khung. */
export function meanGrayDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let total = 0;
  const pixels = Math.min(a.length, b.length) / 4;
  for (let i = 0; i < pixels * 4; i += 4) {
    const grayA = (a[i] * 299 + a[i + 1] * 587 + a[i + 2] * 114) / 1000;
    const grayB = (b[i] * 299 + b[i + 1] * 587 + b[i + 2] * 114) / 1000;
    total += Math.abs(grayA - grayB);
  }
  return pixels ? total / pixels : 0;
}

/** Giữ màn hình kiosk luôn sáng (Screen Wake Lock); tab ẩn đi thì trình duyệt tự nhả, hiện lại thì xin lại. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          sentinel = lock;
        })
        .catch(() => {
          // Bị từ chối (pin yếu, trình duyệt không cho): kiosk vẫn chạy, chỉ là màn hình có thể tắt.
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [enabled]);
}
