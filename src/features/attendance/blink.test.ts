import { createTranslator } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import viMessages from "../../../messages/vi.json";
import { watchBlinkCapture } from "./blink-capture";
import { eyeAspectRatios, type Landmark } from "./blink";
import { captureSquare } from "./camera";

vi.mock("./camera", () => ({ captureSquare: vi.fn() }));

// Điểm mí mắt dùng cùng tọa độ chuẩn hóa như MediaPipe, trên khung video 2:1.
function faceAtLidHeight(height: number): Landmark[] {
  const face: Landmark[] = [];
  for (const [outer, inner, top1, bottom1, top2, bottom2, left] of [
    [33, 133, 160, 144, 158, 153, 0.2],
    [362, 263, 385, 380, 387, 373, 0.6],
  ]) {
    face[outer] = { x: left, y: 0.4 };
    face[inner] = { x: left + 0.1, y: 0.4 };
    face[top1] = { x: left + 0.03, y: 0.4 - height / 2 };
    face[bottom1] = { x: left + 0.03, y: 0.4 + height / 2 };
    face[top2] = { x: left + 0.07, y: 0.4 - height / 2 };
    face[bottom2] = { x: left + 0.07, y: 0.4 + height / 2 };
  }
  return face;
}

const openEyes = faceAtLidHeight(0.06);
const closedEyes = faceAtLidHeight(0.02);

function startCameraLoop() {
  let nextFrame: FrameRequestCallback | undefined;
  vi.stubGlobal("window", {
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    },
    cancelAnimationFrame: () => { nextFrame = undefined; },
  });
  vi.stubGlobal("document", { hidden: false });

  const video = { srcObject: {}, readyState: 2, currentTime: 0, videoWidth: 800, videoHeight: 400 };
  const detectForVideo = vi.fn((): { faceLandmarks: Landmark[][] } => ({ faceLandmarks: [] }));
  const report = vi.fn();
  const onCapture = vi.fn(async () => {});
  const controller = new AbortController();
  const image = new Blob(["frame"], { type: "image/jpeg" });
  vi.mocked(captureSquare).mockResolvedValue(image);
  watchBlinkCapture({
    video: video as HTMLVideoElement,
    landmarker: { detectForVideo },
    isArmed: () => true,
    report,
    onCapture,
    signal: controller.signal,
  });

  function frame(now: number, ...faceLandmarks: Landmark[][]) {
    const callback = nextFrame;
    if (!callback) throw new Error("No frame requested");
    nextFrame = undefined;
    video.currentTime = now / 1_000;
    detectForVideo.mockReturnValueOnce({ faceLandmarks });
    return callback(now);
  }

  return { report, onCapture, controller, image, video, frame };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("Chớp mắt trước khi chụp ảnh chấm công", () => {
  it("tính EAR của từng mắt từ landmark và tỷ lệ khung hình cố định", () => {
    for (const ear of eyeAspectRatios(openEyes, 2)) expect(ear).toBeCloseTo(0.3);
    for (const ear of eyeAspectRatios(closedEyes, 2)) expect(ear).toBeCloseTo(0.1);
  });

  it("BL-1 gửi đúng một ảnh khi mắt mở, nhắm rồi mở lại", async () => {
    const { frame, image, controller, onCapture } = startCameraLoop();
    await frame(0, openEyes);
    await frame(50, closedEyes);
    expect(onCapture).not.toHaveBeenCalled();

    await frame(100, openEyes);
    await frame(150, openEyes);
    expect(captureSquare).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(image, controller.signal);
  });

  it("BL-2 giữ hướng dẫn tiếng Việt và tiếng Anh, không chụp ảnh tĩnh", async () => {
    const { frame, report, onCapture } = startCameraLoop();
    for (let now = 0; now <= 4_000; now += 100) await frame(now, openEyes);
    await frame(4_100, closedEyes);
    for (let now = 4_200; now <= 5_200; now += 100) await frame(now, closedEyes);
    await frame(5_300, openEyes);

    expect(report).toHaveBeenLastCalledWith("guide");
    expect(createTranslator({ locale: "vi", messages: viMessages, namespace: "Attendance.blink" })("guide")).toMatch(/chớp mắt/i);
    expect(createTranslator({ locale: "en", messages: en, namespace: "Attendance.blink" })("guide")).toMatch(/blink/i);
    expect(captureSquare).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("BL-3 không chụp khi một mặt thứ hai xuất hiện trong lúc chớp mắt", async () => {
    const { frame, report, onCapture } = startCameraLoop();
    await frame(0, openEyes);
    await frame(50, closedEyes);
    await frame(100, openEyes, openEyes);
    expect(report).toHaveBeenLastCalledWith("multipleFaces");

    await frame(150, openEyes);
    expect(captureSquare).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it.each(["stopped", "replaced"])("không gửi ảnh nếu camera bị %s trong lúc mã hóa JPEG", async (reason) => {
    const { frame, controller, image, video, onCapture } = startCameraLoop();
    let finishEncoding!: (image: Blob) => void;
    vi.mocked(captureSquare).mockReturnValueOnce(new Promise((resolve) => { finishEncoding = resolve; }));
    await frame(0, openEyes);
    await frame(50, closedEyes);
    const capture = frame(100, openEyes);

    if (reason === "stopped") controller.abort();
    else video.srcObject = {};
    finishEncoding(image);
    await capture;
    expect(onCapture).not.toHaveBeenCalled();
  });
});
