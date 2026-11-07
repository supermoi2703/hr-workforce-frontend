import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { getProjectError, isStaleProjectError } from "./error-messages";
import {
  allocatedEmployeeIds,
  canCreateProject,
  creatableDepartments,
  currentManager,
  deadlineState,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasHiddenPercent,
  isValidPercent,
  PROJECT_CODE_PATTERN,
} from "./rules";
import type { ProjectMember, ProjectRole } from "./types";

const ID = "01a139a9-0000-7000-8000-000000000001";
const member = (role: ProjectRole, id: string, percent: number | null, toDate: string | null = null): ProjectMember => ({
  employee: { id, employeeCode: id, fullName: id },
  role,
  allocationPercent: percent,
  fromDate: "2026-01-01",
  toDate,
});

describe("isValidPercent", () => {
  it("nhận bội số của 5 từ 5 đến 100", () => {
    expect(["5", "50", "100"].every(isValidPercent)).toBe(true);
  });
  it("từ chối số ngoài khoảng, lẻ, không phải số", () => {
    expect(["", "0", "3", "105", "12", "1e1", "-5", "5.5"].some(isValidPercent)).toBe(false);
  });
});

describe("PROJECT_CODE_PATTERN", () => {
  it("khớp luật mã dự án của backend", () => {
    expect(PROJECT_CODE_PATTERN.test("HRM")).toBe(true);
    expect(PROJECT_CODE_PATTERN.test("hiring2026")).toBe(true);
    expect(PROJECT_CODE_PATTERN.test("A")).toBe(false);
    expect(PROJECT_CODE_PATTERN.test("1ABC")).toBe(false);
    expect(PROJECT_CODE_PATTERN.test("ABCDEFGHIJK")).toBe(false);
    expect(PROJECT_CODE_PATTERN.test("A-B")).toBe(false);
  });
});

describe("bộ lọc trên URL", () => {
  it("đọc rồi ghi lại không đổi", () => {
    const query = `mine=1&q=hrm&status=ACTIVE&type=ODC&departmentId=${ID}`;
    expect(filtersToSearchParams(filtersFromSearchParams(new URLSearchParams(query))).toString()).toBe(query);
  });
  it("bỏ qua giá trị lạ thay vì để backend trả 400", () => {
    const filters = filtersFromSearchParams(new URLSearchParams("status=X&type=Y&departmentId=abc&officeId=1&mine=0"));
    expect(filtersToSearchParams(filters).toString()).toBe("");
  });
});

describe("deadlineState", () => {
  const today = "2026-11-06";
  const active = (startDate: string, endDate: string | null) => ({ status: "ACTIVE" as const, startDate, endDate });

  it("chưa bắt đầu", () => {
    expect(deadlineState(active("2026-12-01", "2027-01-01"), today)).toBe("notStarted");
  });
  it("sắp hết hạn trong 14 ngày, tính cả hôm nay", () => {
    expect(deadlineState(active("2026-01-01", "2026-11-20"), today)).toBe("endingSoon");
    expect(deadlineState(active("2026-01-01", today), today)).toBe("endingSoon");
    expect(deadlineState(active("2026-01-01", "2026-11-21"), today)).toBeNull();
  });
  it("quá hạn khi đã qua ngày kết thúc mà chưa đóng", () => {
    expect(deadlineState(active("2026-01-01", "2026-11-05"), today)).toBe("overdue");
  });
  it("không có ngày kết thúc thì không cảnh báo", () => {
    expect(deadlineState(active("2026-01-01", null), today)).toBeNull();
  });
  it("dự án đã đóng không cảnh báo", () => {
    expect(deadlineState({ status: "CLOSED", startDate: "2026-01-01", endDate: "2026-02-01" }, today)).toBeNull();
  });
});

describe("phạm vi tạo dự án", () => {
  const units = [
    { id: "a", code: "A", name: "A" },
    { id: "b", code: "B", name: "B" },
  ];
  it("không có phòng nào thì không tạo được", () => {
    expect(canCreateProject(undefined)).toBe(false);
    expect(canCreateProject({ allDepartments: false, departmentIds: [] })).toBe(false);
    expect(canCreateProject({ allDepartments: false, departmentIds: ["a"] })).toBe(true);
    expect(canCreateProject({ allDepartments: true, departmentIds: [] })).toBe(true);
  });
  it("trưởng phòng chỉ chọn phòng mình, giám đốc chọn mọi phòng", () => {
    expect(creatableDepartments({ allDepartments: false, departmentIds: ["b"] }, units)).toEqual([units[1]]);
    expect(creatableDepartments({ allDepartments: true, departmentIds: [] }, units)).toEqual(units);
    expect(creatableDepartments(undefined, units)).toEqual([]);
  });
});

describe("người tham gia", () => {
  it("PM hiện tại là dòng chưa kết thúc", () => {
    const rows = [member("PM", "old", 40, "2026-08-31"), member("PM", "new", 60)];
    expect(currentManager(rows)?.employee.id).toBe("new");
  });
  it("chỉ thành viên có phân bổ bị chặn làm PM, người quan sát thì không", () => {
    expect(allocatedEmployeeIds([member("MEMBER", "m", 50), member("OBSERVER", "o", null), member("PM", "p", 50)])).toEqual(["m"]);
  });
  it("người quan sát không có % không tính là bị ẩn", () => {
    expect(hasHiddenPercent([member("OBSERVER", "o", null), member("PM", "p", 50)])).toBe(false);
    expect(hasHiddenPercent([member("MEMBER", "m", null)])).toBe(true);
  });
});

describe("lỗi dự án", () => {
  const t = ((key: string) => key) as never;
  const tErrors = ((key: string) => key) as never;
  const apiError = (code: string, message: string) => new ApiError({ status: 409, code, message });

  it("nối mã nhân viên backend liệt kê vào câu dịch", () => {
    const error = apiError("PROJECT_MEMBER_OUTSIDE_DATES", "End these allocations first: NV00013, NV00014");
    expect(getProjectError(error, t, tErrors)).toBe("memberOutsideDates NV00013, NV00014");
  });
  it("dữ liệu cũ thì cần tải lại", () => {
    expect(isStaleProjectError(apiError("STALE_VERSION", "x"))).toBe(true);
    expect(isStaleProjectError(apiError("PROJECT_CODE_EXISTS", "x"))).toBe(false);
  });
});
