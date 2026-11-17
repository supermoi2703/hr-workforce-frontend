"use client";

// Lỗi ở chính root layout (khi đó cả khung giao diện không render được). Phải tự có <html>, <body>.
// Nằm ngoài NextIntlClientProvider nên không dịch được: hiện cả tiếng Việt (mặc định) và tiếng Anh.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1>Ứng dụng gặp lỗi</h1>
          <p>Vui lòng tải lại trang.</p>
          <p lang="en">Something went wrong. Please reload the page.</p>
          {error.digest && <p>Mã lỗi / Error code: {error.digest}</p>}
          <button type="button" onClick={() => retry()}>
            Thử lại / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
