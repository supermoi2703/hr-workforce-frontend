const MAX_DIGITS = 15;

/** Chỉ giữ chữ số, bỏ số 0 ở đầu, tối đa 15 chữ số (khớp @Digits(integer = 15) của backend). */
function digitsOf(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
}

/** "15000000" → "15.000.000": chuỗi hiện trong ô nhập. Rỗng → rỗng. */
export function formatMoneyInput(value: string): string {
  return digitsOf(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "15.000.000" → 15000000; ô trống → null. */
export function parseMoney(value: string): number | null {
  const digits = digitsOf(value);
  return digits === "" ? null : Number(digits);
}

/** Số backend trả về → chuỗi trong ô nhập. */
export function moneyToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : formatMoneyInput(String(Math.trunc(value)));
}
