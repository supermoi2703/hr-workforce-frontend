/** Cách hiển thị các khóa metadata đã biết; `formatMetadata` nhận các hàm dịch để vẫn là hàm thuần (dễ test). */
export type MetadataLabels = {
  /** Nhãn của một khóa (`reason` → "Lý do"); không có bản dịch thì trả null. */
  key: (key: string) => string | null;
  /** Nhãn của một giá trị chuỗi (mã trạng thái, role, quyền, lý do...); không có thì trả null. */
  value: (value: string) => string | null;
  /** "15 phút" từ số phút. */
  minutes: (count: number) => string;
};

export type MetadataRow = { key: string; label: string; value: string };

function formatValue(value: unknown, labels: MetadataLabels): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return labels.value(value) ?? value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((item) => formatValue(item, labels)).join(", ");
  }
  return JSON.stringify(value);
}

/**
 * Metadata của một dòng nhật ký → các dòng nhãn – giá trị dễ đọc. Khóa đã biết có nhãn và cách hiện riêng
 * (vd retryAfterSeconds → "15 phút"); khóa lạ hiện nguyên tên và giá trị.
 */
export function formatMetadata(metadata: Record<string, unknown> | null | undefined, labels: MetadataLabels): MetadataRow[] {
  if (!metadata) return [];
  return Object.entries(metadata).map(([key, value]) => {
    const text =
      key === "retryAfterSeconds" && typeof value === "number"
        ? labels.minutes(Math.max(1, Math.ceil(value / 60)))
        : formatValue(value, labels);
    return { key, label: labels.key(key) ?? key, value: text };
  });
}
