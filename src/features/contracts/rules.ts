import type { ContractDetail, ContractListItem, Salary } from "./types";

type ContractDates = Pick<ContractListItem, "state" | "startDate">;

// ===== Thao tác được phép =====

export type ContractActions = {
  /** Sửa / xóa: chỉ hợp đồng chưa bắt đầu. */
  edit: boolean;
  remove: boolean;
  /** Kết thúc sớm: chỉ hợp đồng đang chạy (chưa bắt đầu thì sửa ngày hoặc xóa). */
  end: boolean;
  /** Thêm mức lương: cả hợp đồng đã kết thúc, để sửa số nhập sai hồi tố. */
  addSalary: boolean;
  /** Tạo hợp đồng nối tiếp: không cho hợp đồng chưa bắt đầu hoặc không thời hạn đang chạy. */
  renew: boolean;
  viewEmployee: boolean;
  viewAuditLog: boolean;
};

/** Theo quyền và trạng thái. Backend vẫn kiểm tra lại (phạm vi dữ liệu, ngày chuyển trạng thái qua đêm...). */
export function getContractActions(
  contract: Pick<ContractListItem, "state" | "endDate">,
  hasPermission: (permission: string) => boolean,
): ContractActions {
  const manage = hasPermission("contract:manage");
  const upcoming = contract.state === "UPCOMING";
  return {
    edit: manage && upcoming,
    remove: manage && upcoming,
    end: manage && contract.state === "ACTIVE",
    addSalary: manage,
    renew: manage && !upcoming && contract.endDate !== null,
    viewEmployee: hasPermission("employee:read"),
    viewAuditLog: hasPermission("audit:read"),
  };
}

// ===== Mức lương =====

/** Khớp loadEditableSalary của backend: chỉ mức ở tương lai, trừ mức đầu tiên (sửa qua hợp đồng). */
export function isSalaryEditable(
  salary: Pick<Salary, "effectiveFrom">,
  contract: Pick<ContractDates, "startDate">,
  today: string,
): boolean {
  return salary.effectiveFrom > today && salary.effectiveFrom !== contract.startDate;
}

export type SalaryStatus = "current" | "upcoming" | "past" | "replaced";

/**
 * Trạng thái từng mức theo id. Mức đang áp dụng = mức chưa bị thay thế, mới nhất trong các mức đã tới ngày.
 * Hợp đồng đã kết thúc thì đó là mức áp dụng cuối cùng. `salaries` có thứ tự bất kỳ.
 */
export function salaryStatuses(salaries: readonly Salary[], today: string): Map<string, SalaryStatus> {
  const current = currentSalary(salaries, today);
  return new Map(
    salaries.map((salary) => {
      if (salary.replaced) return [salary.id, "replaced"];
      if (salary.effectiveFrom > today) return [salary.id, "upcoming"];
      return [salary.id, salary.id === current?.id ? "current" : "past"];
    }),
  );
}

export function currentSalary(salaries: readonly Salary[], today: string): Salary | undefined {
  return salaries
    .filter((salary) => !salary.replaced && salary.effectiveFrom <= today)
    .reduce<Salary | undefined>(
      (latest, salary) => (!latest || salary.effectiveFrom > latest.effectiveFrom ? salary : latest),
      undefined,
    );
}

/** Ngày nhỏ nhất của mức lương mới. Hợp đồng chưa bắt đầu: sau ngày bắt đầu (mức đầu tiên sửa qua hợp đồng). */
export function minSalaryDate(contract: ContractDates): string {
  return contract.state === "UPCOMING" ? nextDay(contract.startDate) : contract.startDate;
}

// ===== Gia hạn =====

/** "2026-12-31" → "2027-01-01". */
export function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Giá trị điền sẵn khi gia hạn: cùng loại, nối tiếp ngày cuối, mức lương gần nhất. Số hợp đồng do HR nhập. */
export function renewalDefaults(detail: ContractDetail, today: string) {
  const { contract, salaries } = detail;
  const salary =
    currentSalary(salaries, today) ?? salaries.find((candidate) => !candidate.replaced);
  return {
    type: contract.type,
    startDate: contract.endDate ? nextDay(contract.endDate) : "",
    salary,
  };
}
