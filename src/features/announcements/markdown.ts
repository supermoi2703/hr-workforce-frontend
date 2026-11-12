// Cấu hình hiển thị Markdown của bài đăng. Nội dung do HR nhập nhưng vẫn coi là không tin cậy:
//  * Không bật HTML thô (react-markdown mặc định không render HTML; không thêm rehype-raw).
//  * Chặn thẻ ảnh: ảnh từ server lạ làm lộ địa chỉ IP người đọc, và bản đầu cố ý chưa có ảnh.
//  * Liên kết chỉ http(s) và mailto; javascript:, data: ... bị bỏ.

/** Thẻ không được render. */
export const DISALLOWED_ELEMENTS = ["img"];

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Trả về đường dẫn nếu an toàn, ngược lại chuỗi rỗng (liên kết bị vô hiệu). Đường dẫn tương đối (`/path`, `#neo`)
 * được giữ. Ký tự điều khiển và khoảng trắng đầu bị loại trước khi xét giao thức vì trình duyệt bỏ chúng khi phân tích
 * (`java\tscript:` vẫn là javascript:).
 */
export function safeUrl(url: string): string {
  const value = url.trim();
  if (value === "") return "";
  const compact = value.replace(/[\u0000-\u001f\u007f\s]/g, "");
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(compact);
  if (!match) return value;
  return ALLOWED_PROTOCOLS.includes(match[1].toLowerCase()) ? value : "";
}
