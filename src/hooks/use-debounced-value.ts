import { useEffect, useState } from "react";

/**
 * Giá trị chỉ cập nhật sau khi `value` đứng yên `delayMs` mili giây. Dùng cho ô tìm kiếm: gõ liên tục
 * không gọi API mỗi phím, chỉ gọi khi người dùng ngừng gõ.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
