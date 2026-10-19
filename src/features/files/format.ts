/** Dung lượng dễ đọc: 512 B, 2,5 KB, 4,8 MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}
