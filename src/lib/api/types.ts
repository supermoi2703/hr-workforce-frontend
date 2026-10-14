// Kiểu dữ liệu khớp khung phản hồi chung của backend (common/response trong hr-workforce-backend).

/** Lỗi validation của một field trong request (FieldErrorResponse). */
export type FieldError = {
  field: string;
  message: string;
};

/** Khung phản hồi thống nhất cho mọi API, cả thành công lẫn lỗi (ApiResponse<T>). */
export type ApiResponse<T> = {
  success: boolean;
  /** "OK" khi thành công, ngược lại là mã ErrorCode của backend. */
  code: string;
  message: string;
  data?: T;
  errors?: FieldError[];
  timestamp: string;
};

/** Dữ liệu phân trang (PageResponse<T>). `page` bắt đầu từ 0. */
export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** Tham số phân trang/sắp xếp theo chuẩn Spring Data: `sort=field,asc`. */
export type PageParams = {
  page: number;
  size: number;
  sort?: string[];
};
