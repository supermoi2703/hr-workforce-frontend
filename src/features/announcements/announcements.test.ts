import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { ApiError } from "@/lib/api/errors";
import { CATEGORY_COLOR_CLASSES, CATEGORY_SWATCH_CLASSES, categoryColorClass } from "./categories";
import { getAnnouncementError } from "./error-messages";
import { fitWithin, MAX_COVER_EDGE, webpName } from "./image";
import { DISALLOWED_ELEMENTS, safeUrl } from "./markdown";
import {
  audienceOptions,
  canEdit,
  canManageCategories,
  canPublish,
  canRemove,
  canTargetCompanyWide,
  categoryChoices,
  isAudienceLocked,
  isReadable,
  unitChoices,
} from "./rules";
import {
  announcementSchema,
  categorySchema,
  EMPTY_FORM,
  toCategoryFormValues,
  toCategoryRequest,
  toFormValues,
  toRequest,
  toUpdateRequest,
} from "./schemas";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUSES,
  CATEGORY_COLORS,
  type AnnouncementDetail,
  type Category,
  type CategoryRef,
} from "./types";

const tValidation = createTranslator({ locale: "en", messages: en, namespace: "Announcements.Validation" });
const tAnnouncementErrors = createTranslator({ locale: "en", messages: en, namespace: "Announcements.Errors" });
const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });

const HANOI = "office-hanoi";
const PTPM = "dept-ptpm";
const POLICY = { id: "cat-policy", name: "Chính sách", color: "BLUE" } as const;

function detail(patch: Partial<AnnouncementDetail> = {}): AnnouncementDetail {
  return {
    id: "a1",
    title: "Đổi cách tính phép",
    content: "Nội dung",
    category: POLICY,
    status: "DRAFT",
    pinned: false,
    audienceType: "OFFICE",
    officeId: HANOI,
    departmentId: null,
    audienceName: "Hà Nội",
    coverFileId: null,
    coverUrl: null,
    publishedAt: null,
    publishedByName: null,
    updatedAt: "2026-11-12T00:00:00Z",
    createdAt: "2026-11-12T00:00:00Z",
    version: 3,
    ...patch,
  };
}

describe("quyền nhắm đối tượng và quản lý loại", () => {
  it("chỉ HR_COMPANY và ADMIN nhắm cả công ty / phòng ban", () => {
    expect(canTargetCompanyWide(["ADMIN"])).toBe(true);
    expect(canTargetCompanyWide(["HR", "HR_COMPANY"])).toBe(true);
    expect(canTargetCompanyWide(["HR"])).toBe(false);
    expect(canTargetCompanyWide(["MANAGER", "EMPLOYEE"])).toBe(false);
    expect(canTargetCompanyWide(undefined)).toBe(false);
  });

  it("loại dùng chung cả công ty: HR văn phòng không quản lý, chỉ chọn khi đăng bài", () => {
    expect(canManageCategories(["HR_COMPANY"])).toBe(true);
    expect(canManageCategories(["ADMIN"])).toBe(true);
    expect(canManageCategories(["HR"])).toBe(false);
  });

  it("HR văn phòng chỉ có đối tượng OFFICE", () => {
    expect(audienceOptions(false)).toEqual(["OFFICE"]);
    expect(audienceOptions(true)).toEqual(["COMPANY", "OFFICE", "DEPARTMENT"]);
  });
});

describe("việc làm được theo trạng thái", () => {
  it("nháp: sửa, đăng, gỡ; chưa có trang đọc", () => {
    expect([canEdit("DRAFT"), canPublish("DRAFT"), canRemove("DRAFT")]).toEqual([true, true, true]);
    expect([isReadable("DRAFT"), isAudienceLocked("DRAFT")]).toEqual([false, false]);
  });

  it("đã đăng: sửa chữ, gỡ, có trang đọc, khóa đối tượng; không đăng lại", () => {
    expect([canEdit("PUBLISHED"), canPublish("PUBLISHED"), canRemove("PUBLISHED")]).toEqual([true, false, true]);
    expect([isReadable("PUBLISHED"), isAudienceLocked("PUBLISHED")]).toEqual([true, true]);
  });

  it("đã gỡ: không làm gì nữa", () => {
    expect([canEdit("REMOVED"), canPublish("REMOVED"), canRemove("REMOVED"), isReadable("REMOVED")]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("unitChoices và categoryChoices", () => {
  const units = [
    { id: "1", name: "Đang dùng", active: true },
    { id: "2", name: "Ngừng dùng", active: false },
    { id: "3", name: "Ngừng dùng khác", active: false },
  ];

  it("bỏ đơn vị ngừng dùng, trừ đơn vị đang được chọn", () => {
    expect(unitChoices(units).map((unit) => unit.id)).toEqual(["1"]);
    expect(unitChoices(units, "2").map((unit) => unit.id)).toEqual(["1", "2"]);
    expect(unitChoices(undefined)).toEqual([]);
  });

  it("loại ngừng dùng chỉ còn trong ô chọn khi bài đang mang loại đó", () => {
    const active: CategoryRef[] = [POLICY, { id: "cat-event", name: "Sự kiện", color: "GREEN" }];
    const retired: CategoryRef = { id: "cat-old", name: "Cũ", color: "SLATE" };

    expect(categoryChoices(active).map((c) => c.id)).toEqual(["cat-policy", "cat-event"]);
    expect(categoryChoices(active, retired).map((c) => c.id)).toEqual(["cat-policy", "cat-event", "cat-old"]);
    expect(categoryChoices(active, POLICY).map((c) => c.id)).toEqual(["cat-policy", "cat-event"]); // không trùng
    expect(categoryChoices(undefined)).toEqual([]);
  });
});

describe("màu của loại", () => {
  it("mọi màu đều có class nền nhạt, chấm chọn màu và tên hiển thị ở cả vi và en", () => {
    for (const color of CATEGORY_COLORS) {
      expect(CATEGORY_COLOR_CLASSES[color]).toMatch(/^bg-\w+-\d+ text-\w+-\d+ dark:bg-/);
      expect(CATEGORY_SWATCH_CLASSES[color]).toMatch(/^bg-/);
      expect(en.Announcements.Categories.colors).toHaveProperty(color);
      expect(vi.Announcements.Categories.colors).toHaveProperty(color);
    }
  });

  it("màu lạ rơi về xám thay vì mất nhãn", () => {
    expect(categoryColorClass("BLUE")).toBe(CATEGORY_COLOR_CLASSES.BLUE);
    expect(categoryColorClass("HOT_PINK")).toBe(CATEGORY_COLOR_CLASSES.SLATE);
  });
});

describe("nén ảnh bìa", () => {
  it("giữ nguyên kích thước ảnh đã nhỏ, thu nhỏ ảnh lớn theo cạnh dài và giữ tỉ lệ", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_COVER_EDGE, 900)).toEqual({ width: MAX_COVER_EDGE, height: 900 });
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("không bao giờ ra kích thước 0", () => {
    expect(fitWithin(100000, 10)).toEqual({ width: 1600, height: 1 });
  });

  it("đổi đuôi tên file thành .webp", () => {
    expect(webpName("anh-bia.jpg")).toBe("anh-bia.webp");
    expect(webpName("a.b.png")).toBe("a.b.webp");
    expect(webpName("khong-duoi")).toBe("khong-duoi.webp");
    expect(webpName("")).toBe("cover.webp");
  });
});

describe("safeUrl", () => {
  it("giữ liên kết http, https, mailto và đường dẫn tương đối", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com")).toBe("http://example.com");
    expect(safeUrl("mailto:hr@example.com")).toBe("mailto:hr@example.com");
    expect(safeUrl("/announcements/1")).toBe("/announcements/1");
    expect(safeUrl("#muc-2")).toBe("#muc-2");
  });

  it("bỏ giao thức nguy hiểm, kể cả khi giấu bằng chữ hoa hoặc ký tự điều khiển", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("JavaScript:alert(1)")).toBe("");
    expect(safeUrl("  javascript:alert(1)")).toBe("");
    expect(safeUrl("java\tscript:alert(1)")).toBe("");
    expect(safeUrl("java\nscript:alert(1)")).toBe("");
    expect(safeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe("");
    expect(safeUrl("vbscript:msgbox(1)")).toBe("");
    expect(safeUrl("file:///etc/passwd")).toBe("");
    expect(safeUrl("")).toBe("");
  });

  it("chặn thẻ ảnh trong nội dung (ảnh bìa là chỗ duy nhất có ảnh)", () => {
    expect(DISALLOWED_ELEMENTS).toContain("img");
  });
});

describe("announcementSchema", () => {
  const valid = {
    ...EMPTY_FORM,
    title: "Khám sức khỏe",
    content: "Nội dung",
    categoryId: POLICY.id,
    audienceType: "COMPANY" as const,
  };

  it("bắt buộc tiêu đề, nội dung và loại; giới hạn độ dài", () => {
    const schema = announcementSchema(tValidation, true);
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(schema.safeParse({ ...valid, content: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, content: "x".repeat(20001) }).success).toBe(false);
  });

  it("ảnh bìa không bắt buộc", () => {
    const schema = announcementSchema(tValidation, true);
    expect(schema.safeParse({ ...valid, coverFileId: "" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, coverFileId: "file-1" }).success).toBe(true);
  });

  it("người đăng toàn quyền phải chọn văn phòng / phòng ban khi nhắm loại đó", () => {
    const schema = announcementSchema(tValidation, true);
    expect(schema.safeParse({ ...valid, audienceType: "OFFICE" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, audienceType: "OFFICE", officeId: HANOI }).success).toBe(true);
    expect(schema.safeParse({ ...valid, audienceType: "DEPARTMENT" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, audienceType: "DEPARTMENT", departmentId: PTPM }).success).toBe(true);
  });

  it("HR văn phòng không có ô chọn nên không bắt chọn văn phòng", () => {
    const schema = announcementSchema(tValidation, false);
    expect(schema.safeParse({ ...valid, audienceType: "OFFICE", officeId: "" }).success).toBe(true);
  });
});

describe("toRequest", () => {
  const values = {
    ...EMPTY_FORM,
    title: " Tiêu đề ",
    content: " Nội dung ",
    categoryId: POLICY.id,
    coverFileId: "file-1",
  };

  it("HR văn phòng luôn gửi OFFICE không kèm văn phòng (backend lấy văn phòng của họ)", () => {
    expect(toRequest({ ...values, audienceType: "DEPARTMENT", officeId: "x", departmentId: PTPM }, false)).toEqual({
      title: "Tiêu đề",
      content: "Nội dung",
      categoryId: POLICY.id,
      coverFileId: "file-1",
      pinned: false,
      audienceType: "OFFICE",
      officeId: null,
      departmentId: null,
    });
  });

  it("không có ảnh thì gửi null (bỏ ảnh)", () => {
    expect(toRequest({ ...values, coverFileId: "" }, true).coverFileId).toBeNull();
  });

  it("người đăng toàn quyền chỉ gửi đơn vị của loại đã chọn", () => {
    expect(toRequest({ ...values, audienceType: "OFFICE", officeId: HANOI, departmentId: PTPM }, true)).toMatchObject({
      audienceType: "OFFICE",
      officeId: HANOI,
      departmentId: null,
    });
    expect(toRequest({ ...values, audienceType: "DEPARTMENT", officeId: HANOI, departmentId: PTPM }, true)).toMatchObject({
      audienceType: "DEPARTMENT",
      officeId: null,
      departmentId: PTPM,
    });
    expect(toRequest({ ...values, audienceType: "COMPANY", officeId: HANOI, departmentId: PTPM }, true)).toMatchObject({
      audienceType: "COMPANY",
      officeId: null,
      departmentId: null,
    });
  });
});

describe("toFormValues và toUpdateRequest", () => {
  it("điền form từ bài: loại, ảnh bìa (rỗng khi không có)", () => {
    expect(toFormValues(detail({ coverFileId: "file-9" }))).toMatchObject({ categoryId: POLICY.id, coverFileId: "file-9" });
    expect(toFormValues(detail()).coverFileId).toBe("");
  });

  it("nháp gửi đối tượng đang chọn kèm version", () => {
    const draft = detail({ status: "DRAFT" });
    const values = { ...toFormValues(draft), audienceType: "COMPANY" as const };
    expect(toUpdateRequest(values, true, draft)).toMatchObject({ audienceType: "COMPANY", version: 3 });
  });

  it("bài đã đăng gửi lại đúng đối tượng cũ, kể cả HR văn phòng không có ô chọn", () => {
    const published = detail({ status: "PUBLISHED", audienceType: "DEPARTMENT", officeId: null, departmentId: PTPM });
    const values = { ...toFormValues(published), title: "Tiêu đề mới" };
    expect(toUpdateRequest(values, false, published)).toMatchObject({
      title: "Tiêu đề mới",
      audienceType: "DEPARTMENT",
      officeId: null,
      departmentId: PTPM,
      version: 3,
    });
  });

  it("giữ nguyên ảnh bìa khi sửa chữ (gửi lại đúng id cũ)", () => {
    const published = detail({ status: "PUBLISHED", coverFileId: "file-9" });
    expect(toUpdateRequest(toFormValues(published), true, published).coverFileId).toBe("file-9");
  });
});

describe("loại bài: schema và body", () => {
  const schema = categorySchema(tValidation);

  it("bắt buộc tên, tối đa 50 ký tự, màu trong danh sách, thứ tự là số nguyên", () => {
    expect(schema.safeParse({ name: "Đào tạo", color: "VIOLET", sortOrder: "10" }).success).toBe(true);
    expect(schema.safeParse({ name: "  ", color: "VIOLET", sortOrder: "10" }).success).toBe(false);
    expect(schema.safeParse({ name: "x".repeat(51), color: "VIOLET", sortOrder: "10" }).success).toBe(false);
    expect(schema.safeParse({ name: "Đào tạo", color: "HOT_PINK", sortOrder: "10" }).success).toBe(false);
    expect(schema.safeParse({ name: "Đào tạo", color: "VIOLET", sortOrder: "1.5" }).success).toBe(false);
    expect(schema.safeParse({ name: "Đào tạo", color: "VIOLET", sortOrder: "" }).success).toBe(false);
    expect(schema.safeParse({ name: "Đào tạo", color: "VIOLET", sortOrder: "-5" }).success).toBe(true);
  });

  it("body gửi backend: cắt khoảng trắng, thứ tự là số", () => {
    expect(toCategoryRequest({ name: " Đào tạo ", color: "VIOLET", sortOrder: " 20 " })).toEqual({
      name: "Đào tạo",
      color: "VIOLET",
      sortOrder: 20,
    });
  });

  it("điền form từ loại có sẵn", () => {
    const category: Category = { id: "c1", name: "Sự kiện", color: "GREEN", sortOrder: 20, active: true, version: 2 };
    expect(toCategoryFormValues(category)).toEqual({ name: "Sự kiện", color: "GREEN", sortOrder: "20" });
  });
});

describe("getAnnouncementError", () => {
  const error = (code: string, status = 409) =>
    getAnnouncementError(new ApiError({ status, code, message: code }), tAnnouncementErrors, tErrors);

  it("dữ liệu cũ thì tải lại danh sách", () => {
    for (const code of [
      "ANNOUNCEMENT_NOT_FOUND",
      "ANNOUNCEMENT_INVALID_STATE",
      "ANNOUNCEMENT_VERSION_CONFLICT",
      "ANNOUNCEMENT_AUDIENCE_LOCKED",
      "ANNOUNCEMENT_CATEGORY_NOT_FOUND",
      "ANNOUNCEMENT_CATEGORY_INVALID",
    ]) {
      expect(error(code).stale).toBe(true);
    }
  });

  it("lỗi nhập liệu hiện thông báo riêng, không tải lại", () => {
    expect(error("ANNOUNCEMENT_AUDIENCE_FORBIDDEN", 403)).toEqual({
      message: en.Announcements.Errors.audienceForbidden,
      stale: false,
    });
    expect(error("ANNOUNCEMENT_AUDIENCE_INVALID", 400).stale).toBe(false);
    expect(error("ANNOUNCEMENT_COVER_INVALID", 400)).toEqual({
      message: en.Announcements.Errors.coverInvalid,
      stale: false,
    });
    expect(error("ANNOUNCEMENT_CATEGORY_NAME_EXISTS")).toEqual({
      message: en.Announcements.Errors.categoryNameExists,
      stale: false,
    });
    expect(error("ANNOUNCEMENT_CATEGORY_FORBIDDEN", 403).stale).toBe(false);
  });
});

describe("bản dịch", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    value !== null && typeof value === "object"
      ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}${key}.`))
      : [prefix];

  it("vi và en có cùng bộ khóa của namespace Announcements", () => {
    expect(keys(vi.Announcements).sort()).toEqual(keys(en.Announcements).sort());
  });

  it("mọi trạng thái, đối tượng đều có nhãn", () => {
    for (const status of ANNOUNCEMENT_STATUSES) {
      expect(en.Announcements.statuses).toHaveProperty(status);
      expect(vi.Announcements.statuses).toHaveProperty(status);
    }
    for (const audience of ANNOUNCEMENT_AUDIENCES) {
      expect(en.Announcements.audiences).toHaveProperty(audience);
      expect(vi.Announcements.audiences).toHaveProperty(audience);
    }
  });
});
