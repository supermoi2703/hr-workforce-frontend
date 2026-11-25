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
  const requestRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraErrorKind | null>(null);

  const release = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
  }, [release]);

  const start = useCallback(async () => {
    release();
    const request = requestRef.current;
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
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (request === requestRef.current) setStatus("ready");
    } catch (cause) {
      if (request !== requestRef.current) return;
      release();
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "notFound" : name === "NotReadableError" ? "busy" : "unknown",
      );
      setStatus("error");
    }
  }, [release]);

  useEffect(() => release, [release]);

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
