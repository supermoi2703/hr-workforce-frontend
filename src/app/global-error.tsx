"use client";

// Lỗi ở chính root layout (khi đó cả khung giao diện không render được). Phải tự có <html>, <body>.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1>Ứng dụng gặp lỗi</h1>
          <p>Vui lòng tải lại trang. {error.digest && `Mã lỗi: ${error.digest}`}</p>
          <button type="button" onClick={() => retry()}>
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
