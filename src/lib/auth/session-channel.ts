/**
 * Báo cho các tab khác cùng trình duyệt biết vừa đăng nhập / đăng xuất (BroadcastChannel).
 * Dùng MỘT kênh cho cả gửi và nghe trong mỗi tab: BroadcastChannel không gửi lại cho chính object đã gửi,
 * nên tab tự gửi sẽ không tự nhận.
 */
export type SessionMessage = { type: "signed-in" } | { type: "signed-out" };

const CHANNEL_NAME = "hrm-auth";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null; // server, trình duyệt quá cũ: bỏ qua
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function broadcastSession(message: SessionMessage): void {
  getChannel()?.postMessage(message);
}

/** Nghe tin từ tab khác. Trả về hàm hủy đăng ký. */
export function subscribeSession(listener: (message: SessionMessage) => void): () => void {
  const target = getChannel();
  if (!target) return () => {};
  const handler = (event: MessageEvent<SessionMessage>) => listener(event.data);
  target.addEventListener("message", handler);
  return () => target.removeEventListener("message", handler);
}
