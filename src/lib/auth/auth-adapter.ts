/**
 * Chỗ cắm giữa HTTP client (lib/api) và phần đăng nhập (lib/auth).
 *
 * HTTP client không tự biết token nằm ở đâu hay refresh thế nào: nó chỉ gọi các hàm dưới đây.
 * Bản giả lập (mock) không có token. Bản đăng nhập thật đăng ký adapter của mình bằng
 * `setAuthAdapter` khi khởi động:
 * - access token giữ trong bộ nhớ JS (không localStorage, không cookie);
 * - refresh qua POST /api/auth/refresh (trình duyệt tự gửi cookie refresh_token).
 */
export interface AuthAdapter {
  /** Access token hiện tại để gắn header `Authorization: Bearer ...`, hoặc null nếu chưa có. */
  getAccessToken(): string | null;
  /**
   * Xin access token mới khi backend trả 401 TOKEN_EXPIRED.
   * Trả về token mới, hoặc null nếu phiên đã hết (refresh token hết hạn/bị thu hồi).
   */
  refreshAccessToken(): Promise<string | null>;
  /** Gọi khi phiên đăng nhập đã hết hẳn (refresh thất bại hoặc token không hợp lệ). */
  onSessionExpired(): void;
}

const noAuthAdapter: AuthAdapter = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  onSessionExpired: () => {},
};

let currentAdapter: AuthAdapter = noAuthAdapter;

export function setAuthAdapter(adapter: AuthAdapter | null): void {
  currentAdapter = adapter ?? noAuthAdapter;
}

export function getAuthAdapter(): AuthAdapter {
  return currentAdapter;
}
