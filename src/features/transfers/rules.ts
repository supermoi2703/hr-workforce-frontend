import type { TeamOption, Transfer, TransferEmployee, UnitKind, UnitOption, UnitSet } from "./types";

/** Đề xuất còn chạy: mỗi nhân viên chỉ có một (backend TRANSFER_ALREADY_OPEN). */
export function isOpenTransfer(transfer: Pick<Transfer, "status">): boolean {
  return transfer.status === "PENDING" || transfer.status === "APPROVED";
}

/**
 * Hiện nút "Đề xuất điều chuyển": có quyền, người này đang làm việc (chưa nhận việc thì sửa hồ sơ trực tiếp, đã nghỉ
 * thì không chuyển được), không phải hồ sơ của chính mình, và chưa có đề xuất đang chạy. Backend vẫn kiểm tra lại.
 */
export function canProposeTransfer(
  employee: Pick<TransferEmployee, "id" | "status">,
  myEmployeeId: string | null | undefined,
  hasPermission: (permission: string) => boolean,
  transfers: readonly Transfer[] | undefined,
): boolean {
  return (
    hasPermission("employee:transfer") &&
    (employee.status === "ACTIVE" || employee.status === "ON_LEAVE") &&
    employee.id !== myEmployeeId &&
    !(transfers ?? []).some(isOpenTransfer)
  );
}

/** HR hủy được đề xuất đã duyệt mà chưa tới ngày hiệu lực. */
export function canCancelTransfer(
  transfer: Pick<Transfer, "status">,
  hasPermission: (permission: string) => boolean,
): boolean {
  return transfer.status === "APPROVED" && hasPermission("employee:manage");
}

/** Các thứ đổi giữa hai trạng thái, theo thứ tự hiện trên màn hình. */
export function changedUnits(from: UnitSet, to: UnitSet): UnitKind[] {
  const changed: UnitKind[] = [];
  if (from.officeId !== to.officeId) changed.push("office");
  if (from.departmentId !== to.departmentId) changed.push("department");
  if ((from.teamId ?? "") !== (to.teamId ?? "")) changed.push("team");
  if (from.positionId !== to.positionId) changed.push("position");
  return changed;
}

/** Form giữ teamId rỗng cho "không thuộc team". Phải đổi ít nhất một thứ mới gửi được. */
export function hasUnitChange(
  current: UnitSet,
  next: { officeId: string; departmentId: string; teamId: string; positionId: string },
): boolean {
  return changedUnits(current, { ...next, teamId: next.teamId || null }).length > 0;
}

/** Lựa chọn cho ô chọn đơn vị: đơn vị đang dùng, cộng đơn vị hiện tại nếu nó đã ngừng dùng (để ô không bị trống). */
export function unitChoices<T extends UnitOption>(units: readonly T[] | undefined, currentId?: string | null): T[] {
  return (units ?? []).filter((unit) => unit.active || unit.id === currentId);
}

/** Team của một phòng (ô team phụ thuộc ô phòng). */
export function teamsOf(teams: readonly TeamOption[] | undefined, departmentId: string | null | undefined): TeamOption[] {
  return departmentId ? (teams ?? []).filter((team) => team.departmentId === departmentId) : [];
}

/** Tên đơn vị theo id, kể cả đơn vị đã ngừng dùng; chưa tải xong hoặc không có thì "—". */
export function unitName(units: readonly UnitOption[] | undefined, id: string | null | undefined): string {
  return (id && units?.find((unit) => unit.id === id)?.name) || "—";
}
