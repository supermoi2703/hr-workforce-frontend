"use client";

import { useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, PencilIcon, UserRoundXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { applyServerFieldErrors } from "@/lib/forms";
import { todayIsoDate } from "@/lib/format";
import { getEmployeeError, hasFieldErrors } from "../error-messages";
import { useMyProfile, useMySensitive, useOrgUnits, useRefreshEmployee, useUpdateMyProfile } from "../hooks";
import { personalSchema, personalToForm, toPersonalRequest, type PersonalFormValues } from "../schemas";
import type { EmployeeDetail } from "../types";
import { EmployeeOverview, PersonalOverview } from "./employee-overview";
import { PersonalFields } from "./personal-fields";
import { SensitiveSection } from "./sensitive-section";

/**
 * Hồ sơ của người đang đăng nhập: xem thông tin công việc và thông tin nhạy cảm (chỉ xem), tự sửa thông tin cá nhân.
 * Tài khoản không gắn hồ sơ (Admin, tài khoản kỹ thuật) thì không gọi API, hiện hướng dẫn.
 * `contracts`: mục hợp đồng do route ghép vào (feature không import nhau), chỉ dựng khi đã có hồ sơ.
 */
export function MyProfilePage({ contracts }: { contracts?: ReactNode }) {
  const t = useTranslations("Profile");
  const { user } = useCurrentUser();
  const hasProfile = Boolean(user?.employeeId);
  const query = useMyProfile(hasProfile);

  let content;
  if (!hasProfile) {
    content = (
      <EmptyState
        icon={<UserRoundXIcon />}
        title={t("noProfile")}
        description={t("noProfileDescription")}
        className="border border-dashed"
      />
    );
  } else if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else {
    content = <MyProfileView employee={query.data} contracts={contracts} />;
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {content}
    </>
  );
}

function MyProfileView({ employee, contracts }: { employee: EmployeeDetail; contracts?: ReactNode }) {
  const t = useTranslations("Profile");
  const org = useOrgUnits();
  const sensitive = useMySensitive(true);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base font-medium">{t("work")}</h2>
        <EmployeeOverview employee={employee} lookup={org.lookup} hideAccount />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex max-w-2xl flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-medium">{t("personal")}</h2>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon /> {t("editPersonal")}
          </Button>
        </div>
        <PersonalOverview personal={employee.personal ?? personalToNull()} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base font-medium">{t("sensitive")}</h2>
        <SensitiveSection query={sensitive} />
      </section>

      {contracts && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-base font-medium">{t("contracts")}</h2>
          {contracts}
        </section>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          {editing && <PersonalForm employee={employee} onDone={() => setEditing(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** /me luôn có `personal`; phòng khi backend trả null thì hiện các ô trống. */
function personalToNull() {
  return { phone: null, personalEmail: null, dateOfBirth: null, gender: null, address: null };
}

const FORM_ID = "my-profile-form";

function PersonalForm({ employee, onDone }: { employee: EmployeeDetail; onDone: () => void }) {
  const t = useTranslations("Profile");
  const tValidation = useTranslations("Employees.Validation");
  const tEmployeeErrors = useTranslations("Employees.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshEmployee();

  // Form bọc trong nhóm `personal` để tên ô khớp DTO (PUT /me: { personal: {...}, version }) và lỗi backend gắn đúng ô.
  const schema = useMemo(() => z.object({ personal: personalSchema(tValidation, todayIsoDate()) }), [tValidation]);
  const form = useForm<{ personal: PersonalFormValues }>({
    resolver: zodResolver(schema),
    defaultValues: { personal: personalToForm(employee.personal) },
  });
  const mutation = useUpdateMyProfile();

  function submit(values: { personal: PersonalFormValues }) {
    mutation.mutate(
      { personal: toPersonalRequest(values.personal), version: employee.version },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          onDone();
        },
        onError: (error) => {
          if (applyServerFieldErrors(error, form.setError)) return;
          const { stale, message } = getEmployeeError(error, tEmployeeErrors, tErrors);
          if (stale) {
            toast.error(message);
            void refresh();
          }
        },
      },
    );
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? getEmployeeError(mutation.error, tEmployeeErrors, tErrors) : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editTitle")}</DialogTitle>
        <DialogDescription>{t("editDescription")}</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <PersonalFields form={form} idPrefix="me" />
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}
