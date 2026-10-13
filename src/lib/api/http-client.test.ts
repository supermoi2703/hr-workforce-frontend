import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthAdapter, type AuthAdapter } from "@/lib/auth/auth-adapter";
import { ApiError } from "./errors";
import { buildUrl, http } from "./http-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const ok = (data: unknown) => jsonResponse(200, { success: true, code: "OK", message: "Success", data, timestamp: "" });
const fail = (status: number, code: string, errors?: unknown) =>
  jsonResponse(status, { success: false, code, message: code, errors, timestamp: "" });

const fetchMock = vi.fn<typeof fetch>();

function authHeaderOf(call: number): string | null {
  const init = fetchMock.mock.calls[call][1];
  return new Headers(init?.headers).get("Authorization");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  setAuthAdapter(null);
  vi.unstubAllGlobals();
});

describe("buildUrl", () => {
  it("bỏ qua giá trị rỗng và lặp key cho mảng (sort của Spring)", () => {
    expect(buildUrl("/api/employees", { page: 0, size: 20, q: "", office: undefined, sort: ["name,asc", "code,desc"] })).toBe(
      "/api/employees?page=0&size=20&sort=name%2Casc&sort=code%2Cdesc",
    );
  });
});

describe("http", () => {
  it("trả về data của ApiResponse", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "1" }));
    await expect(http.get("/api/x")).resolves.toEqual({ id: "1" });
  });

  it("ném ApiError kèm lỗi theo từng field", async () => {
    fetchMock.mockResolvedValueOnce(fail(400, "VALIDATION_ERROR", [{ field: "email", message: "bad" }]));
    const error = await http.post("/api/x", {}).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "VALIDATION_ERROR", fieldErrors: [{ field: "email", message: "bad" }] });
  });

  it("báo NETWORK_ERROR khi không kết nối được hoặc proxy trả lỗi không phải JSON", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(http.get("/api/x")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });

    fetchMock.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));
    await expect(http.get("/api/x")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 500 });
  });

  it("gửi JSON với Content-Type, gửi FormData nguyên vẹn", async () => {
    fetchMock.mockResolvedValue(ok(null));
    await http.post("/api/x", { a: 1 });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Content-Type")).toBe("application/json");
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"a":1}');

    const form = new FormData();
    await http.post("/api/upload", form);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Content-Type")).toBeNull();
    expect(fetchMock.mock.calls[1][1]?.body).toBe(form);
  });

  it("envelope: false trả nguyên JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "UP" }));
    await expect(http.get("/actuator/health", { envelope: false })).resolves.toEqual({ status: "UP" });
  });
});

describe("http với đăng nhập", () => {
  function useAdapter(overrides: Partial<AuthAdapter> = {}) {
    const adapter = {
      getAccessToken: vi.fn(() => "old-token"),
      refreshAccessToken: vi.fn(async () => "new-token"),
      onSessionExpired: vi.fn(),
      ...overrides,
    };
    setAuthAdapter(adapter);
    return adapter;
  }

  it("gắn Bearer token, skipAuth thì không gắn", async () => {
    useAdapter();
    fetchMock.mockResolvedValue(ok(null));
    await http.get("/api/x");
    await http.post("/api/auth/login", {}, { skipAuth: true });
    expect(authHeaderOf(0)).toBe("Bearer old-token");
    expect(authHeaderOf(1)).toBeNull();
  });

  it("TOKEN_EXPIRED: refresh rồi gọi lại với token mới", async () => {
    const adapter = useAdapter();
    fetchMock.mockResolvedValueOnce(fail(401, "TOKEN_EXPIRED")).mockResolvedValueOnce(ok("done"));

    await expect(http.get("/api/x")).resolves.toBe("done");
    expect(adapter.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(1)).toBe("Bearer new-token");
    expect(adapter.onSessionExpired).not.toHaveBeenCalled();
  });

  it("nhiều request cùng hết hạn chỉ refresh một lần", async () => {
    let finishRefresh: (token: string) => void = () => {};
    const adapter = useAdapter({
      refreshAccessToken: vi.fn(() => new Promise<string | null>((resolve) => (finishRefresh = resolve))),
    });
    fetchMock.mockImplementation(async (_url, init) =>
      new Headers(init?.headers).get("Authorization") === "Bearer new-token" ? ok("done") : fail(401, "TOKEN_EXPIRED"),
    );

    const requests = Promise.all([http.get("/api/a"), http.get("/api/b"), http.get("/api/c")]);
    await vi.waitFor(() => expect(adapter.refreshAccessToken).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishRefresh("new-token");

    await expect(requests).resolves.toEqual(["done", "done", "done"]);
    expect(adapter.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("refresh thất bại: báo hết phiên và ném lỗi 401", async () => {
    const adapter = useAdapter({ refreshAccessToken: vi.fn(async () => null) });
    fetchMock.mockResolvedValueOnce(fail(401, "TOKEN_EXPIRED"));

    await expect(http.get("/api/x")).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRED" });
    expect(adapter.onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("401 khác TOKEN_EXPIRED: không refresh, báo hết phiên", async () => {
    const adapter = useAdapter();
    fetchMock.mockResolvedValueOnce(fail(401, "INVALID_TOKEN"));

    await expect(http.get("/api/x")).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    expect(adapter.refreshAccessToken).not.toHaveBeenCalled();
    expect(adapter.onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
