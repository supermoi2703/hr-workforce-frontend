import { describe, expect, it } from "vitest";
import { checkPassword, isPasswordValid } from "./password-policy";

describe("checkPassword (khớp PasswordPolicy của backend)", () => {
  it("đủ 8 ký tự, có chữ và số thì đạt", () => {
    expect(checkPassword("Abcdefg1")).toEqual({ length: true, letter: true, digit: true });
    expect(isPasswordValid("Abcdefg1")).toBe(true);
  });

  it("thiếu độ dài, thiếu số, thiếu chữ thì không đạt", () => {
    expect(checkPassword("Abcdef1").length).toBe(false);
    expect(checkPassword("Abcdefgh").digit).toBe(false);
    expect(checkPassword("12345678").letter).toBe(false);
    expect(isPasswordValid("12345678")).toBe(false);
  });

  it("tính độ dài tối đa theo byte UTF-8, không theo số ký tự", () => {
    expect(isPasswordValid(`a1${"x".repeat(70)}`)).toBe(true); // 72 byte
    expect(isPasswordValid(`a1${"x".repeat(71)}`)).toBe(false); // 73 byte
    // "ệ" chiếm 3 byte: 30 ký tự nhưng 88 byte → vượt 72 byte
    const vietnamese = `a1${"ệ".repeat(28)}`;
    expect(vietnamese.length).toBe(30);
    expect(checkPassword(vietnamese).length).toBe(false);
  });

  it("chữ có dấu vẫn tính là chữ cái", () => {
    expect(checkPassword("đăngnhập1").letter).toBe(true);
  });
});
