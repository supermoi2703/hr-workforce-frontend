/** Bỏ dấu tiếng Việt và viết thường, để gõ "phat trien" vẫn tìm ra "Phát triển". */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
