"use client";

import { useTranslations } from "next-intl";
import { Controller, type FieldErrors, type Path, type UseFormReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/lib/format";
import { MIN_AGE, yearsBefore, type PersonalFormValues } from "../schemas";
import { GENDERS } from "../types";
import { ChoiceSelect } from "@/components/shared/choice-select";

type PersonalForm = { personal: PersonalFormValues };

/**
 * Năm ô thông tin cá nhân (điện thoại, email cá nhân, ngày sinh, giới tính, địa chỉ), dùng chung cho form hồ sơ của HR
 * và form "hồ sơ của tôi". Form chứa nó phải có nhóm `personal` (tên field khớp DTO để gắn lỗi của backend).
 */
export function PersonalFields<T extends PersonalForm>({ form, idPrefix }: { form: UseFormReturn<T>; idPrefix: string }) {
  const t = useTranslations("Employees.Fields");
  const tGender = useTranslations("Employees.genders");
  // Kiểu generic không suy ra được đường dẫn con: ép về form có đúng nhóm `personal`.
  const typed = form as unknown as UseFormReturn<PersonalForm>;
  const errors = (typed.formState.errors as FieldErrors<PersonalForm>).personal ?? {};
  const path = (name: keyof PersonalFormValues) => `personal.${name}` as Path<PersonalForm>;
  const genderChoices = GENDERS.map((gender) => ({ value: gender, label: tGender(gender) }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field data-invalid={!!errors.phone}>
        <FieldLabel htmlFor={`${idPrefix}-phone`}>{t("phone")}</FieldLabel>
        <Input
          id={`${idPrefix}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          aria-invalid={!!errors.phone}
          {...typed.register(path("phone"))}
        />
        <FieldError errors={[errors.phone]} />
      </Field>
      <Field data-invalid={!!errors.personalEmail}>
        <FieldLabel htmlFor={`${idPrefix}-personal-email`}>{t("personalEmail")}</FieldLabel>
        <Input
          id={`${idPrefix}-personal-email`}
          type="email"
          autoComplete="off"
          aria-invalid={!!errors.personalEmail}
          {...typed.register(path("personalEmail"))}
        />
        <FieldError errors={[errors.personalEmail]} />
      </Field>
      <Field data-invalid={!!errors.dateOfBirth}>
        <FieldLabel htmlFor={`${idPrefix}-dob`}>{t("dateOfBirth")}</FieldLabel>
        <Input
          id={`${idPrefix}-dob`}
          type="date"
          max={yearsBefore(todayIsoDate(), MIN_AGE)}
          aria-invalid={!!errors.dateOfBirth}
          {...typed.register(path("dateOfBirth"))}
        />
        <FieldError errors={[errors.dateOfBirth]} />
      </Field>
      <Controller
        control={typed.control}
        name="personal.gender"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-gender`}>{t("gender")}</FieldLabel>
            <ChoiceSelect
              id={`${idPrefix}-gender`}
              value={field.value}
              onChange={field.onChange}
              choices={genderChoices}
              noneLabel={t("genderNone")}
            />
          </Field>
        )}
      />
      <Field data-invalid={!!errors.address} className="sm:col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-address`}>{t("address")}</FieldLabel>
        <Textarea id={`${idPrefix}-address`} rows={2} aria-invalid={!!errors.address} {...typed.register(path("address"))} />
        <FieldError errors={[errors.address]} />
      </Field>
    </div>
  );
}
