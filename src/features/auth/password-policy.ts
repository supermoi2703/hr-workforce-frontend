/**
 * Quy tắc mật khẩu, khớp PasswordPolicy của backend (module user):
 * - độ dài 8–72 BYTE UTF-8 (BCrypt bỏ qua phần vượt 72 byte; chữ có dấu tiếng Việt chiếm 2–3 byte);
 * - có ít nhất 1 chữ cái và 1 chữ số (Unicode, giống Character.isLetter / isDigit của Java).
 * Backend vẫn kiểm tra lại (WEAK_PASSWORD); ở đây để báo sớm và hiện danh sách yêu cầu.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordChecks = {
  /** Đủ dài và không vượt 72 byte. */
  length: boolean;
  letter: boolean;
  digit: boolean;
};

const encoder = new TextEncoder();

export function checkPassword(password: string): PasswordChecks {
  const bytes = encoder.encode(password).length;
  return {
    length: password.length >= PASSWORD_MIN_LENGTH && bytes <= PASSWORD_MAX_BYTES,
    letter: /\p{L}/u.test(password),
    digit: /\p{Nd}/u.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const checks = checkPassword(password);
  return checks.length && checks.letter && checks.digit;
}
