import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, refreshSession, setAccessToken } from "./token-store";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const user = { id: "1", email: "a@test.com", displayName: "A", status: "ACTIVE", roles: ["ADMIN"], permissions: [] };
const ok = (token: string) =>
  jsonResponse(200, {
    success: true,
    code: "OK",
    message: "Success",
    data: { accessToken: token, tokenType: "Bearer", expiresIn: 900, user },
  });
const fail = (status: number, code: string) => jsonResponse(status, { success: false, code, message: code });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("refreshSession", () => {
  it("thành công: lưu access token trong bộ nhớ", async () => {
    fetchMock.mockResolvedValueOnce(ok("token-1"));
    await expect(refreshSession()).resolves.toMatchObject({ ok: true, response: { accessToken: "token-1" } });
    expect(getAccessToken()).toBe("token-1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/refresh");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBeNull();
  });

  it("nhiều lời gọi cùng lúc chỉ gửi một request", async () => {
    fetchMock.mockResolvedValue(ok("token-1"));
    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  it("REFRESH_TOKEN_ROTATED: thử lại đúng một lần", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(fail(401, "REFRESH_TOKEN_ROTATED")).mockResolvedValueOnce(ok("token-2"));
    const result = refreshSession();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(fail(401, "REFRESH_TOKEN_ROTATED"));
    const again = refreshSession();
    await vi.runAllTimersAsync();
    await expect(again).resolves.toEqual({ ok: false, reason: "expired" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("phân loại lý do thất bại", async () => {
    setAccessToken("old");
    fetchMock.mockResolvedValueOnce(fail(401, "INVALID_REFRESH_TOKEN"));
    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: "expired" });
    expect(getAccessToken()).toBeNull();

    fetchMock.mockResolvedValueOnce(fail(403, "ACCOUNT_LOCKED"));
    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: "ACCOUNT_LOCKED" });

    fetchMock.mockResolvedValueOnce(fail(403, "ACCOUNT_DISABLED"));
    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: "ACCOUNT_DISABLED" });
  });

  it("mất mạng / backend tắt: báo network và giữ token cũ để lần sau thử lại", async () => {
    setAccessToken("old");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: "network" });
    expect(getAccessToken()).toBe("old");

    fetchMock.mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));
    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: "network" });
  });
});
