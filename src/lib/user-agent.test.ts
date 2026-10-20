import { describe, expect, it } from "vitest";
import { describeUserAgent, formatDevice } from "./user-agent";

describe("formatDevice", () => {
  it("ghép trình duyệt · hệ điều hành; không nhận ra thì dùng nhãn thay thế", () => {
    expect(formatDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Safari/537.36", "Unknown")).toBe("Chrome · Windows");
    expect(formatDevice("curl/8.9.1", "Unknown")).toBe("Unknown");
    expect(formatDevice(null, "Unknown")).toBe("Unknown");
  });
});

describe("describeUserAgent", () => {
  it("Chrome trên Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
    expect(describeUserAgent(ua)).toEqual({ browser: "Chrome", os: "Windows", mobile: false });
  });

  it("Edge không bị nhận nhầm là Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0";
    expect(describeUserAgent(ua).browser).toBe("Edge");
  });

  it("Safari trên iPhone là iOS, không phải macOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(describeUserAgent(ua)).toEqual({ browser: "Safari", os: "iOS", mobile: true });
  });

  it("Firefox trên Linux, Chrome trên Android", () => {
    expect(describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0")).toEqual({
      browser: "Firefox",
      os: "Linux",
      mobile: false,
    });
    const android =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
    expect(describeUserAgent(android)).toEqual({ browser: "Chrome", os: "Android", mobile: true });
  });

  it("không có hoặc lạ thì trả null", () => {
    expect(describeUserAgent(null)).toEqual({ browser: null, os: null, mobile: false });
    expect(describeUserAgent("curl/8.9.1")).toEqual({ browser: null, os: null, mobile: false });
  });
});
