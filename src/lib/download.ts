/** Lưu một Blob xuống máy người dùng (hộp thoại tải file của trình duyệt). Chỉ gọi ở client. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Firefox / Safari đọc blob bất đồng bộ sau click(): thu hồi URL ngay sẽ hủy lượt tải.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
