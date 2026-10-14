import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./api/errors";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Lỗi 4xx (sai dữ liệu, không có quyền, không tìm thấy...) gọi lại cũng không khác: không retry.
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Server: mỗi lần render một client riêng. Trình duyệt: dùng chung một client để giữ cache. */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
