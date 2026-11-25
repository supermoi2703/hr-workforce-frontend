export type Landmark = { x: number; y: number };

// Thứ tự mỗi mắt: hai góc mắt, rồi hai cặp điểm mí trên / mí dưới.
const RIGHT_EYE = [33, 133, 160, 144, 158, 153] as const;
const LEFT_EYE = [362, 263, 385, 380, 387, 373] as const;
const OPEN_EAR = 0.24;
const CLOSED_EAR = 0.18;
const BLINK_WINDOW_MS = 3_000;
const MAX_CLOSED_MS = 650;
const MAX_FRAME_GAP_MS = 250;

export function eyeAspectRatios(face: readonly Landmark[], aspect: number) {
  function distance(first: Landmark, second: Landmark) {
    return Math.hypot((first.x - second.x) * aspect, first.y - second.y);
  }

  return [RIGHT_EYE, LEFT_EYE].map((eye) => {
    const [outer, inner, top1, bottom1, top2, bottom2] = eye.map((index) => face[index]);
    if (!outer || !inner || !top1 || !bottom1 || !top2 || !bottom2) return NaN;
    return (distance(top1, bottom1) + distance(top2, bottom2)) / (2 * distance(outer, inner));
  });
}

export function createBlinkDetector() {
  let lastOpenAt: number | null = null;
  let closedAt: number | null = null;
  let previousFrameAt: number | null = null;

  function reset() {
    lastOpenAt = null;
    closedAt = null;
    previousFrameAt = null;
  }

  function observe(faces: readonly (readonly Landmark[])[], aspect: number, now: number) {
    if (faces.length !== 1) {
      reset();
      return faces.length > 1 ? "multipleFaces" : "guide";
    }

    const eyes = eyeAspectRatios(faces[0], aspect);
    if (eyes.some((ear) => !Number.isFinite(ear))) {
      reset();
      return "guide";
    }

    if (
      (previousFrameAt !== null && now - previousFrameAt > MAX_FRAME_GAP_MS) ||
      (lastOpenAt !== null && now - lastOpenAt > BLINK_WINDOW_MS) ||
      (closedAt !== null && now - closedAt > MAX_CLOSED_MS)
    ) reset();
    previousFrameAt = now;

    if (eyes.every((ear) => ear >= OPEN_EAR)) {
      if (closedAt !== null) {
        reset();
        return "blink";
      }
      lastOpenAt = now;
    } else if (lastOpenAt !== null && eyes.every((ear) => ear <= CLOSED_EAR)) {
      closedAt ??= now;
    }
    return "guide";
  }

  return { observe, reset };
}
