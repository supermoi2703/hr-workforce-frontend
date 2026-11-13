"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { DRAG_START_PX, edgeResist, resolveSwipe, tickDelay } from "./carousel";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Người dùng bật "giảm chuyển động" của hệ điều hành: không tự chuyển tin, trượt thành đổi tức thì. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // Phía server không biết: coi là chưa bật, bản thật được đọc lại ngay khi chạy trên trình duyệt
    () => false,
  );
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Thẻ trình duyệt đang hiện. Ẩn thì tạm dừng tự chuyển, quay lại thì tiếp tục (không chuyển dồn). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
}

/**
 * Hẹn giờ chuyển tin. `enabled` false thì không hẹn (đang tạm dừng, đang kéo, chỉ một tin...). `resetKey` đổi (vd chỉ số
 * tin hiện tại) thì hẹn lại từ đầu, nên người xem luôn có đủ một chu kỳ cho mỗi tin; `enabled` bật lại (vd vừa buông tay)
 * cũng hẹn lại từ đầu. Lần hẹn đầu tiên của khối cộng độ lệch theo `blockIndex` (xem `tickDelay`).
 */
export function useAutoRotate(enabled: boolean, onTick: () => void, blockIndex: number, resetKey: unknown): void {
  const tick = useRef(onTick);
  const first = useRef(true);

  useEffect(() => {
    tick.current = onTick;
  });

  useEffect(() => {
    if (!enabled) return;
    const delay = tickDelay(blockIndex, first.current);
    first.current = false;
    const timer = setTimeout(() => tick.current(), delay);
    return () => clearTimeout(timer);
  }, [enabled, blockIndex, resetKey]);
}

/** Một lần chạm / nhấn chuột đang theo dõi (chưa chắc đã thành kéo). */
type Press = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  /** px/ms, làm mượt nhẹ để một cú giật cuối không làm sai. */
  velocity: number;
  /** Đã vượt ngưỡng và đang kéo thật. */
  dragging: boolean;
  width: number;
};

/**
 * Kéo chuột / vuốt ngón tay để đổi tin (Pointer Events: chuột, cảm ứng và bút dùng chung một đường).
 *  - Chỉ **bắt đầu kéo** khi tay dịch ngang quá `DRAG_START_PX` và ngang nhiều hơn dọc, rồi mới `setPointerCapture`. Bấm nhẹ
 *    không kéo thì liên kết bên trong vẫn nhận `click` bình thường (bắt con trỏ ngay từ đầu sẽ làm mất `click`).
 *  - Sau một lần kéo, `click` kế tiếp bị chặn một lần để không mở nhầm bài.
 *  - Dải thẻ đi theo tay (`dragX`, đã áp độ cản ở hai đầu); buông tay thì `onSwipe(chỉ số đích)` nếu đổi tin.
 * Gắn `handlers` lên khung kéo, đặt `touch-action: pan-y` để vuốt dọc vẫn cuộn trang, và đặt `draggable={false}` cho liên kết
 * và ảnh bên trong (mặc định chúng kéo thả được, làm hỏng cử chỉ).
 */
export function useSwipe({
  count,
  index,
  onSwipe,
}: {
  count: number;
  index: number;
  onSwipe: (target: number) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    suppressClick.current = false;
    if (count <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    press.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      dragging: false,
      width: event.currentTarget.clientWidth,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (!current.dragging) {
      if (Math.abs(dx) < DRAG_START_PX || Math.abs(dx) <= Math.abs(dy)) return;
      current.dragging = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const elapsed = event.timeStamp - current.lastTime;
    if (elapsed > 0) {
      current.velocity = 0.7 * ((event.clientX - current.lastX) / elapsed) + 0.3 * current.velocity;
    }
    current.lastX = event.clientX;
    current.lastTime = event.timeStamp;
    setDragX(edgeResist(dx, index, count));
  }

  function finish(event: PointerEvent<HTMLElement>, cancelled: boolean) {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    press.current = null;
    if (!current.dragging) return;

    suppressClick.current = true;
    const target = cancelled
      ? index
      : resolveSwipe({
          dx: event.clientX - current.startX,
          width: current.width,
          velocity: current.velocity,
          index,
          count,
        });
    setDragging(false);
    setDragX(0);
    if (target !== index) onSwipe(target);
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    dragX,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
      onClickCapture,
      // Chặn kéo thả gốc của trình duyệt (liên kết, ảnh) để không tranh với cử chỉ của khối
      onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    },
  };
}
