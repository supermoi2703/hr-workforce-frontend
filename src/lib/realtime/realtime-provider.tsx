"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Client, type StompSubscription } from "@stomp/stompjs";
import { getAuthAdapter } from "@/lib/auth/auth-adapter";
import { useAuthMode, useCurrentUser } from "@/lib/auth/auth-provider";

/**
 * Kênh realtime dùng chung: MỘT kết nối STOMP qua WebSocket cho cả ứng dụng (backend `/ws`, module notification).
 *
 * - Chỉ dùng làm TÍN HIỆU ("có gì mới"); dữ liệu vẫn lấy qua REST. Mất kết nối thì feature tự hỏi lại theo chu kỳ.
 * - Nối THẲNG tới backend qua `NEXT_PUBLIC_WS_URL` (Vercel / rewrite của Next không chuyển tiếp WebSocket).
 *   Không khai biến này, hoặc đang ở chế độ đăng nhập giả lập, thì không nối (status "disabled").
 * - Xác thực ở frame CONNECT bằng access token lấy qua auth adapter (như HTTP client). Bị từ chối (token hết hạn) thì
 *   lần nối lại sau xin token mới trước.
 */

export type RealtimeStatus = "disabled" | "connecting" | "connected" | "disconnected";
type Handler = (body: unknown) => void;
type Subscribe = (destination: string, handler: Handler) => () => void;

const RealtimeStatusContext = createContext<RealtimeStatus>("disabled");
const RealtimeSubscribeContext = createContext<Subscribe>(() => () => {});

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
const RECONNECT_DELAY_MS = 5_000;
const HEARTBEAT_MS = 25_000;

function parseBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useCurrentUser();
  const { mode } = useAuthMode();
  const enabled = Boolean(WS_URL) && mode === "backend" && authStatus === "authenticated";
  const [status, setStatus] = useState<RealtimeStatus>("disabled");

  // Đích → các handler (giữ qua các lần nối lại); đích → subscription đang mở trên kết nối hiện tại.
  const handlers = useRef(new Map<string, Set<Handler>>());
  const subscriptions = useRef(new Map<string, StompSubscription>());
  const clientRef = useRef<Client | null>(null);

  /** Mở subscription cho đích nếu đang nối và chưa mở. */
  const ensureSubscribed = useCallback((destination: string) => {
    const client = clientRef.current;
    if (!client?.connected || subscriptions.current.has(destination)) return;
    const subscription = client.subscribe(destination, (message) => {
      const body = parseBody(message.body);
      handlers.current.get(destination)?.forEach((handler) => handler(body));
    });
    subscriptions.current.set(destination, subscription);
  }, []);

  useEffect(() => {
    if (!enabled || !WS_URL) return;
    let refreshBeforeConnect = false;
    const openSubscriptions = subscriptions.current;
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: RECONNECT_DELAY_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      beforeConnect: async (c) => {
        setStatus("connecting");
        const adapter = getAuthAdapter();
        let token = refreshBeforeConnect ? null : adapter.getAccessToken();
        if (!token) token = await adapter.refreshAccessToken();
        refreshBeforeConnect = false;
        c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        openSubscriptions.clear();
        for (const destination of handlers.current.keys()) ensureSubscribed(destination);
        setStatus("connected");
      },
      // Server từ chối CONNECT (token hết hạn / sai) hoặc lỗi giao thức: lần sau xin token mới.
      onStompError: () => {
        refreshBeforeConnect = true;
      },
      onWebSocketClose: () => {
        openSubscriptions.clear();
        setStatus("disconnected");
      },
    });
    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      openSubscriptions.clear();
      void client.deactivate();
      setStatus("disabled");
    };
  }, [enabled, ensureSubscribed]);

  const subscribe = useCallback<Subscribe>(
    (destination, handler) => {
      const set = handlers.current.get(destination) ?? new Set<Handler>();
      set.add(handler);
      handlers.current.set(destination, set);
      ensureSubscribed(destination);
      return () => {
        set.delete(handler);
        if (set.size > 0) return;
        handlers.current.delete(destination);
        subscriptions.current.get(destination)?.unsubscribe();
        subscriptions.current.delete(destination);
      };
    },
    [ensureSubscribed],
  );

  const effectiveStatus = enabled ? status : "disabled";
  return (
    <RealtimeSubscribeContext.Provider value={subscribe}>
      <RealtimeStatusContext.Provider value={effectiveStatus}>{children}</RealtimeStatusContext.Provider>
    </RealtimeSubscribeContext.Provider>
  );
}

/** Trạng thái kênh realtime: feature dùng để quyết định hỏi lại nhanh hay chậm. */
export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeStatusContext);
}

/**
 * Nghe một đích STOMP (vd `/user/queue/notifications`) trong suốt vòng đời component. `handler` luôn là bản mới nhất,
 * không cần useCallback.
 */
export function useRealtimeSubscription(destination: string, handler: Handler): void {
  const subscribe = useContext(RealtimeSubscribeContext);
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => subscribe(destination, (body) => latest.current(body)), [subscribe, destination]);
}
