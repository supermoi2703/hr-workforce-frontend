# hr-workforce-frontend

Frontend của Hệ thống quản lý và điều phối nhân lực (HRM & Workforce): Next.js (App Router), TypeScript,
Tailwind CSS, shadcn/ui. Backend: repo `hr-workforce-backend`.

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## CI

Mỗi PR vào `main` được GitHub Actions tự kiểm tra (`.github/workflows/ci.yml`): lint → typecheck → test →
build, trên Linux với Node 24. Kết quả hiện ngay trong PR. Nếu CI đỏ, mở mục **Details** để xem bước nào
lỗi, sửa rồi push lại. Muốn kiểm tra trước trên máy:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Tài liệu

Xem [`docs/README.md`](docs/README.md): quy ước code và cấu trúc thư mục, quy trình git, quy tắc dùng
AI agent, và đường dẫn tới tài liệu tổng quan, phân công ở repo backend.
