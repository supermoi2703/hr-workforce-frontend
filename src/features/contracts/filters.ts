import { CONTRACT_STATES, CONTRACT_TYPES, type ContractFilters, type ContractState, type ContractType } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEYWORD_LENGTH = 100;

/** Thứ tự tham số trên URL (để link gọn, ổn định). */
const KEYS = ["keyword", "officeId", "type", "state"] as const;

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Đọc bộ lọc từ URL. Giá trị lạ bị bỏ qua thay vì để backend trả 400. */
export function filtersFromSearchParams(params: { get(name: string): string | null }): ContractFilters {
  const officeId = params.get("officeId")?.trim();
  const keyword = params.get("keyword")?.trim().slice(0, MAX_KEYWORD_LENGTH);
  return {
    keyword: keyword || undefined,
    officeId: officeId && UUID_PATTERN.test(officeId) ? officeId : undefined,
    type: oneOf<ContractType>(CONTRACT_TYPES, params.get("type")),
    state: oneOf<ContractState>(CONTRACT_STATES, params.get("state")),
  };
}

/** Ghi bộ lọc ra query string (bỏ giá trị trống). */
export function filtersToSearchParams(filters: ContractFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}
