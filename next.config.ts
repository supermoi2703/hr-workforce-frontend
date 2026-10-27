import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Đa ngôn ngữ: cấu hình theo request (đọc cookie ngôn ngữ) ở src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Backend Spring Boot. Frontend luôn gọi đường dẫn tương đối (/api/...), Next chuyển tiếp sang
// đây để frontend và backend cùng origin: không cần CORS khi dev, cookie refresh token
// (Path=/api/auth, SameSite=Strict) hoạt động bình thường.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      // Nút "Continue with Google": bắt đầu luồng OAuth2 của backend (Spring tự chuyển sang Google).
      { source: "/oauth2/:path*", destination: `${backendUrl}/oauth2/:path*` },
      { source: "/actuator/health", destination: `${backendUrl}/actuator/health` },
    ];
  },
};

export default withNextIntl(nextConfig);
