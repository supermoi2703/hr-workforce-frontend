/**
 * Trang chuyển tới sau khi đăng nhập, lấy từ `?next=`. Chỉ nhận đường dẫn trong app
 * (bắt đầu bằng "/", không phải "//" hay "/\") để không bị lợi dụng chuyển sang trang ngoài.
 */
export function safeNextPath(next?: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

// Đăng nhập Google rời app sang backend → Google rồi quay về /auth/callback (cố định), nên `?next` bị mất.
// Giữ tạm ở sessionStorage của tab. Mỗi lần bấm nút Google đều ghi đè, nên không cần xóa sau khi dùng.
const PENDING_NEXT_KEY = "hrm.auth.next";

export function savePendingNext(next?: string | null): void {
  try {
    window.sessionStorage.setItem(PENDING_NEXT_KEY, safeNextPath(next));
  } catch {
    // Trình duyệt chặn storage: đăng nhập xong về trang chủ.
  }
}

export function readPendingNext(): string {
  try {
    return safeNextPath(window.sessionStorage.getItem(PENDING_NEXT_KEY));
  } catch {
    return "/";
  }
}
