"use client";

import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { createBlinkDetector, type Landmark } from "./blink";
import { captureSquare } from "./camera";

const ASSETS = "/mediapipe/0.10.21";

type FaceLandmarker = {
  detectForVideo(video: HTMLVideoElement, timestamp: number): { faceLandmarks: Landmark[][] };
  close(): void;
};

type VisionModule = {
  FilesetResolver: {
    forVisionTasks(path: string): Promise<{ wasmLoaderPath: string; wasmBinaryPath: string }>;
  };
  FaceLandmarker: {
    createFromOptions(
      files: Awaited<ReturnType<VisionModule["FilesetResolver"]["forVisionTasks"]>>,
      options: { baseOptions: { modelAssetPath: string }; runningMode: "VIDEO"; numFaces: number },
    ): Promise<FaceLandmarker>;
  };
};

async function loadLandmarker(): Promise<FaceLandmarker> {
  const { FilesetResolver, FaceLandmarker }: VisionModule = await import(
    /* webpackIgnore: true */ `${ASSETS}/vision_bundle.mjs`
  );
  const files = await FilesetResolver.forVisionTasks(`${ASSETS}/wasm`);
  return FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${ASSETS}/face_landmarker.task` },
    runningMode: "VIDEO",
    numFaces: 2, // Cần thấy được mặt thứ hai để chặn chấm công.
  });
}

export type BlinkCaptureStatus = "loading" | "guide" | "multipleFaces" | "error";

type BlinkCaptureOptions = {
  video: HTMLVideoElement;
  landmarker: Pick<FaceLandmarker, "detectForVideo">;
  isArmed: () => boolean;
  report: (status: BlinkCaptureStatus) => void;
  onCapture: (image: Blob, signal: AbortSignal) => Promise<void>;
  signal: AbortSignal;
};

export function watchBlinkCapture({ video, landmarker, isArmed, report, onCapture, signal }: BlinkCaptureOptions) {
  const stream = video.srcObject;
  const detector = createBlinkDetector();
  let previousFrame = -1;
  let frameId: number;

  function isCurrent() {
    return !signal.aborted && stream !== null && video.srcObject === stream;
  }

  async function processFrame(now: number) {
    if (!isCurrent()) return;
    if (!isArmed() || document.hidden || video.readyState < 2) {
      detector.reset();
    } else if (video.currentTime !== previousFrame) {
      previousFrame = video.currentTime;
      try {
        const { faceLandmarks } = landmarker.detectForVideo(video, now);
        const status = detector.observe(faceLandmarks, video.videoWidth / video.videoHeight, now);
        if (status === "blink") {
          // Đọc ảnh ngay trên khung mà mắt vừa mở lại.
          const image = await captureSquare(video);
          if (!isCurrent()) return;
          if (!image) {
            report("error");
            return;
          }
          if (isArmed() && !document.hidden) await onCapture(image, signal);
          if (isCurrent()) report("guide");
        } else {
          report(status);
        }
      } catch {
        if (isCurrent()) report("error");
        return;
      }
    }
    if (isCurrent()) frameId = window.requestAnimationFrame(processFrame);
  }

  frameId = window.requestAnimationFrame(processFrame);
  return () => window.cancelAnimationFrame(frameId);
}

export function useBlinkCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  ready: boolean,
  armed: boolean,
  onCapture: BlinkCaptureOptions["onCapture"],
) {
  const [status, setStatus] = useState<BlinkCaptureStatus>("loading");
  const isArmed = useEffectEvent(() => armed);
  const handleCapture = useEffectEvent(onCapture);

  useEffect(() => {
    const video = videoRef.current;
    if (!ready || !video?.srcObject) return;
    const controller = new AbortController();
    const { signal } = controller;
    let landmarker: FaceLandmarker | undefined;
    let stopWatching: (() => void) | undefined;

    void loadLandmarker().then((loaded) => {
      if (signal.aborted) {
        loaded.close();
        return;
      }
      landmarker = loaded;
      setStatus("guide");
      stopWatching = watchBlinkCapture({
        video,
        landmarker,
        isArmed: () => isArmed(),
        report: setStatus,
        onCapture: (image, captureSignal) => handleCapture(image, captureSignal),
        signal,
      });
    }).catch(() => {
      if (!signal.aborted) setStatus("error");
    });

    return () => {
      controller.abort();
      stopWatching?.();
      landmarker?.close();
      setStatus("loading");
    };
  }, [ready, videoRef]);

  return status;
}
