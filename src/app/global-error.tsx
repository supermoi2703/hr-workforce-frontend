"use client";

// Lỗi ở chính root layout (khi đó cả khung giao diện không render được). Phải tự có <html>, <body>.
// Nằm ngoài NextIntlClientProvider nên không dịch được: hiện cả tiếng Anh và tiếng Việt.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>Please reload the page.</p>
          <p lang="vi">Ứng dụng gặp lỗi. Vui lòng tải lại trang.</p>
          {error.digest && <p>Error code / Mã lỗi: {error.digest}</p>}
          <button type="button" onClick={() => retry()}>
            Try again / Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
