/**
 * Chữ cái đầu để hiện trên avatar. Tên người Việt: chữ đầu của họ + chữ đầu của tên
 * ("Nguyễn Văn An" -> "NA"). Bỏ phần trong ngoặc ("Quản trị viên (demo)" -> "QV").
 */
export function getInitials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toLocaleUpperCase("vi-VN");
}

// 8 sắc độ (hue trong OKLCH) cách đều, tránh vùng đỏ để không nhầm với trạng thái lỗi.
const AVATAR_HUES = [277, 300, 330, 60, 85, 150, 190, 230];

/**
 * Sắc màu cố định cho một người, suy ra từ id/mã nhân viên: cùng một người luôn cùng một màu
 * ở mọi màn hình, nhìn màu là nhận ra nhanh trong danh sách dài.
 */
export function getAvatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
}
