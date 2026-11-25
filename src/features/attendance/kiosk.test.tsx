import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { findNavMatch } from "@/components/shared/app-shell/navigation";
import { setAuthAdapter } from "@/lib/auth/auth-adapter";
import { canAccess } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/types";
import en from "../../../messages/en.json";
import { kioskConfirm, kioskScan, listPunches, punchWithMyFace } from "./api";
import { AttendancePage } from "./components/attendance-page";
import { usePunches } from "./hooks";
import { createKioskDevice, createOfficeIpRange, deleteOfficeIpRange, issueKioskPairingCode, listKioskDevices, listKioskOffices, listOfficeIpRanges, revokeKioskDevice } from "./kiosk-api";
import { clearKioskToken, getKioskToken, isKioskTokenRejected, pairKioskBrowser } from "./kiosk-session";
import type { Punch } from "./types";

vi.mock("@/lib/auth/auth-provider", () => ({ useCurrentUser: () => ({ hasPermission: () => false }) }));
vi.mock("./hooks", async (importOriginal) => ({
  ...await importOriginal<typeof import("./hooks")>(),
  usePunches: vi.fn(),
}));

const DEVICE_TOKEN = "kiosk-test-token";
const HR_TOKEN = "hr-test-token";
const fetchMock = vi.fn<typeof fetch>();
const refresh = vi.fn(async () => null);
const expire = vi.fn();
const image = new Blob(["photo"], { type: "image/jpeg" });

function response(data: unknown, status = 200, code = "OK") {
  return Response.json({ success: status < 400, data, code, message: code }, { status });
}

function requestAt(index: number) {
  const [path, options] = fetchMock.mock.calls[index];
  return { path, options, headers: new Headers(options?.headers) };
}

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockClear();
  expire.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  const storage = new Map<string, string>();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } }));
  setAuthAdapter({ getAccessToken: () => HR_TOKEN, refreshAccessToken: refresh, onSessionExpired: expire });
});

afterEach(() => {
  setAuthAdapter(null);
  vi.unstubAllGlobals();
});

it("KD-1 ghép mã hợp lệ và lưu token thiết bị khi đang có phiên HR", async () => {
  fetchMock.mockResolvedValueOnce(response({ token: DEVICE_TOKEN }));
  await pairKioskBrowser("  ASDF1234 ");
  expect(getKioskToken()).toBe(DEVICE_TOKEN);

  const request = requestAt(0);
  expect(request.path).toBe("/api/kiosk/pair");
  expect(request.options).toMatchObject({ credentials: "omit", method: "POST", body: JSON.stringify({ code: "ASDF1234" }) });
  expect(request.headers.has("Authorization")).toBe(false);
  expect(request.headers.has("X-Kiosk-Token")).toBe(false);
});

it.each(["KD-2 đã dùng", "KD-3 hết hạn"])("%s: từ chối mã và giữ trạng thái chưa ghép", async () => {
  fetchMock.mockResolvedValueOnce(response(null, 400, "KIOSK_PAIRING_CODE_INVALID"));
  await expect(pairKioskBrowser("ASDF1234")).rejects.toMatchObject({ code: "KIOSK_PAIRING_CODE_INVALID" });
  expect(getKioskToken()).toBeNull();
});

it.each(["scan", "confirm"])("KD-4 401 từ %s xóa token kiosk, giữ phiên HR", async (action) => {
  fetchMock.mockResolvedValueOnce(response({ token: DEVICE_TOKEN }));
  fetchMock.mockResolvedValueOnce(response(null, 401, "UNAUTHORIZED"));
  await pairKioskBrowser("ASDF1234");
  const request = action === "scan" ? kioskScan(image, DEVICE_TOKEN) : kioskConfirm("confirm-id", true, DEVICE_TOKEN);
  const failure: unknown = await request.catch((error: unknown) => error);

  expect(isKioskTokenRejected(failure)).toBe(true);
  clearKioskToken(DEVICE_TOKEN);
  expect(getKioskToken()).toBeNull();
  expect(refresh).not.toHaveBeenCalled();
  expect(expire).not.toHaveBeenCalled();
});

it("KD-4 giữ token mới nếu lỗi 401 thuộc yêu cầu của token cũ", async () => {
  fetchMock.mockResolvedValueOnce(response({ token: "new-device-token" }));
  await pairKioskBrowser("ASDF1234");
  clearKioskToken(DEVICE_TOKEN);
  expect(getKioskToken()).toBe("new-device-token");
});

it("KD-5/KD-8 quét và xác nhận chỉ gửi token kiosk, đọc ID thiết bị từ lần chấm", async () => {
  const result = { status: "RECORDED", punch: { kioskDeviceId: "kiosk-hn", outsideNetwork: false } };
  fetchMock.mockImplementation(async () => response(result));
  await expect(kioskScan(image, DEVICE_TOKEN)).resolves.toEqual(result);
  await expect(kioskConfirm("confirm-id", true, DEVICE_TOKEN)).resolves.toEqual(result);

  const scan = requestAt(0);
  expect(scan.path).toBe("/api/kiosk/scans");
  expect(scan.options?.body).toBeInstanceOf(FormData);
  const confirm = requestAt(1);
  expect(confirm.path).toBe("/api/kiosk/scans/confirm-id/confirmation");
  expect(confirm.options?.body).toBe(JSON.stringify({ accepted: true }));
  for (const request of [scan, confirm]) {
    expect(request.options?.credentials).toBe("omit");
    expect(request.headers.get("X-Kiosk-Token")).toBe(DEVICE_TOKEN);
    expect(request.headers.has("Authorization")).toBe(false);
  }
});

it("KD-6 nhận kết quả không nhận diện được mà không tạo lượt chấm", async () => {
  const result = { status: "NOT_RECOGNIZED", punch: null };
  fetchMock.mockResolvedValueOnce(response(result));
  await expect(kioskScan(image, DEVICE_TOKEN)).resolves.toEqual(result);
});

it("KD-7/IP-6 không dùng token kiosk cho lịch sử và chấm cá nhân", async () => {
  fetchMock.mockResolvedValueOnce(response({ token: DEVICE_TOKEN }));
  await pairKioskBrowser("ASDF1234");
  fetchMock.mockImplementation(async () => response(null));
  await listPunches({ from: "2026-11-01", to: "2026-11-25" });
  await punchWithMyFace(image);
  const requests = [requestAt(1), requestAt(2)];
  expect(requests[1].path).toBe("/api/attendance-punches/me");
  for (const request of requests) {
    expect(request.headers.has("X-Kiosk-Token")).toBe(false);
    expect(request.headers.get("Authorization")).toBe(`Bearer ${HR_TOKEN}`);
    expect(request.options?.credentials).toBe("same-origin");
  }
});

it("KD-9 mã ghép chỉ đến từ tạo thiết bị và cấp lại mã qua phiên HR", async () => {
  const device = { id: "kiosk-hn", name: "Lobby", officeId: "hn", status: "UNPAIRED" };
  const code = { pairingCode: "ASDF1234", expiresAt: "2026-11-25T04:00:00Z" };
  fetchMock.mockResolvedValueOnce(response([device]));
  fetchMock.mockResolvedValueOnce(response({ device, ...code }));
  fetchMock.mockResolvedValueOnce(response(code));

  await expect(listKioskDevices("hn")).resolves.toEqual([device]);
  await expect(createKioskDevice("Lobby", "hn")).resolves.toEqual({ device, ...code });
  await expect(issueKioskPairingCode(device.id)).resolves.toEqual(code);
  expect(getKioskToken()).toBeNull();
  expect(requestAt(0).path).toBe("/api/kiosk/devices?officeId=hn");
  expect(requestAt(1).options?.body).toBe(JSON.stringify({ name: "Lobby", officeId: "hn" }));
  expect(requestAt(2).path).toBe("/api/kiosk/devices/kiosk-hn/pairing-code");
  for (const index of [0, 1, 2]) expect(requestAt(index).headers.get("Authorization")).toBe(`Bearer ${HR_TOKEN}`);
});

it("KD-10 giới hạn menu bằng kiosk:manage và chuyển tiếp từ chối thu hồi khác văn phòng", async () => {
  const officeHr: CurrentUser = { id: "hr", email: "hr@example.test", displayName: "HR", status: "ACTIVE", roles: ["HR"], permissions: ["kiosk:manage"] };
  const item = findNavMatch("/attendance/kiosk")?.item;
  expect(item?.access).toEqual({ permissions: ["kiosk:manage"] });
  expect(canAccess(officeHr, item?.access)).toBe(true);
  expect(canAccess({ ...officeHr, permissions: ["attendance:kiosk"] }, item?.access)).toBe(false);

  fetchMock.mockResolvedValueOnce(response([{ id: "hn", name: "Hà Nội", code: "HN" }]));
  await expect(listKioskOffices()).resolves.toMatchObject([{ id: "hn" }]);
  fetchMock.mockResolvedValueOnce(response(null, 403, "FORBIDDEN"));
  await expect(revokeKioskDevice("kiosk-dn")).rejects.toMatchObject({ status: 403 });
  expect(requestAt(1).path).toBe("/api/kiosk/devices/kiosk-dn/revoke");
});

it("IP-1 từ chối ngoài dải IP mà không yêu cầu ghép lại thiết bị", async () => {
  fetchMock.mockResolvedValueOnce(response({ token: DEVICE_TOKEN }));
  await pairKioskBrowser("ASDF1234");
  fetchMock.mockResolvedValueOnce(response(null, 403, "KIOSK_OUTSIDE_OFFICE_NETWORK"));
  const error: unknown = await kioskScan(image, DEVICE_TOKEN).catch((failure: unknown) => failure);
  expect(error).toMatchObject({ status: 403, code: "KIOSK_OUTSIDE_OFFICE_NETWORK" });
  expect(isKioskTokenRejected(error)).toBe(false);
  expect(getKioskToken()).toBe(DEVICE_TOKEN);
});

it("quản lý dải IP theo văn phòng đã chọn", async () => {
  const range = { id: "range-id", officeId: "hn", cidr: "203.0.113.0/24", note: null };
  fetchMock.mockResolvedValueOnce(response([range]));
  fetchMock.mockResolvedValueOnce(response(range));
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await expect(listOfficeIpRanges("hn")).resolves.toEqual([range]);
  await expect(createOfficeIpRange("hn", range.cidr, null)).resolves.toEqual(range);
  await deleteOfficeIpRange("hn", range.id);
  expect(requestAt(0).path).toBe("/api/kiosk/offices/hn/ip-ranges");
  expect(requestAt(1).options?.body).toBe(JSON.stringify({ cidr: range.cidr, note: null }));
  expect(requestAt(2)).toMatchObject({ path: "/api/kiosk/offices/hn/ip-ranges/range-id", options: { method: "DELETE" } });
});

it.each([
  { id: "IP-2 AUDIT", outsideNetwork: true },
  { id: "IP-3 trong dải", outsideNetwork: false },
  { id: "IP-4 chưa khai báo dải", outsideNetwork: false },
  { id: "IP-5 OFF", outsideNetwork: false },
])("$id: nhãn lịch sử theo cờ ngoài dải IP của API", ({ outsideNetwork }) => {
  const punch: Punch = {
    id: "punch-id", employee: { id: "emp", employeeCode: "E001", fullName: "An" }, workDate: "2026-11-25",
    punchedAt: "2026-11-25T01:00:00Z", source: "KIOSK", matchScore: null, matchLevel: null,
    userConfirmed: false, photoFileId: null, outsideNetwork,
  };
  vi.mocked(usePunches).mockReturnValue({ data: { content: [punch], totalElements: 1 } } as ReturnType<typeof usePunches>);
  const client = new QueryClient();
  const markup = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}><AttendancePage /></QueryClientProvider>
    </NextIntlClientProvider>,
  );
  client.clear();
  expect(markup.includes(en.Attendance.outsideNetwork)).toBe(outsideNetwork);
});
