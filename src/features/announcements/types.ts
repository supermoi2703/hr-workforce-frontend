// Kiểu dữ liệu khớp DTO của module announcement (backend README announcement mục 4).

/** Nháp chỉ người quản lý thấy → đã đăng (người nhận thấy ngay) → đã gỡ (không ai đọc được nữa). */
export const ANNOUNCEMENT_STATUSES = ["DRAFT", "PUBLISHED", "REMOVED"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/** DEPARTMENT là người của phòng ở mọi văn phòng (phòng ban không thuộc văn phòng nào). */
export const ANNOUNCEMENT_AUDIENCES = ["COMPANY", "OFFICE", "DEPARTMENT"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

/** Màu nhạt của loại bài, khớp enum CategoryColor của backend. Mỗi màu ánh xạ sang class ở categories.ts. */
export const CATEGORY_COLORS = ["SLATE", "BLUE", "GREEN", "AMBER", "ROSE", "VIOLET"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 20000;
export const MAX_CATEGORY_NAME_LENGTH = 50;

/** Loại bài gọn, kèm trong mỗi bài. */
export type CategoryRef = { id: string; name: string; color: CategoryColor };

/** Loại bài đầy đủ (trang quản lý loại). */
export type Category = CategoryRef & { sortOrder: number; active: boolean; version: number };

export type CreateCategoryInput = { name: string; color: CategoryColor; sortOrder: number };
export type UpdateCategoryInput = CreateCategoryInput & { version: number };

/** Một dòng danh sách, không có nội dung đầy đủ. */
export type AnnouncementItem = {
  id: string;
  title: string;
  /** Đoạn đầu của nội dung, backend đã bỏ ký hiệu Markdown. */
  excerpt: string;
  category: CategoryRef;
  status: AnnouncementStatus;
  pinned: boolean;
  audienceType: AnnouncementAudience;
  officeId: string | null;
  departmentId: string | null;
  /** Tên văn phòng / phòng ban nhận; null khi COMPANY. */
  audienceName: string | null;
  coverFileId: string | null;
  /** Link xem ảnh bìa, sống vài phút (kho riêng tư); null khi không có ảnh hoặc kho lỗi. */
  coverUrl: string | null;
  /** ISO. Null với nháp. */
  publishedAt: string | null;
  publishedByName: string | null;
  updatedAt: string;
};

/** Một khối loại ở trang chủ bảng tin. `total` là tổng số bài của loại mà người xem được xem ("Xem tất cả (N)"). */
export type BoardSection = { category: CategoryRef; total: number; items: AnnouncementItem[] };

/** Trang chủ bảng tin trong một lần gọi: tin nhanh (ghim trước, mọi loại) và mỗi loại đang dùng có bài một khối. */
export type AnnouncementBoard = { quickNews: AnnouncementItem[]; sections: BoardSection[] };

export type AnnouncementDetail = Omit<AnnouncementItem, "excerpt"> & {
  /** Markdown thô: hiển thị qua MarkdownContent, không render HTML. */
  content: string;
  createdAt: string;
  /** Gửi lại khi sửa; lệch nghĩa là người khác vừa sửa. */
  version: number;
};

/** Body POST /api/announcements. `officeId` bỏ trống: HR văn phòng mặc định là văn phòng mình. `coverFileId` null = không ảnh. */
export type CreateAnnouncementInput = {
  title: string;
  content: string;
  categoryId: string;
  coverFileId: string | null;
  pinned: boolean;
  audienceType: AnnouncementAudience;
  officeId: string | null;
  departmentId: string | null;
};

export type UpdateAnnouncementInput = CreateAnnouncementInput & { version: number };

export type AnnouncementFilters = {
  categoryId?: string;
  status?: AnnouncementStatus;
  q?: string;
};

// ===== Danh mục đơn vị và tải ảnh: route truyền vào (feature không import features/employees, features/files) =====

export type UnitOption = { id: string; name: string; active: boolean };

export type OrgOptions = {
  offices?: UnitOption[];
  departments?: UnitOption[];
  isPending: boolean;
};

/**
 * Tải ảnh bìa lên kho. Route ghép từ features/files: `upload` trả id file đã tải xong; `describeError` đổi lỗi tải lên
 * (loại file, dung lượng, kho lỗi...) thành câu hiển thị cho người dùng.
 */
export type CoverUploader = {
  upload: (file: File, onProgress: (percent: number) => void, signal: AbortSignal) => Promise<{ id: string }>;
  describeError: (error: unknown) => string;
};
