"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ChoiceSelect, type Choice } from "@/components/shared/choice-select";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { applyServerFieldErrors } from "@/lib/forms";
import { getAnnouncementError, hasFieldErrors } from "../error-messages";
import {
  useCategories,
  useCategoryName,
  useCreateAnnouncement,
  useManagedAnnouncement,
  useRefreshAnnouncements,
  useUpdateAnnouncement,
} from "../hooks";
import { audienceOptions, categoryChoices, isAudienceLocked, unitChoices } from "../rules";
import {
  announcementSchema,
  EMPTY_FORM,
  toFormValues,
  toRequest,
  toUpdateRequest,
  type AnnouncementFormValues,
} from "../schemas";
import {
  MAX_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
  type AnnouncementDetail,
  type Category,
  type CategoryRef,
  type CoverUploader,
  type OrgOptions,
} from "../types";
import { CoverField } from "./cover-field";
import { MarkdownContent } from "./markdown-content";
import { MarkdownEditor } from "./markdown-editor";

const FORM_ID = "announcement-form";

type AnnouncementFormDialogProps = {
  open: boolean;
  /** null = tạo bài mới. */
  announcementId: string | null;
  /** Người đăng được chọn cả công ty / văn phòng / phòng ban (HR_COMPANY, ADMIN). HR văn phòng thì không. */
  companyWide: boolean;
  org: OrgOptions;
  /** Tải ảnh bìa lên kho: route ghép từ features/files (feature không import nhau). */
  uploader: CoverUploader;
  onClose: () => void;
};

/**
 * Tạo hoặc sửa bài (announcement:manage). Tạo ra **nháp**; đăng là bước riêng ở danh sách. Bài đã đăng khóa đối tượng
 * nhận. Sửa luôn tải bản mới nhất để lấy đúng version.
 */
export function AnnouncementFormDialog({
  open,
  announcementId,
  companyWide,
  org,
  uploader,
  onClose,
}: AnnouncementFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* Chỉ dựng khi mở: mỗi lần mở điền lại dữ liệu mới nhất. */}
        {open && (
          <FormLoader
            announcementId={announcementId}
            companyWide={companyWide}
            org={org}
            uploader={uploader}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormLoader({
  announcementId,
  companyWide,
  org,
  uploader,
  onDone,
}: {
  announcementId: string | null;
  companyWide: boolean;
  org: OrgOptions;
  uploader: CoverUploader;
  onDone: () => void;
}) {
  const t = useTranslations("Announcements.Form");
  const query = useManagedAnnouncement(announcementId);
  const categories = useCategories();
  const title = t(announcementId === null ? "createTitle" : "editTitle");

  // Cần danh sách loại trước khi dựng form: bài mới chọn sẵn loại đầu tiên.
  const failed = categories.isError ? categories : query.isError ? query : null;
  if (failed) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ErrorState error={failed.error} onRetry={() => failed.refetch()} />
      </>
    );
  }
  if (categories.isPending || (announcementId !== null && query.isPending)) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <LoadingState />
      </>
    );
  }
  return (
    <AnnouncementForm
      announcement={announcementId === null ? null : (query.data ?? null)}
      categories={categories.data ?? []}
      companyWide={companyWide}
      org={org}
      uploader={uploader}
      onDone={onDone}
    />
  );
}

function AnnouncementForm({
  announcement,
  categories,
  companyWide,
  org,
  uploader,
  onDone,
}: {
  announcement: AnnouncementDetail | null;
  /** Loại đang dùng. */
  categories: Category[];
  companyWide: boolean;
  org: OrgOptions;
  uploader: CoverUploader;
  onDone: () => void;
}) {
  const t = useTranslations("Announcements.Form");
  const nameOf = useCategoryName();
  const tAudience = useTranslations("Announcements.audiences");
  const tValidation = useTranslations("Announcements.Validation");
  const tAnnouncementErrors = useTranslations("Announcements.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshAnnouncements();

  const editing = announcement !== null;
  const locked = editing && isAudienceLocked(announcement.status);
  const [preview, setPreview] = useState(false);

  const schema = useMemo(() => announcementSchema(tValidation, companyWide), [tValidation, companyWide]);
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(schema),
    // Bài mới chọn sẵn loại đầu tiên (theo thứ tự hiển thị); bài cũ giữ loại của nó
    defaultValues: announcement ? toFormValues(announcement) : { ...EMPTY_FORM, categoryId: categories[0]?.id ?? "" },
  });
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement(announcement?.id ?? "");
  const mutation = editing ? update : create;

  const [audienceType, content] = useWatch({ control: form.control, name: ["audienceType", "content"] });
  const { errors } = form.formState;

  function submit(values: AnnouncementFormValues) {
    const onSuccess = () => {
      toast.success(editing ? t("saved") : t("created"));
      onDone();
    };
    const onError = (error: unknown) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { message, stale } = getAnnouncementError(error, tAnnouncementErrors, tErrors);
      if (stale) {
        // Bài đã đổi hoặc đã bị gỡ: báo, tải lại danh sách và đóng form (mở lại sẽ lấy version mới).
        toast.error(message);
        void refresh();
        onDone();
      }
    };
    if (announcement) {
      update.mutate(toUpdateRequest(values, companyWide, announcement), { onSuccess, onError });
    } else {
      create.mutate(toRequest(values, companyWide), { onSuccess, onError });
    }
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error)
      ? getAnnouncementError(mutation.error, tAnnouncementErrors, tErrors)
      : null;

  // Loại đang dùng, cộng loại hiện tại của bài nếu nó đã ngừng dùng (bài cũ vẫn sửa được mà không phải đổi loại)
  const activeRefs: CategoryRef[] = categories.map(({ id, name, nameEn, color }) => ({ id, name, nameEn, color }));
  const categoryOptions: Choice[] = categoryChoices(activeRefs, announcement?.category).map((category) => ({
    value: category.id,
    label: activeRefs.some((active) => active.id === category.id)
      ? nameOf(category)
      : t("inactiveOption", { name: nameOf(category) }),
  }));
  const audienceChoices: Choice[] = audienceOptions(companyWide).map((value) => ({ value, label: tAudience(value) }));
  const toChoices = (units: typeof org.offices, current: string | null): Choice[] =>
    unitChoices(units, current).map((unit) => ({
      value: unit.id,
      label: unit.active ? unit.name : t("inactiveOption", { name: unit.name }),
    }));
  const officeChoices = toChoices(org.offices, announcement?.officeId ?? null);
  const departmentChoices = toChoices(org.departments, announcement?.departmentId ?? null);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
        <DialogDescription>{editing ? t("editDescription") : t("createDescription")}</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="announcement-title">{t("title")}</FieldLabel>
            <Input
              id="announcement-title"
              maxLength={MAX_TITLE_LENGTH}
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Field data-invalid={!!errors.categoryId}>
                  <FieldLabel htmlFor="announcement-category">{t("category")}</FieldLabel>
                  <ChoiceSelect
                    id="announcement-category"
                    value={field.value}
                    onChange={field.onChange}
                    choices={categoryOptions}
                    placeholder={t("choose")}
                    invalid={!!errors.categoryId}
                  />
                  <FieldError errors={[errors.categoryId]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="pinned"
              render={({ field }) => (
                <Field orientation="horizontal" className="items-start sm:mt-6">
                  <Checkbox
                    id="announcement-pinned"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <div className="space-y-0.5">
                    <FieldLabel htmlFor="announcement-pinned">{t("pinned")}</FieldLabel>
                    <FieldDescription>{t("pinnedHint")}</FieldDescription>
                  </div>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="coverFileId"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("cover")}</FieldLabel>
                <CoverField
                  value={field.value}
                  // Ảnh đang lưu của bài; ảnh vừa chọn dùng bản xem trước trên máy
                  currentUrl={announcement?.coverFileId === field.value ? (announcement?.coverUrl ?? null) : null}
                  onChange={field.onChange}
                  uploader={uploader}
                />
                <FieldDescription>{t("coverOptional")}</FieldDescription>
              </Field>
            )}
          />

          {companyWide ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="audienceType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="announcement-audience">{t("audience")}</FieldLabel>
                    <ChoiceSelect
                      id="announcement-audience"
                      value={field.value}
                      onChange={field.onChange}
                      choices={audienceChoices}
                      disabled={locked}
                    />
                  </Field>
                )}
              />
              {audienceType === "OFFICE" && (
                <Controller
                  control={form.control}
                  name="officeId"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.officeId}>
                      <FieldLabel htmlFor="announcement-office">{t("office")}</FieldLabel>
                      <ChoiceSelect
                        id="announcement-office"
                        value={field.value}
                        onChange={field.onChange}
                        choices={officeChoices}
                        placeholder={t("choose")}
                        invalid={!!errors.officeId}
                        disabled={locked || org.isPending}
                      />
                      <FieldError errors={[errors.officeId]} />
                    </Field>
                  )}
                />
              )}
              {audienceType === "DEPARTMENT" && (
                <Controller
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.departmentId}>
                      <FieldLabel htmlFor="announcement-department">{t("department")}</FieldLabel>
                      <ChoiceSelect
                        id="announcement-department"
                        value={field.value}
                        onChange={field.onChange}
                        choices={departmentChoices}
                        placeholder={t("choose")}
                        invalid={!!errors.departmentId}
                        disabled={locked || org.isPending}
                      />
                      <FieldError errors={[errors.departmentId]} />
                    </Field>
                  )}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("ownOfficeOnly")}</p>
          )}
          {locked && <p className="text-sm text-muted-foreground">{t("audienceLocked")}</p>}

          <Field data-invalid={!!errors.content}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="announcement-content">{t("content")}</FieldLabel>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((value) => !value)}>
                {preview ? t("write") : t("preview")}
              </Button>
            </div>
            {preview ? (
              <div className="min-h-40 rounded-lg border bg-muted/30 p-3">
                {content.trim() ? <MarkdownContent>{content}</MarkdownContent> : (
                  <p className="text-sm text-muted-foreground">{t("emptyPreview")}</p>
                )}
              </div>
            ) : (
              <Controller
                control={form.control}
                name="content"
                render={({ field }) => (
                  <MarkdownEditor
                    id="announcement-content"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={MAX_CONTENT_LENGTH}
                    invalid={!!errors.content}
                    rows={12}
                  />
                )}
              />
            )}
            <FieldDescription>{t("contentHint")}</FieldDescription>
            <FieldError errors={[errors.content]} />
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {editing ? t("save") : t("saveDraft")}
        </Button>
      </DialogFooter>
    </>
  );
}
