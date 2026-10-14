import type { NextConfig } from "next";

// Backend Spring Boot. Frontend luôn gọi đường dẫn tương đối (/api/...), Next chuyển tiếp sang
// đây để frontend và backend cùng origin: không cần CORS khi dev, cookie refresh token
// (Path=/api/auth, SameSite=Strict) hoạt động bình thường.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/actuator/health", destination: `${backendUrl}/actuator/health` },
    ];
  },
};

export default nextConfig;
