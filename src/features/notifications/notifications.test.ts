import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { badgeLabel, detailOf, isSignal, messageValues, safeLink } from "./rules";
import { NOTIFICATION_TYPES, type AppNotification } from "./types";

const helpers = {
  formatDate: (value: string) => `d(${value})`,
  translateApprovalType: (type: string) => `t(${type})`,
};

const notification = (type: string, params: Record<string, unknown> = {}): AppNotification => ({
  id: "n1",
  type,
  params,
  link: null,
  readAt: null,
  createdAt: "2026-11-12T08:00:00Z",
});

describe("badgeLabel", () => {
  it("ẩn khi 0 hoặc chưa tải, quá 99 thì 99+", () => {
    expect(badgeLabel(undefined)).toBeNull();
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(7)).toBe("7");
    expect(badgeLabel(99)).toBe("99");
    expect(badgeLabel(100)).toBe("99+");
  });
});

describe("safeLink", () => {
  it("chỉ nhận đường dẫn nội bộ", () => {
    expect(safeLink("/approvals/abc")).toBe("/approvals/abc");
    expect(safeLink("/projects/DEMO?tab=members")).toBe("/projects/DEMO?tab=members");
    expect(safeLink(null)).toBeNull();
    expect(safeLink("https://evil.example")).toBeNull();
    expect(safeLink("//evil.example")).toBeNull();
    expect(safeLink("/\\evil.example")).toBeNull();
  });
});

describe("messageValues", () => {
  it("dịch loại đơn, định dạng ngày, điền — cho tham số thiếu", () => {
    expect(
      messageValues(notification("APPROVAL_COMPLETED", { approvalType: "LEAVE", title: "Nghỉ", status: "APPROVED" }), helpers),
    ).toEqual({ approvalType: "t(LEAVE)", title: "Nghỉ", status: "APPROVED" });
    expect(messageValues(notification("ALLOCATION_ENDED", { projectCode: "DEMO", lastDay: "2026-12-15" }), helpers)).toEqual({
      projectCode: "DEMO",
      lastDay: "d(2026-12-15)",
    });
    expect(messageValues(notification("SKILL_DECLARED", { skillCode: "JAVA", level: 3 }), helpers)).toEqual({
      employeeName: "—",
      skillCode: "JAVA",
      level: "3",
    });
  });

  it("loại lạ (backend mới thêm) → không tham số", () => {
    expect(messageValues(notification("SOMETHING_NEW"), helpers)).toEqual({});
  });
});

describe("detailOf", () => {
  it("lý do khi đơn kết thúc, ghi chú khi chốt kỹ năng, bỏ chuỗi trống", () => {
    expect(detailOf(notification("APPROVAL_COMPLETED", { comment: " Thiếu người " }))).toEqual({
      kind: "comment",
      text: "Thiếu người",
    });
    expect(detailOf(notification("SKILL_CONFIRMED", { note: "Chưa dẫn dự án" }))).toEqual({
      kind: "note",
      text: "Chưa dẫn dự án",
    });
    expect(detailOf(notification("APPROVAL_COMPLETED", { comment: "  " }))).toBeNull();
    expect(detailOf(notification("APPROVAL_PENDING", { comment: "x" }))).toBeNull();
  });
});

describe("isSignal", () => {
  it("chỉ nhận {unreadCount: number}", () => {
    expect(isSignal({ unreadCount: 3 })).toBe(true);
    expect(isSignal({ unreadCount: "3" })).toBe(false);
    expect(isSignal("hello")).toBe(false);
    expect(isSignal(null)).toBe(false);
  });
});

describe("câu dịch", () => {
  const sample: Record<string, unknown> = {
    approvalType: "LEAVE",
    title: "Nghỉ phép 20/11",
    status: "REJECTED",
    employeeName: "Nguyễn Thị An",
    skillCode: "JAVA",
    level: 3,
    confirmedLevel: 4,
    projectCode: "DEMO",
    lastDay: "2026-12-15",
    effectiveFrom: "2026-12-01",
    contractNumber: "HD-01",
    endDate: "2026-12-31",
    workDate: "2026-11-11",
  };

  it.each([
    ["en", en],
    ["vi", vi],
  ] as const)("mọi loại đều ghép được câu đủ tham số (%s)", (locale, messages) => {
    const t = createTranslator({ locale, messages, namespace: "Notifications" });
    for (const type of NOTIFICATION_TYPES) {
      const text = t(`types.${type}`, messageValues(notification(type, sample), helpers));
      expect(text, type).not.toContain("{");
      expect(text, type).not.toContain("Notifications.");
    }
  });

  it("trạng thái đơn chọn đúng câu", () => {
    const t = createTranslator({ locale: "vi", messages: vi, namespace: "Notifications" });
    const text = (status: string) =>
      t("types.APPROVAL_COMPLETED", messageValues(notification("APPROVAL_COMPLETED", { ...sample, status }), helpers));
    expect(text("APPROVED")).toContain("đã được duyệt");
    expect(text("REJECTED")).toContain("bị từ chối");
    expect(text("WITHDRAWN")).toContain("đã bị rút");
  });
});
