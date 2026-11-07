// Kiểu dữ liệu khớp DTO của module contract (backend README contract mục 3).

export const CONTRACT_TYPES = ["PROBATION", "FIXED_TERM", "INDEFINITE", "INTERNSHIP", "SERVICE"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

/** Suy ra từ ngày, không lưu: chưa bắt đầu / đang chạy / đã kết thúc. */
export const CONTRACT_STATES = ["UPCOMING", "ACTIVE", "ENDED"] as const;
export type ContractState = (typeof CONTRACT_STATES)[number];

/** Một dòng danh sách: KHÔNG có số tiền. Ngày "yyyy-MM-dd"; endDate là ngày cuối, tính cả ngày đó. */
export type ContractListItem = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  contractNumber: string;
  type: ContractType;
  state: ContractState;
  startDate: string;
  endDate: string | null;
};

/** Một mức lương, đồng Việt Nam, không có phần lẻ. */
export type Salary = {
  id: string;
  effectiveFrom: string;
  baseSalary: number;
  lunchAllowance: number;
  otherAllowance: number;
  insuranceSalary: number;
  reason: string | null;
  /** Có mức tạo sau cùng ngày hiệu lực thay thế, mức này không còn được dùng. */
  replaced: boolean;
  createdAt: string;
};

export type ContractDetail = {
  contract: ContractListItem;
  /** Mới nhất trước. */
  salaries: Salary[];
  version: number;
};

/** Phụ cấp null = 0; lương đóng bảo hiểm null = bằng lương cơ bản. */
export type SalaryAmounts = {
  baseSalary: number;
  lunchAllowance: number | null;
  otherAllowance: number | null;
  insuranceSalary: number | null;
};

/** Body POST /api/contracts; `salary` là mức đầu tiên, áp dụng từ startDate. */
export type CreateContractInput = {
  employeeId: string;
  contractNumber: string;
  type: ContractType;
  startDate: string;
  endDate: string | null;
  salary: SalaryAmounts;
};

/** Body PUT /api/contracts/{id}: chỉ hợp đồng chưa bắt đầu, thay cả mức đầu tiên. */
export type UpdateContractInput = Omit<CreateContractInput, "employeeId"> & { version: number };

export type EndContractInput = { endDate: string; reason: string; version: number };

export type SalaryInput = { effectiveFrom: string; amounts: SalaryAmounts; reason: string | null };

/** Bộ lọc của GET /api/contracts. Bỏ trống = không lọc. */
export type ContractFilters = {
  keyword?: string;
  officeId?: string;
  type?: ContractType;
  state?: ContractState;
};

/** Văn phòng cho bộ lọc (GET /api/offices). */
export type OfficeOption = { id: string; name: string; active: boolean };
