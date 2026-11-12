"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { applyServerFieldErrors } from "@/lib/forms";
import { todayIsoDate } from "@/lib/format";
import { getEmployeeError, hasFieldErrors } from "../error-messages";
import { useCreateEmployee, useMyProfile, useOrgUnits, useRefreshEmployee, useUpdateEmployee } from "../hooks";
import { orgUnitOptions, teamsOf } from "../rules";
import { EMPTY_PERSONAL, employeeSchema, personalToForm, toEmployeeRequest, type EmployeeFormValues } from "../schemas";
import { EMPLOYEE_LEVELS, EMPLOYMENT_TYPES, type EmployeeDetail, type OrgUnit } from "../types";
import { ChoiceSelect, type Choice } from "@/components/shared/choice-select";
import { PersonalFields } from "./personal-fields";

const FORM_ID = "employee-form";
/** Bốn ô đơn vị: khóa khi sửa hồ sơ đã làm việc (backend EMPLOYEE_UNIT_CHANGE_REQUIRES_TRANSFER). */
const UNIT_FIELDS: string[] = ["officeId", "positionId", "departmentId", "teamId"];

type EmployeeFormDialogProps = {
  /** Có = sửa hồ sơ này; không = tạo mới. */
  employee?: EmployeeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toForm(employee: EmployeeDetail | undefined, defaultOfficeId: string): EmployeeFormValues {
  if (!employee) {
    return {
      fullName: "",
      workEmail: "",
      officeId: defaultOfficeId,
      departmentId: "",
      teamId: "",
      positionId: "",
      level: "",
      employmentType: "",
      hireDate: todayIsoDate(),
      personal: EMPTY_PERSONAL,
    };
  }
  return {
    fullName: employee.fullName,
    workEmail: employee.workEmail,
    officeId: employee.officeId,
    departmentId: employee.departmentId,
    teamId: employee.teamId ?? "",
    positionId: employee.positionId,
    level: employee.level,
    employmentType: employee.employmentType,
    hireDate: employee.hireDate,
    personal: personalToForm(employee.personal),
  };
}

/**
 * Tạo / sửa hồ sơ (employee:manage). PUT thay toàn bộ hồ sơ nên form sửa luôn gửi lại đủ nhóm thông tin cá nhân.
 * Trạng thái đổi ở hộp thoại riêng. Tạo mới: điền sẵn văn phòng của người đang đăng nhập (HR văn phòng chỉ được tạo
 * trong văn phòng mình).
 */
export function EmployeeFormDialog({ employee, open, onOpenChange }: EmployeeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* Nội dung chỉ dựng khi mở: mỗi lần mở lấy lại giá trị mới nhất của hồ sơ. */}
        {open && <EmployeeForm employee={employee} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({ employee, onDone }: { employee?: EmployeeDetail; onDone: () => void }) {
  const t = useTranslations("Employees.Form");
  const tFields = useTranslations("Employees.Fields");
  const tLevel = useTranslations("Employees.levels");
  const tType = useTranslations("Employees.employmentTypes");
  const tValidation = useTranslations("Employees.Validation");
  const tEmployeeErrors = useTranslations("Employees.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { user } = useCurrentUser();
  const org = useOrgUnits();
  const myProfile = useMyProfile(!employee && !!user?.employeeId);
  const refresh = useRefreshEmployee();
  const editing = employee !== undefined;

  const schema = useMemo(() => employeeSchema(tValidation, todayIsoDate()), [tValidation]);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm(employee, ""),
  });
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? "");
  const mutation = editing ? update : create;

  // Văn phòng mặc định khi tạo: tải xong hồ sơ của tôi mà người dùng chưa tự chọn thì điền vào.
  const myOfficeId = myProfile.data?.officeId;
  useEffect(() => {
    if (!editing && myOfficeId && form.getValues("officeId") === "") form.setValue("officeId", myOfficeId);
  }, [editing, myOfficeId, form]);

  const departmentId = useWatch({ control: form.control, name: "departmentId" });
  // Hồ sơ đã làm việc đổi đơn vị qua Điều chuyển (có duyệt, có ngày hiệu lực); chưa nhận việc thì sửa trực tiếp được.
  const lockUnits = employee !== undefined && employee.status !== "ONBOARDING";

  const inactive = (unit: OrgUnit) => (unit.active ? unit.name : t("inactiveOption", { name: unit.name }));
  const choices = (units: OrgUnit[] | undefined, current?: string | null): Choice[] =>
    orgUnitOptions(units, current).map((unit) => ({ value: unit.id, label: inactive(unit) }));
  const officeChoices = choices(org.offices, employee?.officeId);
  const departmentChoices = choices(org.departments, employee?.departmentId);
  const teamChoices = choices(teamsOf(org.teams, departmentId), employee?.teamId);
  const positionChoices = choices(org.positions, employee?.positionId);
  const levelChoices = EMPLOYEE_LEVELS.map((level) => ({ value: level, label: tLevel(level) }));
  const typeChoices = EMPLOYMENT_TYPES.map((type) => ({ value: type, label: tType(type) }));

  function submit(values: EmployeeFormValues) {
    const body = toEmployeeRequest(values, employee?.version);
    const options = {
      onError: (error: unknown) => {
        if (applyServerFieldErrors(error, form.setError)) return;
        const { field, message, stale } = getEmployeeError(error, tEmployeeErrors, tErrors);
        if (field) form.setError(field as Path<EmployeeFormValues>, { type: "server", message }, { shouldFocus: true });
        if (stale) {
          toast.error(message);
          void refresh(employee?.id);
        }
      },
    };
    if (editing) {
      update.mutate(body, {
        ...options,
        onSuccess: () => {
          toast.success(t("saved"));
          onDone();
        },
      });
    } else {
      create.mutate(body, {
        ...options,
        onSuccess: (created) => {
          toast.success(t("created", { code: created.employeeCode }));
          onDone();
          router.push(`/employees/${created.id}`);
        },
      });
    }
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getEmployeeError(mutation.error, tEmployeeErrors, tErrors) : null;
  const { errors } = form.formState;

  const select = (
    name: "officeId" | "departmentId" | "teamId" | "positionId" | "level" | "employmentType",
    label: string,
    list: Choice[],
    extra?: { noneLabel?: string; onChange?: (value: string) => void; hint?: string },
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field data-invalid={!!errors[name]}>
          <FieldLabel htmlFor={`employee-${name}`}>{label}</FieldLabel>
          <ChoiceSelect
            id={`employee-${name}`}
            value={field.value}
            onChange={(value) => {
              field.onChange(value);
              extra?.onChange?.(value);
            }}
            choices={list}
            placeholder={t("choose")}
            noneLabel={extra?.noneLabel}
            invalid={!!errors[name]}
            disabled={
              (org.isPending && name !== "level" && name !== "employmentType") ||
              (lockUnits && UNIT_FIELDS.includes(name))
            }
          />
          {extra?.hint && <FieldDescription>{extra.hint}</FieldDescription>}
          <FieldError errors={[errors[name]]} />
        </Field>
      )}
    />
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
        <DialogDescription>{editing ? t("editDescription") : t("createDescription")}</DialogDescription>
      </DialogHeader>

      {formError && !formError.field && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-6">
        <FieldSet>
          <FieldLegend>{t("work")}</FieldLegend>
          {lockUnits && <FieldDescription>{t("unitsLocked")}</FieldDescription>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.fullName}>
              <FieldLabel htmlFor="employee-full-name">{tFields("fullName")}</FieldLabel>
              <Input id="employee-full-name" autoComplete="off" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FieldError errors={[errors.fullName]} />
            </Field>
            <Field data-invalid={!!errors.workEmail}>
              <FieldLabel htmlFor="employee-work-email">{tFields("workEmail")}</FieldLabel>
              <Input
                id="employee-work-email"
                type="email"
                autoComplete="off"
                aria-invalid={!!errors.workEmail}
                {...form.register("workEmail")}
              />
              <FieldDescription>{t("workEmailHint")}</FieldDescription>
              <FieldError errors={[errors.workEmail]} />
            </Field>
            {select("officeId", tFields("office"), officeChoices)}
            {select("positionId", tFields("position"), positionChoices)}
            {select("departmentId", tFields("department"), departmentChoices, {
              // Team phải thuộc phòng: đổi phòng thì bỏ team đang chọn.
              onChange: () => form.setValue("teamId", ""),
            })}
            {select("teamId", tFields("team"), teamChoices, { noneLabel: t("noTeam") })}
            {select("level", tFields("level"), levelChoices)}
            {select("employmentType", tFields("employmentType"), typeChoices, { hint: t("employmentTypeHint") })}
            <Field data-invalid={!!errors.hireDate}>
              <FieldLabel htmlFor="employee-hire-date">{tFields("hireDate")}</FieldLabel>
              <Input id="employee-hire-date" type="date" aria-invalid={!!errors.hireDate} {...form.register("hireDate")} />
              <FieldError errors={[errors.hireDate]} />
            </Field>
          </div>
        </FieldSet>

        <Separator />

        <FieldSet>
          <FieldLegend>{t("personal")}</FieldLegend>
          <PersonalFields form={form} idPrefix="employee" />
        </FieldSet>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {editing ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </>
  );
}
