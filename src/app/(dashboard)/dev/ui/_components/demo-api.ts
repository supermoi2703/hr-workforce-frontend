import { ApiError } from "@/lib/api/errors";
import type { PageParams, PageResponse } from "@/lib/api/types";

// API giả lập cho trang /dev/ui. Feature thật gọi `http.get(...)` trong features/<domain>/api.ts.

export type DemoEmployee = {
  id: string;
  code: string;
  fullName: string;
  office: string;
  position: string;
  joinedAt: string;
  salary: number;
};

const OFFICES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];
const POSITIONS = ["Java Developer", "Frontend Developer", "Tester", "Business Analyst", "Project Manager"];
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi"];
const FIRST_NAMES = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Khánh", "Linh", "Minh", "Nam", "Phương", "Quân"];

const EMPLOYEES: DemoEmployee[] = Array.from({ length: 57 }, (_, i) => ({
  id: `emp-${i + 1}`,
  code: `NV${String(i + 1).padStart(4, "0")}`,
  fullName: `${LAST_NAMES[i % LAST_NAMES.length]} ${FIRST_NAMES[(i * 7) % FIRST_NAMES.length]}`,
  office: OFFICES[i % OFFICES.length],
  position: POSITIONS[(i * 3) % POSITIONS.length],
  joinedAt: `202${i % 6}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
  salary: 12_000_000 + ((i * 1_370_000) % 30_000_000),
}));

export type DemoMode = "normal" | "empty" | "error";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchDemoEmployees(params: PageParams, mode: DemoMode): Promise<PageResponse<DemoEmployee>> {
  await delay(500);
  if (mode === "error") {
    throw new ApiError({ status: 500, code: "INTERNAL_ERROR", message: "Simulated server error" });
  }
  const all = mode === "empty" ? [] : [...EMPLOYEES];

  const [sortField, sortDir] = (params.sort?.[0] ?? "").split(",") as [keyof DemoEmployee | "", string];
  if (sortField) {
    all.sort((a, b) => {
      const result = String(a[sortField]).localeCompare(String(b[sortField]), "vi", { numeric: true });
      return sortDir === "desc" ? -result : result;
    });
  }

  const start = params.page * params.size;
  return {
    content: all.slice(start, start + params.size),
    page: params.page,
    size: params.size,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / params.size),
  };
}

/** Giả lập POST tạo nhân viên: email đuôi @taken.com bị backend báo trùng. */
export async function createDemoEmployee(input: { fullName: string; email: string }): Promise<void> {
  await delay(600);
  if (input.email.endsWith("@taken.com")) {
    throw new ApiError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      fieldErrors: [{ field: "email", message: "Email đã được sử dụng (lỗi trả về từ backend)" }],
    });
  }
}
