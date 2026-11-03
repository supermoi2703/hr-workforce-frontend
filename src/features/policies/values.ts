import {
  POLICY_MODULES,
  type DurationUnit,
  type PolicySummary,
  type PolicyValue,
  type PolicyValueType,
  type ValueStatus,
} from "./types";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Đúng dạng "HH:mm" 24 giờ, như kiểu TIME của backend ("8:30", "08:30:00" không hợp lệ). */
export function isTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Kiểu dùng để nhập / hiện giá trị. Trước khi backend có kiểu TIME, giờ lưu kiểu STRING: khóa STRING mà mọi giá trị đều
 * là "HH:mm" thì vẫn coi là TIME để có ô chọn giờ (và không gõ nhầm "8h30").
 */
export function effectiveValueType(valueType: string, values: readonly (string | null)[]): string {
  if (valueType !== "STRING") return valueType;
  const present = values.filter((value): value is string => value !== null);
  return present.length > 0 && present.every(isTime) ? "TIME" : valueType;
}

// ===== DURATION (ISO-8601 của java.time.Duration) =====

const UNIT_SECONDS: Record<DurationUnit, number> = { HOURS: 3600, MINUTES: 60, SECONDS: 1 };
const UNIT_SUFFIX: Record<DurationUnit, string> = { HOURS: "H", MINUTES: "M", SECONDS: "S" };
const DURATION_PATTERN = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/**
 * "PT2M" → { amount: 2, unit: "MINUTES" }. Chọn đơn vị lớn nhất chia hết ("PT90M" → 90 phút, "PT2H" → 2 giờ).
 * Backend lưu bằng Duration.toString nên không có ngày ("P1D" lưu thành "PT24H"). Giá trị lạ (số lẻ giây, âm) → null.
 */
export function parseIsoDuration(raw: string): { amount: number; unit: DurationUnit } | null {
  const match = DURATION_PATTERN.exec(raw.trim().toUpperCase());
  if (!match || raw.trim().toUpperCase() === "P" || raw.trim().toUpperCase() === "PT") return null;
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  if (total === 0) return { amount: 0, unit: "SECONDS" };
  const unit = (["HOURS", "MINUTES", "SECONDS"] as const).find((u) => total % UNIT_SECONDS[u] === 0) ?? "SECONDS";
  return { amount: total / UNIT_SECONDS[unit], unit };
}

/** { 2, "MINUTES" } → "PT2M". */
export function toIsoDuration(amount: number, unit: DurationUnit): string {
  return `PT${amount}${UNIT_SUFFIX[unit]}`;
}

// ===== Hiển thị =====

export type ValueLabels = {
  duration: (amount: number, unit: DurationUnit) => string;
  yes: string;
  no: string;
  number: (value: number) => string;
};

/** Giá trị thô của backend → chữ dễ đọc: "PT2M" → "2 phút", "0.62" → "0,62", "true" → "Có". Không đọc được thì hiện nguyên. */
export function formatPolicyValue(type: string, raw: string | null, labels: ValueLabels): string {
  if (raw === null || raw === "") return "—";
  switch (type as PolicyValueType) {
    case "INTEGER":
    case "DECIMAL": {
      const number = Number(raw);
      return Number.isFinite(number) ? labels.number(number) : raw;
    }
    case "BOOLEAN":
      return raw === "true" ? labels.yes : raw === "false" ? labels.no : raw;
    case "DURATION": {
      const duration = parseIsoDuration(raw);
      return duration ? labels.duration(duration.amount, duration.unit) : raw;
    }
    default:
      return raw;
  }
}

/** Khoảng cho phép của khóa số: "1 – 365", "≥ 0", "≤ 30", null nếu không giới hạn. */
export function formatRange(min: number | null, max: number | null, number: (value: number) => string): string | null {
  if (min !== null && max !== null) return `${number(min)} – ${number(max)}`;
  if (min !== null) return `≥ ${number(min)}`;
  if (max !== null) return `≤ ${number(max)}`;
  return null;
}

// ===== Lịch sử giá trị =====

export type StatusedValue = PolicyValue & { status: ValueStatus };
export type ValueGroup = { officeId: string | null; values: StatusedValue[] };

function withStatus(values: PolicyValue[], today: string): StatusedValue[] {
  let currentFound = false;
  return values.map((value) => {
    if (value.validFrom > today) return { ...value, status: "upcoming" };
    if (currentFound) return { ...value, status: "superseded" };
    currentFound = true;
    return { ...value, status: "current" };
  });
}

/**
 * Gom lịch sử theo phạm vi: toàn công ty trước, sau đó từng văn phòng. Trong mỗi phạm vi (mới nhất trước):
 * giá trị chưa tới ngày là "upcoming", giá trị mới nhất đã tới ngày là "current", các giá trị cũ hơn là "superseded".
 * Không dựa vào cờ inEffect (mọi bản cũ cũng là true). `today` là "yyyy-MM-dd" giờ Việt Nam.
 */
export function groupValues(values: PolicyValue[], today: string): { company: StatusedValue[]; offices: ValueGroup[] } {
  const byScope = new Map<string | null, PolicyValue[]>();
  for (const value of [...values].sort((a, b) => b.validFrom.localeCompare(a.validFrom))) {
    byScope.set(value.officeId, [...(byScope.get(value.officeId) ?? []), value]);
  }
  const company = withStatus(byScope.get(null) ?? [], today);
  const offices = [...byScope.entries()]
    .filter(([officeId]) => officeId !== null)
    .map(([officeId, items]) => ({ officeId, values: withStatus(items, today) }));
  return { company, offices };
}

/** Giá trị đã có cùng phạm vi + ngày hiệu lực: thêm mới sẽ ghi đè nó (nếu chưa tới ngày) hoặc bị từ chối (nếu đã tới). */
export function findSameDay(values: PolicyValue[], officeId: string | null, validFrom: string): PolicyValue | undefined {
  return values.find((value) => value.officeId === officeId && value.validFrom === validFrom);
}

// ===== Danh sách =====

/** Key dịch của một khóa trong "Policies.keys": "face.match_high" → "face_match_high". */
export function policyMessageKey(key: string): string {
  return key.replace(/[.-]/g, "_");
}

/** Gom khóa theo module theo thứ tự POLICY_MODULES; module lạ xếp cuối theo tên. Trong module giữ thứ tự của backend. */
export function groupByModule(policies: PolicySummary[]): { module: string; policies: PolicySummary[] }[] {
  const groups = new Map<string, PolicySummary[]>();
  for (const policy of policies) {
    groups.set(policy.ownerModule, [...(groups.get(policy.ownerModule) ?? []), policy]);
  }
  const rank = (module: string) => {
    const index = (POLICY_MODULES as readonly string[]).indexOf(module);
    return index === -1 ? POLICY_MODULES.length : index;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([module, items]) => ({ module, policies: items }));
}
