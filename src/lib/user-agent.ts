/**
 * Tên trình duyệt và hệ điều hành từ chuỗi User-Agent, đủ để người dùng nhận ra thiết bị của mình
 * ("Chrome · Windows"). Cố ý đơn giản, không thêm thư viện; không nhận ra thì trả null.
 */
export type DeviceDescription = {
  browser: string | null;
  os: string | null;
  mobile: boolean;
};

// Thứ tự quan trọng: Edge/Opera/Samsung đều chứa "Chrome", Chrome chứa "Safari".
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

// iPhone/iPad trước macOS (UA của iOS có chữ "like Mac OS X"); Android trước Linux.
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

function match(table: [RegExp, string][], userAgent: string): string | null {
  return table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

/** "Chrome · Windows"; không nhận ra gì thì trả `unknownLabel`. */
export function formatDevice(userAgent: string | null | undefined, unknownLabel: string): string {
  const { browser, os } = describeUserAgent(userAgent);
  return [browser, os].filter(Boolean).join(" · ") || unknownLabel;
}

export function describeUserAgent(userAgent: string | null | undefined): DeviceDescription {
  if (!userAgent) return { browser: null, os: null, mobile: false };
  return {
    browser: match(BROWSERS, userAgent),
    os: match(SYSTEMS, userAgent),
    mobile: /Mobi|iPhone|iPod|Android/.test(userAgent),
  };
}
