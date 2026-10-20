/**
 * Trang chuyển tới sau khi đăng nhập, lấy từ `?next=`. Chỉ nhận đường dẫn trong app
 * (bắt đầu bằng "/", không phải "//" hay "/\") để không bị lợi dụng chuyển sang trang ngoài.
 */
export function safeNextPath(next?: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
