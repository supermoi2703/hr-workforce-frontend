import { http } from "@/lib/api/http-client";

export type HealthStatus = "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN";

export type HealthResponse = {
  status: HealthStatus;
};

/** Spring Boot Actuator: không bọc ApiResponse, không cần đăng nhập. */
export function getBackendHealth(signal?: AbortSignal) {
  return http.get<HealthResponse>("/actuator/health", { envelope: false, skipAuth: true, signal });
}
