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

export type ChangeRow = { key: string; label: string; before: string; after: string };

/** Khóa không hiện thành dòng nhãn – giá trị ở tab Lịch sử: `changes` có cách hiện riêng, `self` đã thấy ở người thực hiện. */
const HISTORY_HIDDEN_KEYS = new Set(["changes", "self"]);

export function formatHistoryMetadata(metadata: Record<string, unknown> | null | undefined, labels: MetadataLabels) {
  if (!metadata) return [];
  return formatMetadata(Object.fromEntries(Object.entries(metadata).filter(([key]) => !HISTORY_HIDDEN_KEYS.has(key))), labels);
}

/**
 * `metadata.changes` ({trường: {before, after}}) → các dòng trước / sau. `unitName` đổi id đơn vị (officeId, departmentId,
 * teamId, positionId) thành tên; không tra được thì hiện 8 ký tự đầu của id, không in cả UUID.
 */
export function formatChanges(
  changes: unknown,
  labels: MetadataLabels,
  unitName: (field: string, id: string) => string | null | undefined,
): ChangeRow[] {
  if (changes === null || typeof changes !== "object") return [];

  const show = (field: string, value: unknown) => {
    if (typeof value === "string" && UNIT_FIELDS.has(field)) return unitName(field, value) ?? value.slice(0, 8);
    return formatValue(value, labels);
  };
  return Object.entries(changes as Record<string, { before?: unknown; after?: unknown }>).map(([field, change]) => ({
    key: field,
    label: labels.key(field) ?? field,
    before: show(field, change?.before),
    after: show(field, change?.after),
  }));
}

const UNIT_FIELDS = new Set(["officeId", "departmentId", "teamId", "positionId"]);

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
