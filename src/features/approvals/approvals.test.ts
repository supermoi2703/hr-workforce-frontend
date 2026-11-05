import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/errors";
import { getApprovalError, isStaleApprovalError } from "./error-messages";
import { filtersFromSearchParams, filtersToSearchParams } from "./filters";
import {
  buildNameIndex,
  getApprovalActions,
  idList,
  parseTitle,
  personLabel,
  reassignedAway,
  sourceLink,
  subjectOf,
} from "./rules";
import { commentSchema } from "./schemas";
import {
  APPROVAL_TYPES,
  REASSIGN_REASONS,
  type ApprovalDetail,
  type ApproverResponse,
  type HistoryResponse,
  type StepResponse,
} from "./types";

const ME = "me-user";
const OTHER = "other-user";

const approver = (userId: string, decision: ApproverResponse["decision"] = "PENDING"): ApproverResponse => ({
  userId,
  displayName: null,
  employeeId: null,
  decision,
  assignment: "RULE",
  comment: null,
  decidedAt: null,
});

const step = (stepNo: number, status: StepResponse["status"], approvers: ApproverResponse[]): StepResponse => ({
  stepNo,
  name: `Bước ${stepNo}`,
  rule: "DIRECT_MANAGER",
  mode: "ANY",
  status,
  startedAt: null,
  completedAt: null,
  approvers,
});

function detail(overrides: Partial<ApprovalDetail["request"]>, steps: StepResponse[]): ApprovalDetail {
  return {
    request: {
      id: "req-1",
      type: "SHIFT_CHANGE",
      refId: "ref-1",
      title: "Đăng ký giờ làm 8:30–17:30",
      summary: null,
      status: "PENDING",
      currentStepNo: 1,
      currentStepName: "Quản lý trực tiếp",
      requesterUserId: OTHER,
      requesterName: null,
      requesterEmployeeId: null,
      submittedAt: "2026-11-03T02:00:00Z",
      completedAt: null,
      ...overrides,
    },
    steps,
    watcherUserIds: [],
    timeline: [],
  };
}

const reassignedEntry = (stepNo: number, from: string[], to: string[]): HistoryResponse => ({
  action: "REASSIGNED",
  stepNo,
  actorUserId: null,
  comment: null,
  metadata: { reason: "ACCOUNT_REVOKED", fromUserIds: from, toUserIds: to },
  at: "2026-11-05T02:00:00Z",
});

describe("giao lại / người được đề xuất (1.6.1)", () => {
  it("bị giao lại đi: không còn được duyệt (NOT_REQUIRED), người mới thì được", () => {
    const d = detail({}, [step(1, "IN_PROGRESS", [approver(ME, "NOT_REQUIRED"), approver(OTHER)])]);
    expect(getApprovalActions(d, ME).canDecide).toBe(false);
    expect(getApprovalActions(d, OTHER).canDecide).toBe(true);
  });

  it("reassignedAway chỉ đánh dấu người trong fromUserIds của đúng bước", () => {
    const d = {
      ...detail({}, [step(1, "IN_PROGRESS", [approver(ME, "NOT_REQUIRED"), approver(OTHER)])]),
      timeline: [reassignedEntry(1, [ME], [OTHER])],
    };
    expect([...reassignedAway(d)]).toEqual([`1:${ME}`]);
    expect(reassignedAway(detail({}, []))).toEqual(new Set());
  });

  it("buildNameIndex gom tên người tạo, người duyệt (cả người cũ), người thực hiện; bỏ chỗ không có tên", () => {
    const d: ApprovalDetail = {
      ...detail({ requesterUserId: "req", requesterName: "Lan" }, [
        step(1, "IN_PROGRESS", [
          { ...approver(ME, "NOT_REQUIRED"), displayName: "Bình" },
          { ...approver(OTHER), displayName: "Chi" },
          approver("no-name"),
        ]),
      ]),
      timeline: [{ ...reassignedEntry(1, [ME], [OTHER]), actorUserId: "actor", actorName: "Hà" }],
    };
    const names = buildNameIndex(d);
    expect(Object.fromEntries(names)).toEqual({ req: "Lan", [ME]: "Bình", [OTHER]: "Chi", actor: "Hà" });
  });

  it("idList chỉ nhận mảng chuỗi", () => {
    expect(idList(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(idList("a")).toEqual([]);
    expect(idList(undefined)).toEqual([]);
  });

  it("subjectOf: chỉ khi đơn về người khác người tạo; backend cũ (không có trường) → null", () => {
    const base = detail({ requesterEmployeeId: "emp-lan" }, []).request;
    expect(subjectOf({ ...base, subjectEmployeeId: "emp-an", subjectName: "An" })).toEqual({ name: "An" });
    expect(subjectOf({ ...base, subjectEmployeeId: "emp-an" })).toEqual({ name: null });
    expect(subjectOf({ ...base, subjectEmployeeId: "emp-lan" })).toBeNull();
    expect(subjectOf(base)).toBeNull();
  });

  it("mọi lý do giao lại và cách giao mới đều có bản dịch", () => {
    for (const reason of REASSIGN_REASONS) expect(en.Approvals.reassignReason).toHaveProperty(reason);
    expect(en.Approvals.Detail.assignment).toHaveProperty("ESCALATED_SUBJECT_IS_APPROVER");
    expect(en.Approvals.history).toHaveProperty("REASSIGNED");
  });
});

describe("getApprovalActions", () => {
  it("người duyệt của bước hiện tại, chưa quyết định: được duyệt, không được rút", () => {
    const d = detail({}, [step(1, "IN_PROGRESS", [approver(ME)])]);
    expect(getApprovalActions(d, ME)).toEqual({ canDecide: true, canWithdraw: false });
  });

  it("đã quyết định rồi, hoặc chỉ là người duyệt của bước SAU: không được duyệt", () => {
    expect(getApprovalActions(detail({}, [step(1, "IN_PROGRESS", [approver(ME, "APPROVED")])]), ME).canDecide).toBe(false);
    const later = detail({}, [step(1, "IN_PROGRESS", [approver(OTHER)]), step(2, "WAITING", [])]);
    expect(getApprovalActions(later, ME).canDecide).toBe(false);
  });

  it("người gửi: rút được khi còn chờ, hết chờ thì không làm gì được", () => {
    const mine = detail({ requesterUserId: ME }, [step(1, "IN_PROGRESS", [approver(OTHER)])]);
    expect(getApprovalActions(mine, ME)).toEqual({ canDecide: false, canWithdraw: true });
    const closed = detail({ requesterUserId: ME, status: "APPROVED" }, [step(1, "APPROVED", [approver(ME)])]);
    expect(getApprovalActions(closed, ME)).toEqual({ canDecide: false, canWithdraw: false });
  });
});

describe("parseTitle / sourceLink / personLabel", () => {
  it("tách tiền tố [Gấp]", () => {
    expect(parseTitle("[Gấp] Nghỉ phép 1 ngày")).toEqual({ urgent: true, text: "Nghỉ phép 1 ngày" });
    expect(parseTitle("Nghỉ phép [Gấp]")).toEqual({ urgent: false, text: "Nghỉ phép [Gấp]" });
  });

  it("chỉ loại đã có trang mới có link", () => {
    expect(sourceLink("LEAVE")).toBe("/leave");
    expect(sourceLink("SHIFT_CHANGE")).toBe("/timesheets");
    expect(sourceLink("ALLOCATION")).toBeNull();
  });

  it("chính mình → me; không id → system; có tên → tên; chưa có tên → unknown", () => {
    expect(personLabel(ME, "Nguyễn Văn An", ME)).toEqual({ kind: "me" });
    expect(personLabel(null, null, ME)).toEqual({ kind: "system" });
    expect(personLabel(OTHER, "Nguyễn Văn An", ME)).toEqual({ kind: "name", name: "Nguyễn Văn An" });
    expect(personLabel(OTHER, undefined, ME)).toEqual({ kind: "unknown" });
  });
});

describe("filters", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("mặc định inbox; bỏ giá trị lạ; inbox không có lọc trạng thái", () => {
    expect(filtersFromSearchParams(params(""), false)).toEqual({ tab: "inbox", type: undefined, status: undefined });
    expect(filtersFromSearchParams(params("tab=xyz&type=FOO&status=PENDING"), false)).toEqual({
      tab: "inbox",
      type: undefined,
      status: undefined,
    });
  });

  it("tab all cần approval:read-all", () => {
    expect(filtersFromSearchParams(params("tab=all"), false).tab).toBe("inbox");
    expect(filtersFromSearchParams(params("tab=all&status=REJECTED"), true)).toEqual({
      tab: "all",
      type: undefined,
      status: "REJECTED",
    });
  });

  it("ghi ra URL gọn và đọc lại ra đúng bộ lọc cũ", () => {
    expect(filtersToSearchParams({ tab: "inbox", type: "LEAVE", status: "APPROVED" }).toString()).toBe("type=LEAVE");
    const filters = { tab: "mine" as const, type: "SHIFT_CHANGE" as const, status: "PENDING" as const };
    expect(filtersFromSearchParams(filtersToSearchParams(filters), false)).toEqual(filters);
  });
});

describe("commentSchema", () => {
  const t = createTranslator({ locale: "en", messages: en, namespace: "Approvals.Validation" });

  it("từ chối bắt buộc lý do (khoảng trắng không tính), duyệt thì không", () => {
    expect(commentSchema(t, true).safeParse({ comment: "   " }).success).toBe(false);
    expect(commentSchema(t, true).safeParse({ comment: "Thiếu người" }).success).toBe(true);
    expect(commentSchema(t, false).safeParse({ comment: "" }).success).toBe(true);
  });

  it("tối đa 1000 ký tự", () => {
    expect(commentSchema(t, false).safeParse({ comment: "a".repeat(1001) }).success).toBe(false);
  });
});

describe("getApprovalError", () => {
  const tApproval = createTranslator({ locale: "en", messages: en, namespace: "Approvals.errors" });
  const tErrors = createTranslator({ locale: "en", messages: en, namespace: "Errors" });
  const apiError = (status: number, code: string) => new ApiError({ status, code, message: code });

  it("mã lỗi của bộ máy duyệt có câu riêng; mã khác dùng câu chung", () => {
    expect(getApprovalError(apiError(409, "APPROVAL_ALREADY_DECIDED"), tApproval, tErrors)).toContain("already decided");
    expect(getApprovalError(apiError(500, "INTERNAL_ERROR"), tApproval, tErrors)).toBe(en.Errors.internal);
  });

  it("chỉ lỗi 'dữ liệu đã cũ' mới làm mới màn hình", () => {
    expect(isStaleApprovalError(apiError(409, "APPROVAL_NOT_PENDING"))).toBe(true);
    expect(isStaleApprovalError(apiError(403, "NOT_CURRENT_APPROVER"))).toBe(true);
    expect(isStaleApprovalError(apiError(400, "VALIDATION_ERROR"))).toBe(false);
  });
});

describe("bản dịch", () => {
  it("mọi loại yêu cầu đều có nhãn", () => {
    for (const type of APPROVAL_TYPES) expect(en.Approvals.types).toHaveProperty(type);
  });
});
