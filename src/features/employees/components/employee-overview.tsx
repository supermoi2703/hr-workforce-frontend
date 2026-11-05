"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { DetailList, DetailRow } from "@/components/shared/detail-list";
import { UserStatusBadge } from "@/components/shared/user-status-badge";
import { formatDate } from "@/lib/format";
import type { OrgLookup } from "../rules";
import type { EmployeeDetail, OrgUnit, PersonalInfo } from "../types";
import { EmployeeStatusBadge } from "./employee-status-badge";

type EmployeeOverviewProps = {
  employee: EmployeeDetail;
  lookup: OrgLookup;
  /** Link sang hồ sơ của quản lý (người xem có employee:read). */
  linkManager?: boolean;
  /** Link sang tài khoản (user:read); không có thì chỉ hiện trạng thái. */
  linkAccount?: boolean;
  /** Ẩn dòng tài khoản (trang "hồ sơ của tôi": đã có trang /account). */
  hideAccount?: boolean;
};

/** Thông tin công việc của một hồ sơ: mã, email công việc, đơn vị, chức vụ, level, quản lý, ngày vào / nghỉ, tài khoản. */
export function EmployeeOverview({ employee, lookup, linkManager, linkAccount, hideAccount }: EmployeeOverviewProps) {
  const t = useTranslations("Employees.Fields");
  const tDetail = useTranslations("Employees.Detail");
  const tLevel = useTranslations("Employees.levels");
  const tType = useTranslations("Employees.employmentTypes");
  const none = (label: string) => <span className="text-muted-foreground">{label}</span>;
  const unit = (value: OrgUnit | undefined, fallback?: ReactNode) =>
    value ? (
      <span>
        {value.name}
        {!value.active && <span className="text-muted-foreground"> · {tDetail("inactive")}</span>}
      </span>
    ) : (
      (fallback ?? "—")
    );

  const manager = employee.manager;
  return (
    <DetailList className="max-w-2xl">
      <DetailRow label={t("employeeCode")}>
        <span className="font-mono tabular-nums">{employee.employeeCode}</span>
      </DetailRow>
      <DetailRow label={t("workEmail")}>
        <span className="break-all">{employee.workEmail}</span>
      </DetailRow>
      <DetailRow label={t("status")}>
        <EmployeeStatusBadge status={employee.status} />
      </DetailRow>
      <DetailRow label={t("office")}>{unit(lookup.office(employee.officeId))}</DetailRow>
      <DetailRow label={t("department")}>{unit(lookup.department(employee.departmentId))}</DetailRow>
      <DetailRow label={t("team")}>
        {employee.teamId ? unit(lookup.team(employee.teamId)) : none(tDetail("noTeam"))}
      </DetailRow>
      <DetailRow label={t("position")}>{unit(lookup.position(employee.positionId))}</DetailRow>
      <DetailRow label={t("level")}>{tLevel(employee.level)}</DetailRow>
      <DetailRow label={t("employmentType")}>{tType(employee.employmentType)}</DetailRow>
      <DetailRow label={t("manager")}>
        {manager ? (
          linkManager ? (
            <Link href={`/employees/${manager.id}`} className="font-medium hover:underline">
              {manager.fullName}
            </Link>
          ) : (
            manager.fullName
          )
        ) : (
          none(tDetail("noManager"))
        )}
      </DetailRow>
      <DetailRow label={t("hireDate")}>{formatDate(employee.hireDate)}</DetailRow>
      {employee.terminationDate && (
        <DetailRow label={t("terminationDate")}>{formatDate(employee.terminationDate)}</DetailRow>
      )}
      {!hideAccount && (
        <DetailRow label={t("account")}>
          {employee.account ? (
            <span className="flex flex-wrap items-center gap-2">
              <UserStatusBadge status={employee.account.status} />
              {linkAccount && (
                <Link href={`/admin/users/${employee.account.userId}`} className="text-sm font-medium hover:underline">
                  {tDetail("openAccount")}
                </Link>
              )}
            </span>
          ) : (
            none(tDetail("noAccount"))
          )}
        </DetailRow>
      )}
    </DetailList>
  );
}

/** Thông tin cá nhân (điện thoại, email cá nhân, ngày sinh, giới tính, địa chỉ). */
export function PersonalOverview({ personal }: { personal: PersonalInfo }) {
  const t = useTranslations("Employees.Fields");
  const tDetail = useTranslations("Employees.Detail");
  const tGender = useTranslations("Employees.genders");
  const value = (text: ReactNode | null) => text || <span className="text-muted-foreground">{tDetail("notProvided")}</span>;
  return (
    <DetailList className="max-w-2xl">
      <DetailRow label={t("phone")}>{value(personal.phone)}</DetailRow>
      <DetailRow label={t("personalEmail")}>
        {value(personal.personalEmail && <span className="break-all">{personal.personalEmail}</span>)}
      </DetailRow>
      <DetailRow label={t("dateOfBirth")}>{value(personal.dateOfBirth && formatDate(personal.dateOfBirth))}</DetailRow>
      <DetailRow label={t("gender")}>{value(personal.gender && tGender(personal.gender))}</DetailRow>
      <DetailRow label={t("address")}>
        {value(personal.address && <span className="whitespace-pre-line">{personal.address}</span>)}
      </DetailRow>
    </DetailList>
  );
}
