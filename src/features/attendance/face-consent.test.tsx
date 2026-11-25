import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import en from "../../../messages/en.json";
import viMessages from "../../../messages/vi.json";
import { acceptMyFaceConsent, enrollFace, getMyFaceConsent, listFaceProfiles, requestMyFaceConsentWithdrawal, revokeFace } from "./api";
import { FaceProfilesPage } from "./components/face-profiles-page";
import { MyFaceConsentPage } from "./components/my-face-consent-page";
import { attendanceKeys } from "./hooks";
import type { EmployeeFaceStatus, MyFaceConsent } from "./types";

vi.mock("@/lib/auth/auth-provider", () => ({ useCurrentUser: () => ({ user: { employeeId: "employee-an" } }) }));

const fetchMock = vi.fn<typeof fetch>();
const instant = "2026-11-25T03:30:00Z";
const notice = {
  currentVersion: 2, contentVi: "Nội dung phiên bản hai.\nĐọc tại đây.", contentEn: "Second version text.\nRead it here.",
  status: "NOT_CONSENTED", consentedVersion: null, consentedAt: null, withdrawalRequestedAt: null, withdrawnAt: null,
  canRequestWithdrawal: false,
} satisfies MyFaceConsent;
const agreed: MyFaceConsent = {
  ...notice, status: "CURRENT", consentedVersion: 2, consentedAt: instant, canRequestWithdrawal: true,
};
const pending: MyFaceConsent = {
  ...agreed, status: "WITHDRAWAL_REQUESTED", withdrawalRequestedAt: instant, canRequestWithdrawal: false,
};
const employee: EmployeeFaceStatus = {
  employeeId: "employee-an", employeeCode: "AN001", fullName: "An", officeId: "hn", status: null,
  enrolledAt: null, templateCount: 0, faceConsentStatus: "NOT_CONSENTED", canEnroll: false,
};

function response(data: unknown, status = 200, code = "OK") {
  return Response.json({ success: status < 400, code, message: code, data }, { status });
}

function renderLocalized(component: ReactNode, client: QueryClient, locale: "vi" | "en" = "en") {
  const markup = renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "vi" ? viMessages : en} timeZone="Asia/Ho_Chi_Minh" now={new Date(instant)}>
      <QueryClientProvider client={client}>{component}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  client.clear();
  return markup;
}

function selfPage(consent: MyFaceConsent, locale: "vi" | "en" = "en") {
  const client = new QueryClient();
  client.setQueryData(attendanceKeys.myFaceConsent(employee.employeeId), consent);
  return renderLocalized(<MyFaceConsentPage />, client, locale);
}

function hrPage(rows: EmployeeFaceStatus[], withdrawalOnly = false, locale: "vi" | "en" = "en") {
  const client = new QueryClient();
  client.setQueryData(attendanceKeys.faceProfiles(undefined, 0, 20, withdrawalOnly), { content: rows, totalPages: 1 });
  return renderLocalized(<FaceProfilesPage withdrawalOnly={withdrawalOnly} />, client, locale);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

it("CS-1 hiển thị nguyên văn đúng ngôn ngữ và đồng ý với phiên bản đang đọc", async () => {
  for (const locale of ["en", "vi"] as const) {
    const markup = selfPage(notice, locale);
    const content = locale === "vi" ? notice.contentVi : notice.contentEn;
    expect(markup).toContain(content);
    expect(markup).not.toContain(locale === "vi" ? notice.contentEn : notice.contentVi);
    expect(markup).toContain(locale === "vi" ? "Phiên bản đồng ý 2" : "Consent version 2");
  }

  fetchMock.mockResolvedValueOnce(response(notice)).mockResolvedValueOnce(response(agreed));
  const received = await getMyFaceConsent();
  await expect(acceptMyFaceConsent(received.currentVersion)).resolves.toEqual(agreed);
  expect(fetchMock.mock.calls[1]).toEqual(["/api/face-consents/me", expect.objectContaining({ method: "POST", body: '{"version":2}' })]);
});

it("CS-2 HR thấy nút đăng ký bị tắt khi chưa đồng ý và API trả 409 nếu quyền vừa đổi", async () => {
  const markup = hrPage([employee]);
  expect(markup).toContain(en.Attendance.enroll.consentRequiredHint);
  expect(markup).toMatch(/<button\b[^>]*disabled=""[^>]*>[^<]*<svg[\s\S]*?<\/svg> Register<\/button>/);
  fetchMock.mockResolvedValueOnce(response(null, 409, "CONSENT_REQUIRED"));
  await expect(enrollFace(employee.employeeId, [new Blob(["photo"])] )).rejects.toMatchObject({ status: 409, code: "CONSENT_REQUIRED" });
});

it("CS-3 sau khi nhân viên tự đồng ý HR được đăng ký và chỉ gửi ảnh", async () => {
  const markup = hrPage([{ ...employee, faceConsentStatus: "CURRENT", canEnroll: true }]);
  expect(markup).toContain(en.FaceConsent.status.CURRENT);
  expect(markup).not.toContain(en.Attendance.enroll.consentRequiredHint);
  expect(markup).not.toContain('disabled=""');

  const photos = Array.from({ length: 3 }, (_, i) => new Blob([`photo-${i}`], { type: "image/jpeg" }));
  fetchMock.mockResolvedValueOnce(response({ employeeId: employee.employeeId, status: "ACTIVE" }, 201));
  await expect(enrollFace(employee.employeeId, photos)).resolves.toMatchObject({ status: "ACTIVE" });
  const [path, request] = fetchMock.mock.calls[0];
  expect(path).toBe(`/api/face-profiles/${employee.employeeId}`);
  const form = request?.body as FormData;
  expect([...form.keys()]).toEqual(["photos", "photos", "photos"]);
  expect(form.getAll("photos")).toHaveLength(3);
});

it("CS-4 xác nhận và rút đồng ý đều dùng endpoint của chính mình", async () => {
  fetchMock.mockResolvedValueOnce(response(agreed)).mockResolvedValueOnce(response(pending));
  await acceptMyFaceConsent(notice.currentVersion);
  await requestMyFaceConsentWithdrawal();
  expect(fetchMock.mock.calls.map(([path, options]) => [path, options?.body])).toEqual([
    ["/api/face-consents/me", '{"version":2}'],
    ["/api/face-consents/me/withdrawal-request", undefined],
  ]);
});

it("CS-5 giao diện không còn hành động xác nhận sau khi ghi nhận đồng ý", () => {
  expect(selfPage(notice)).toContain(en.FaceConsent.accept);
  const markup = selfPage(agreed);
  expect(markup).toContain(en.FaceConsent.status.CURRENT);
  expect(markup).not.toContain(`>${en.FaceConsent.accept}</button>`);
  expect(markup).toContain(en.FaceConsent.requestWithdrawal);
});

it("CS-6 giữ hồ sơ đang dùng khi phiên bản đổi, cần đồng ý phiên bản hiện hành trước khi đăng ký lại", () => {
  const profile = { ...employee, status: "ACTIVE", templateCount: 3, enrolledAt: instant, faceConsentStatus: "PREVIOUS_VERSION" } as const;
  const hr = hrPage([profile]);
  expect(hr).toContain("Registered · 3 photos");
  expect(hr).toContain(en.FaceConsent.status.PREVIOUS_VERSION);
  expect(hr).toContain(en.Attendance.enroll.consentRequiredHint);

  const self = selfPage({ ...agreed, status: "PREVIOUS_VERSION", consentedVersion: 1 });
  expect(self).toContain("Agreed to version 1");
  expect(self).toContain("Consent version 2");
  expect(self).toContain(en.FaceConsent.accept);
});

it("CS-7 rút đồng ý đưa HR vào danh sách yêu cầu và cho hoàn tất ngay cả khi chưa có ảnh", async () => {
  const pendingEmployee = { ...employee, faceConsentStatus: "WITHDRAWAL_REQUESTED" } as const;
  const link = "/attendance/face-profiles?consent=withdrawal-requested";
  const notification = { id: "notice", type: "FACE_CONSENT_WITHDRAWAL_REQUESTED", params: {}, link, readAt: null, createdAt: instant };
  for (const locale of ["en", "vi"] as const) {
    const msg = locale === "vi" ? viMessages : en;
    expect(renderLocalized(<NotificationItem notification={notification} onOpen={vi.fn()} />, new QueryClient(), locale))
      .toContain(msg.Notifications.types.FACE_CONSENT_WITHDRAWAL_REQUESTED);
  }
  expect(hrPage([employee])).toContain(`href="${link}"`);
  expect(hrPage([pendingEmployee], true)).toContain(en.Attendance.enroll.completeWithdrawal);
  expect(selfPage(pending)).toContain(en.FaceConsent.withdrawalPending);
  expect(selfPage(pending)).not.toContain(`>${en.FaceConsent.requestWithdrawal}</button>`);

  fetchMock.mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response({ content: [pendingEmployee] })).mockResolvedValueOnce(response(null));
  await expect(requestMyFaceConsentWithdrawal()).resolves.toEqual(pending);
  await listFaceProfiles(undefined, 1, 20, true);
  await revokeFace(employee.employeeId);
  expect(fetchMock.mock.calls[1][0]).toBe("/api/face-profiles?page=1&size=20&withdrawalRequested=true");
  expect(fetchMock.mock.calls[2]).toEqual([`/api/face-profiles/${employee.employeeId}`, expect.objectContaining({ method: "DELETE" })]);
});

it("CS-8 danh sách HR có cột Đồng ý và hiển thị trạng thái theo từng người", () => {
  const markup = hrPage([employee, { ...employee, employeeId: "emp-lan", fullName: "Lan", faceConsentStatus: "CURRENT", canEnroll: true }], false, "vi");
  expect(markup).toContain(`>${viMessages.Attendance.enroll.columns.consent}</th>`);
  expect(markup).toContain(viMessages.FaceConsent.status.NOT_CONSENTED);
  expect(markup).toContain(viMessages.FaceConsent.status.CURRENT);
});

it("CS-9 hồ sơ cũ còn hoạt động và hiển thị đồng ý đã ghi nhận trước đây", () => {
  const legacy = { ...employee, status: "ACTIVE", templateCount: 3, enrolledAt: instant, faceConsentStatus: "LEGACY" } as const;
  const markup = hrPage([legacy], false, "vi");
  expect(markup).toContain(viMessages.FaceConsent.status.LEGACY);
  expect(markup).toContain("Đã đăng ký · 3 ảnh");
});
