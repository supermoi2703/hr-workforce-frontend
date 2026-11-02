"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheckIcon, CircleHelpIcon, CircleXIcon, MaximizeIcon, MinimizeIcon, PowerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { captureSquare, useCamera, useStillnessTrigger, useWakeLock } from "../camera";
import { scorePercent } from "../daily";
import { useAttendanceErrorMessage, useKioskConfirm, useKioskScan } from "../hooks";
import type { ScanResult } from "../types";
import { CameraView } from "./camera-view";

// Thời gian hiện kết quả trước khi quay lại chờ người tiếp theo.
const RESULT_MS = 3500;

type KioskState =
  | { kind: "waiting" }
  | { kind: "processing" }
  | { kind: "result"; result: ScanResult }
  | { kind: "confirm"; result: ScanResult }
  | { kind: "error"; message: string };

/**
 * Máy chấm công ở văn phòng (docs/06 B1): camera luôn bật, ai bước vào khung và đứng yên một chút thì tự chụp
 * và gửi đi. Khớp cao → chào tên + giờ; khớp vừa → hỏi "Đây có phải bạn không?"; không nhận ra → chờ tiếp.
 */
export function KioskScreen() {
  const t = useTranslations("Attendance.kiosk");
  const errorMessage = useAttendanceErrorMessage();
  const camera = useCamera();
  const scan = useKioskScan();
  const confirm = useKioskConfirm();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<KioskState>({ kind: "waiting" });
  const [recent, setRecent] = useState<ScanResult[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  const running = camera.status === "ready";
  useWakeLock(running);

  const finish = useCallback((next: KioskState) => {
    setState(next);
    if (next.kind === "result" && (next.result.status === "RECORDED" || next.result.status === "DUPLICATE")) {
      setRecent((list) => [next.result, ...list].slice(0, 8));
      if (next.result.status === "RECORDED") beep();
    }
  }, []);

  // Không bọc useCallback: useStillnessTrigger luôn gọi bản mới nhất qua ref.
  async function onStill() {
    const video = camera.videoRef.current;
    if (!video) return;
    const image = await captureSquare(video);
    if (!image) return;
    setState({ kind: "processing" });
    try {
      const result = await scan.mutateAsync(image);
      finish(result.status === "CONFIRM_REQUIRED" ? { kind: "confirm", result } : { kind: "result", result });
    } catch (error) {
      finish({ kind: "error", message: errorMessage(error) });
    }
  }

  // Chỉ nghe "đứng yên" khi đang chờ người; đang xử lý / đang hỏi xác nhận thì không chụp thêm.
  useStillnessTrigger(camera.videoRef, running && state.kind === "waiting", onStill);

  useEffect(() => {
    if (state.kind !== "result" && state.kind !== "error") return;
    const timer = window.setTimeout(() => setState({ kind: "waiting" }), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function answer(accepted: boolean) {
    if (state.kind !== "confirm" || !state.result.confirmationId) return;
    setState({ kind: "processing" });
    try {
      finish({ kind: "result", result: await confirm.mutateAsync({ confirmationId: state.result.confirmationId, accepted }) });
    } catch (error) {
      finish({ kind: "error", message: errorMessage(error) });
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen();
  }

  return (
    <>
      {!fullscreen && <PageHeader title={t("title")} description={t("description")} />}
      <div
        ref={containerRef}
        className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]", fullscreen && "h-svh items-center bg-background p-6")}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
          <CameraView
            videoRef={camera.videoRef}
            status={camera.status}
            error={camera.error}
            overlay={running && <KioskOverlay state={state} onAnswer={answer} />}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {running ? (
              <Button variant="outline" onClick={camera.stop}>
                <PowerIcon /> {t("stop")}
              </Button>
            ) : (
              <Button onClick={camera.start} disabled={camera.status === "starting"}>
                <PowerIcon /> {t("start")}
              </Button>
            )}
            <Button variant="outline" onClick={toggleFullscreen}>
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />} {fullscreen ? t("exitFullscreen") : t("fullscreen")}
            </Button>
          </div>
          {!running && <p className="text-center text-sm text-muted-foreground">{t("idleHint")}</p>}
        </div>

        <section className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-medium">{t("recent")}</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item, index) => (
                <li key={`${item.punch?.id}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{item.employee?.fullName}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{formatTime(item.punch?.punchedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function KioskOverlay({ state, onAnswer }: { state: KioskState; onAnswer: (accepted: boolean) => void }) {
  const t = useTranslations("Attendance.kiosk");

  if (state.kind === "waiting") {
    return <OverlayBar className="bg-black/50 text-white">{t("guide")}</OverlayBar>;
  }
  if (state.kind === "processing") {
    return (
      <OverlayBar className="bg-black/60 text-white">
        <Spinner /> {t("processing")}
      </OverlayBar>
    );
  }
  if (state.kind === "error") {
    return (
      <OverlayBar className="bg-destructive text-white">
        <CircleXIcon className="size-5" aria-hidden /> {state.message}
      </OverlayBar>
    );
  }
  const { result } = state;
  if (state.kind === "confirm") {
    return (
      <div className="absolute inset-x-0 bottom-0 space-y-3 bg-warning p-4 text-center text-white">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold">
          <CircleHelpIcon className="size-6" aria-hidden /> {t("confirmQuestion", { name: result.employee?.fullName ?? "" })}
        </p>
        <p className="text-sm opacity-90">{t("score", { score: scorePercent(result.score) })}</p>
        <div className="flex justify-center gap-3">
          <Button size="lg" variant="secondary" onClick={() => onAnswer(true)}>
            {t("yes")}
          </Button>
          <Button size="lg" variant="outline" className="bg-transparent text-white" onClick={() => onAnswer(false)}>
            {t("no")}
          </Button>
        </div>
      </div>
    );
  }
  if (result.status === "NOT_RECOGNIZED") {
    return (
      <OverlayBar className="bg-destructive text-white">
        <CircleXIcon className="size-5" aria-hidden /> {t("notRecognized")}
      </OverlayBar>
    );
  }
  return (
    <div className="absolute inset-x-0 bottom-0 space-y-1 bg-success p-4 text-center text-white">
      <p className="flex items-center justify-center gap-2 text-xl font-semibold">
        <CircleCheckIcon className="size-6" aria-hidden /> {t("welcome", { name: result.employee?.fullName ?? "" })}
      </p>
      <p className="text-sm">
        {result.status === "DUPLICATE"
          ? t("duplicate", { time: formatTime(result.punch?.punchedAt) })
          : t("recordedAt", { time: formatTime(result.punch?.punchedAt) })}
        {" · "}
        {t("score", { score: scorePercent(result.score) })}
        {result.timingMs.backendTotal !== undefined && ` · ${t("timing", { ms: Math.round(result.timingMs.backendTotal) })}`}
      </p>
    </div>
  );
}

function OverlayBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4 text-center font-medium", className)}>
      {children}
    </div>
  );
}

/** Tiếng "bíp" ngắn khi chấm thành công (Web Audio, không cần file âm thanh). */
function beep() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
    oscillator.onended = () => void context.close();
  } catch {
    // Trình duyệt chặn âm thanh khi chưa có thao tác của người dùng: bỏ qua.
  }
}
