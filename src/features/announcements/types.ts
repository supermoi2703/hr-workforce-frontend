// Kiểu dữ liệu khớp DTO của module announcement (backend README announcement mục 4).

export const ANNOUNCEMENT_CATEGORIES = ["POLICY", "EVENT", "HEALTH", "OTHER"] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

/** Nháp chỉ người quản lý thấy → đã đăng (người nhận thấy ngay) → đã gỡ (không ai đọc được nữa). */
export const ANNOUNCEMENT_STATUSES = ["DRAFT", "PUBLISHED", "REMOVED"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/** DEPARTMENT là người của phòng ở mọi văn phòng (phòng ban không thuộc văn phòng nào). */
export const ANNOUNCEMENT_AUDIENCES = ["COMPANY", "OFFICE", "DEPARTMENT"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 20000;

/** Một dòng danh sách, không có nội dung đầy đủ. */
export type AnnouncementItem = {
  id: string;
  title: string;
  /** Đoạn đầu của nội dung, backend đã bỏ ký hiệu Markdown. */
  excerpt: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  pinned: boolean;
  audienceType: AnnouncementAudience;
  officeId: string | null;
  departmentId: string | null;
  /** Tên văn phòng / phòng ban nhận; null khi COMPANY. */
  audienceName: string | null;
  /** ISO. Null với nháp. */
  publishedAt: string | null;
  publishedByName: string | null;
  updatedAt: string;
};

export type AnnouncementDetail = Omit<AnnouncementItem, "excerpt"> & {
  /** Markdown thô: hiển thị qua MarkdownContent, không render HTML. */
  content: string;
  createdAt: string;
  /** Gửi lại khi sửa; lệch nghĩa là người khác vừa sửa. */
  version: number;
};

/** Body POST /api/announcements. `officeId` bỏ trống: HR văn phòng mặc định là văn phòng mình. */
export type CreateAnnouncementInput = {
  title: string;
  content: string;
  category: AnnouncementCategory;
  pinned: boolean;
  audienceType: AnnouncementAudience;
  officeId: string | null;
  departmentId: string | null;
};

export type UpdateAnnouncementInput = CreateAnnouncementInput & { version: number };

export type AnnouncementFilters = {
  category?: AnnouncementCategory;
  status?: AnnouncementStatus;
  q?: string;
};

// ===== Danh mục đơn vị: route truyền vào (feature không import features/employees) =====

export type UnitOption = { id: string; name: string; active: boolean };

export type OrgOptions = {
  offices?: UnitOption[];
  departments?: UnitOption[];
  isPending: boolean;
};
