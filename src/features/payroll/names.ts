/** Tên nếu backend có trả (không rỗng), không có thì 8 ký tự đầu của id, không có cả hai thì "—". */
export function displayName(name: string | null | undefined, id: string | null | undefined): string {
  const clean = name?.trim();
  if (clean) return clean;
  return id ? id.slice(0, 8) : "—";
}

/** "mã — họ tên"; thiếu phần nào thì hiện phần còn lại, thiếu cả hai thì id rút gọn. */
export function employeeLabel(
  code: string | null | undefined,
  fullName: string | null | undefined,
  id: string | null | undefined,
): string {
  const c = code?.trim();
  const n = fullName?.trim();
  if (c && n) return `${c} — ${n}`;
  return c || n || displayName(null, id);
}
