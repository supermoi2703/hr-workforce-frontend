import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { filtersFromSearchParams, filtersToSearchParams, hasActiveFilters, toApiRange } from "./filters";
import { formatChanges, formatHistoryMetadata, formatMetadata, type MetadataLabels } from "./metadata";
import { AUDIT_ACTIONS } from "./types";

const USER_ID = "0192f0aa-1111-7222-8333-444455556666";
const params = (query: string) => new URLSearchParams(query);

describe("filtersFromSearchParams", () => {
  it("đọc đủ bộ lọc hợp lệ", () => {
    expect(
      filtersFromSearchParams(
        params(
          `action=USER_LOCKED&outcome=FAILURE&actorId=${USER_ID}&actorLabel=admin@test.com&targetType=ROLE&targetId=HR&targetLabel=HR&from=2026-10-01&to=2026-10-20`,
        ),
      ),
    ).toEqual({
      action: "USER_LOCKED",
      outcome: "FAILURE",
      actorId: USER_ID,
      actorLabel: "admin@test.com",
      targetType: "ROLE",
      targetId: "HR",
      targetLabel: "HR",
      from: "2026-10-01",
      to: "2026-10-20",
    });
  });

  it("bỏ giá trị lạ thay vì để backend trả 400", () => {
    expect(
      filtersFromSearchParams(
        params("action=DROP_TABLE&outcome=MAYBE&actorId=abc&targetType=USER&targetId=not-uuid&from=2026-02-31&to=hôm-nay"),
      ),
    ).toEqual({
      action: undefined,
      outcome: undefined,
      actorId: undefined,
      actorLabel: undefined,
      targetType: undefined,
      targetId: undefined,
      targetLabel: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it("nhãn chỉ giữ khi có id tương ứng; khoảng ngày ngược thì đổi chỗ", () => {
    const filters = filtersFromSearchParams(params("actorLabel=x&from=2026-10-20&to=2026-10-01"));
    expect(filters.actorLabel).toBeUndefined();
    expect([filters.from, filters.to]).toEqual(["2026-10-01", "2026-10-20"]);
  });

  it("lọc theo khóa chính sách (targetId không phải UUID)", () => {
    const filters = filtersFromSearchParams(params("targetType=POLICY&targetId=leave.annual_days&targetLabel=Annual leave"));
    expect(filters).toMatchObject({ targetType: "POLICY", targetId: "leave.annual_days", targetLabel: "Annual leave" });
  });

  it("ghi ra URL rồi đọc lại được đúng như cũ", () => {
    const filters = filtersFromSearchParams(params(`action=LOGIN_FAILED&targetType=USER&targetId=${USER_ID}&from=2026-10-01`));
    expect(filtersFromSearchParams(filtersToSearchParams(filters))).toEqual(filters);
    expect(filtersToSearchParams(filters).toString()).toBe(`action=LOGIN_FAILED&targetType=USER&targetId=${USER_ID}&from=2026-10-01`);
    expect(hasActiveFilters(filters)).toBe(true);
    expect(hasActiveFilters({})).toBe(false);
  });
});

describe("toApiRange", () => {
  it("ngày theo giờ Việt Nam; `to` là đầu ngày hôm sau (backend không tính mốc to)", () => {
    expect(toApiRange("2026-10-01", "2026-10-20")).toEqual({
      from: "2026-09-30T17:00:00.000Z",
      to: "2026-10-20T17:00:00.000Z",
    });
    expect(toApiRange(undefined, "2026-12-31")).toEqual({ to: "2026-12-31T17:00:00.000Z" });
    expect(toApiRange()).toEqual({});
  });
});

describe("formatMetadata", () => {
  const labels: MetadataLabels = {
    key: (key) => ({ from: "Before", to: "After", added: "Added", retryAfterSeconds: "Blocked for" })[key] ?? null,
    value: (value) => ({ ACTIVE: "Active", LOCKED: "Locked", "user:read": "View accounts" })[value] ?? null,
    minutes: (count) => `${count} min`,
  };

  it("loại đơn vị (kind) dịch riêng, không lẫn với giá trị chung cùng mã", () => {
    const withKinds: MetadataLabels = {
      ...labels,
      key: (key) => (key === "kind" ? "Unit type" : labels.key(key)),
      // Bảng giá trị chung: TEAM là phạm vi dữ liệu
      value: (value) => (value === "TEAM" ? "Subordinates" : labels.value(value)),
      unitKind: (value) => ({ TEAM: "Team", DEPARTMENT: "Department" })[value] ?? null,
    };
    expect(formatMetadata({ kind: "TEAM" }, withKinds)).toEqual([{ key: "kind", label: "Unit type", value: "Team" }]);
    // Khóa khác vẫn dùng bảng giá trị chung
    expect(formatMetadata({ scope: "TEAM" }, withKinds)[0].value).toBe("Subordinates");
    // Không có hàm unitKind (chỗ gọi cũ) → như trước
    expect(formatMetadata({ kind: "TEAM" }, labels)[0].value).toBe("TEAM");
  });

  it("nhãn khóa và giá trị đã biết", () => {
    expect(formatMetadata({ from: "ACTIVE", to: "LOCKED" }, labels)).toEqual([
      { key: "from", label: "Before", value: "Active" },
      { key: "to", label: "After", value: "Locked" },
    ]);
  });

  it("mảng quyền, số giây chặn → phút (làm tròn lên)", () => {
    expect(formatMetadata({ added: ["user:read", "audit:read"], retryAfterSeconds: 61 }, labels)).toEqual([
      { key: "added", label: "Added", value: "View accounts, audit:read" },
      { key: "retryAfterSeconds", label: "Blocked for", value: "2 min" },
    ]);
  });

  it("khóa lạ, object, rỗng", () => {
    expect(formatMetadata({ custom: { a: 1 }, empty: [], none: null }, labels)).toEqual([
      { key: "custom", label: "custom", value: '{"a":1}' },
      { key: "empty", label: "empty", value: "—" },
      { key: "none", label: "none", value: "—" },
    ]);
    expect(formatMetadata(null, labels)).toEqual([]);
  });
});

describe("lịch sử hồ sơ", () => {
  const labels: MetadataLabels = {
    key: (key) => ({ level: "Level", officeId: "Office", reason: "Reason" })[key] ?? null,
    value: (value) => ({ ACTIVE: "Active" })[value] ?? null,
    minutes: (count) => `${count} min`,
  };
  const OFFICE_ID = "0192f0aa-1111-7222-8333-444455556666";
  const unitName = (_field: string, id: string) => (id === OFFICE_ID ? "Hà Nội" : undefined);

  it("trường đổi → dòng trước / sau; id đơn vị → tên", () => {
    const changes = {
      level: { before: "JUNIOR", after: "SENIOR" },
      officeId: { before: OFFICE_ID, after: null },
    };
    expect(formatChanges(changes, labels, unitName)).toEqual([
      { key: "level", label: "Level", before: "JUNIOR", after: "SENIOR" },
      { key: "officeId", label: "Office", before: "Hà Nội", after: "—" },
    ]);
  });

  it("đơn vị không tra được hiện mã ngắn, không in cả UUID", () => {
    const changes = { officeId: { before: "aaaaaaaa-1111-7222-8333-444455556666", after: OFFICE_ID } };
    expect(formatChanges(changes, labels, unitName)[0]).toMatchObject({ before: "aaaaaaaa", after: "Hà Nội" });
  });

  it("không có changes → rỗng", () => {
    expect(formatChanges(undefined, labels, unitName)).toEqual([]);
    expect(formatChanges(null, labels, unitName)).toEqual([]);
  });

  it("dòng nhãn – giá trị bỏ changes và self", () => {
    expect(formatHistoryMetadata({ changes: {}, self: true, reason: "Sửa tay" }, labels)).toEqual([
      { key: "reason", label: "Reason", value: "Sửa tay" },
    ]);
    expect(formatHistoryMetadata(null, labels)).toEqual([]);
  });
});

describe("bản dịch hành động", () => {
  it("mọi AuditAction đều có nhãn ở cả en và vi", () => {
    expect(AUDIT_ACTIONS).toHaveLength(66);
    for (const action of AUDIT_ACTIONS) {
      expect(en.AuditActions).toHaveProperty(action);
      expect(vi.AuditActions).toHaveProperty(action);
    }
  });

  it("khóa metadata và loại đơn vị của tổ chức / dự án / phân bổ / kỹ năng có nhãn ở cả en và vi", () => {
    const keys = ["kind", "employeeId", "pm", "percent", "percentBefore", "percentAfter", "lastDay", "requestId", "selfLevel", "confirmed"];
    for (const messages of [en, vi]) {
      for (const key of keys) expect(messages.AuditLog.Meta).toHaveProperty(key);
      for (const kind of ["OFFICE", "DEPARTMENT", "TEAM", "POSITION"]) expect(messages.AuditLog.unitKinds).toHaveProperty(kind);
    }
  });
});
