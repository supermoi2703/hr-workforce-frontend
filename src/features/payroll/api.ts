import { http } from "@/lib/api/http-client";
import type {
  CalculateResponse,
  InputCreateBody,
  InputUpdateBody,
  PayrollInput,
  PayslipDetail,
  PeriodDetail,
  PeriodRow,
  SheetResponse,
} from "./types";

const base = (month: string) => `/api/payroll/periods/${encodeURIComponent(month)}`;

export const listPeriods = (year: number) => http.get<PeriodRow[]>("/api/payroll/periods", { query: { year } });

export const getPeriod = (month: string) => http.get<PeriodDetail>(base(month));

export const openPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/open`);

export const lockPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/lock`);

export const calculatePeriod = (month: string) => http.post<CalculateResponse>(`${base(month)}/calculate`);

export const submitPeriod = (month: string, note?: string) => http.post<PeriodDetail>(`${base(month)}/submit`, { note });

export const revokeApproval = (month: string, reason: string) =>
  http.post<PeriodDetail>(`${base(month)}/revoke-approval`, { reason });

export const publishPeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/publish`);

export const closePeriod = (month: string) => http.post<PeriodDetail>(`${base(month)}/close`);

export type SheetQuery = { page: number; size: number; hasWarning?: boolean; q?: string; officeId?: string; departmentId?: string };

export const getSheet = (month: string, query: SheetQuery) =>
  http.get<SheetResponse>(`${base(month)}/payslips`, { query });

export const getPayslip = (month: string, employeeId: string) =>
  http.get<PayslipDetail>(`${base(month)}/payslips/${employeeId}`);

// ===== Khoản nhập =====

export const listInputs = (month: string, employeeId?: string, includeHistory = false) =>
  http.get<PayrollInput[]>(`${base(month)}/inputs`, { query: { employeeId, includeHistory: includeHistory || undefined } });

export const addInput = (month: string, body: InputCreateBody) => http.post<PayrollInput>(`${base(month)}/inputs`, body);

export const updateInput = (id: string, body: InputUpdateBody) => http.put<PayrollInput>(`/api/payroll/inputs/${id}`, body);

export const deleteInput = (id: string, reason: string) => http.delete<void>(`/api/payroll/inputs/${id}`, { body: { reason } });
