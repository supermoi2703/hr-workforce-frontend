import { http, toPageQuery } from "@/lib/api/http-client";
import type { PageParams, PageResponse } from "@/lib/api/types";
import type {
  ContractDetail,
  ContractFilters,
  ContractListItem,
  CreateContractInput,
  EndContractInput,
  OfficeOption,
  SalaryInput,
  UpdateContractInput,
} from "./types";

const enc = encodeURIComponent;

/** Tìm trong phạm vi dữ liệu (contract:read). Sắp xếp được: startDate (mặc định), endDate, contractNumber. Không có số tiền. */
export const searchContracts = (filters: ContractFilters & { employeeId?: string }, params: PageParams) =>
  http.get<PageResponse<ContractListItem>>("/api/contracts", {
    query: {
      ...toPageQuery(params),
      keyword: filters.keyword,
      officeId: filters.officeId,
      type: filters.type,
      state: filters.state,
      employeeId: filters.employeeId,
    },
  });

/** Sắp hết hạn, chưa có hợp đồng nối tiếp. Số ngày mặc định theo chính sách contract.expiry_warning_days. */
export const getExpiringContracts = () => http.get<ContractListItem[]>("/api/contracts/expiring");

/** Có lịch sử lương. Ngoài phạm vi → 404. */
export const getContract = (id: string) => http.get<ContractDetail>(`/api/contracts/${enc(id)}`);

/** Hợp đồng và lương của chính mình; tài khoản không có hồ sơ → 403 EMPLOYEE_PROFILE_REQUIRED. */
export const getMyContracts = () => http.get<ContractDetail[]>("/api/contracts/me");

export const createContract = (body: CreateContractInput) => http.post<ContractDetail>("/api/contracts", body);

export const updateContract = (id: string, body: UpdateContractInput) =>
  http.put<ContractDetail>(`/api/contracts/${enc(id)}`, body);

export const deleteContract = (id: string) => http.delete<void>(`/api/contracts/${enc(id)}`);

export const endContract = (id: string, body: EndContractInput) =>
  http.post<ContractDetail>(`/api/contracts/${enc(id)}/end`, body);

export const addSalary = (id: string, body: SalaryInput) =>
  http.post<ContractDetail>(`/api/contracts/${enc(id)}/salaries`, body);

export const updateSalary = (id: string, salaryId: string, body: SalaryInput) =>
  http.put<ContractDetail>(`/api/contracts/${enc(id)}/salaries/${enc(salaryId)}`, body);

export const deleteSalary = (id: string, salaryId: string) =>
  http.delete<ContractDetail>(`/api/contracts/${enc(id)}/salaries/${enc(salaryId)}`);

/** Danh mục văn phòng cho bộ lọc (feature không import features/organization nên tự gọi). */
export const getOffices = () => http.get<OfficeOption[]>("/api/offices");
