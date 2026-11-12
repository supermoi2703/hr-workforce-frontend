// Nén ảnh bìa ngay trên trình duyệt trước khi tải lên: ảnh điện thoại vài MB còn khoảng 200–300 KB, nhẹ cho kho lưu trữ
// (gói Supabase miễn phí chỉ 1 GB) và tải nhanh hơn.

/** Cạnh dài tối đa sau khi nén. Ảnh bìa hiển thị tối đa khoảng 800px rộng nên 1600px đủ cho màn hình nét cao. */
export const MAX_COVER_EDGE = 1600;

const QUALITY = 0.82;

/** Ảnh nhỏ sẵn thì giữ nguyên: nén lại chỉ làm giảm chất lượng mà không đáng kể về dung lượng. */
const SKIP_BELOW_BYTES = 300 * 1024;

/** Kích thước sau khi thu nhỏ vừa khung `max` (giữ tỉ lệ, không phóng to, làm tròn, tối thiểu 1px). */
export function fitWithin(width: number, height: number, max: number = MAX_COVER_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Đổi đuôi tên file thành .webp. */
export function webpName(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name || "cover"}.webp`;
}

/**
 * Trả về file WebP đã thu nhỏ; không nén được (trình duyệt không hỗ trợ, ảnh hỏng) hoặc kết quả không nhẹ hơn thì trả
 * lại file gốc, nên không bao giờ làm hỏng việc tải lên. Backend vẫn kiểm tra loại file và dung lượng.
 */
export async function compressCover(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    if (width === bitmap.width && file.size <= SKIP_BELOW_BYTES && file.type === "image/webp") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], webpName(file.name), { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
