"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { applyServerFieldErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { CATEGORY_SWATCH_CLASSES, COLOR_OPTIONS } from "../categories";
import { getAnnouncementError, hasFieldErrors } from "../error-messages";
import {
  useAllCategories,
  useCreateCategory,
  useRefreshAnnouncements,
  useSetCategoryActive,
  useUpdateCategory,
} from "../hooks";
import {
  categorySchema,
  EMPTY_CATEGORY_FORM,
  toCategoryFormValues,
  toCategoryRequest,
  type CategoryFormValues,
} from "../schemas";
import { MAX_CATEGORY_NAME_LENGTH, type Category } from "../types";
import { AnnouncementCategoryBadge } from "./announcement-badges";

const FORM_ID = "announcement-category-form";

/** Đang xem danh sách, hoặc đang thêm (category null) / sửa một loại. */
type View = { kind: "list" } | { kind: "form"; category: Category | null };

/**
 * Quản lý loại bài (HR toàn công ty, Admin): danh sách loại kể cả đã ngừng dùng, thêm, sửa tên / màu / thứ tự, ngừng
 * dùng và dùng lại. Không xóa loại: bài cũ vẫn giữ loại cũ. Mỗi loại chỉ có tên và một màu nhạt chọn từ danh sách cố định.
 */
export function CategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* Chỉ dựng khi mở: mỗi lần mở lấy lại danh sách mới nhất và về màn danh sách. */}
        {open && <CategoryContent />}
      </DialogContent>
    </Dialog>
  );
}

function CategoryContent() {
  const [view, setView] = useState<View>({ kind: "list" });
  const toList = () => setView({ kind: "list" });

  return view.kind === "list" ? (
    <CategoryList
      onAdd={() => setView({ kind: "form", category: null })}
      onEdit={(category) => setView({ kind: "form", category })}
    />
  ) : (
    <CategoryForm category={view.category} onBack={toList} />
  );
}

/**
 * Tên ở ngôn ngữ còn lại, kèm mã ngôn ngữ ("EN: Policy" khi giao diện tiếng Việt, "VI: Chính sách" khi giao diện tiếng Anh);
 * null khi loại chưa có tên tiếng Anh (khi đó chỉ có một tên để hiện).
 */
function otherName(category: Pick<Category, "name" | "nameEn">, locale: string): string | null {
  const english = category.nameEn?.trim();
  if (!english) return null;
  return locale === "en" ? `VI: ${category.name}` : `EN: ${english}`;
}

function CategoryList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (category: Category) => void }) {
  const t = useTranslations("Announcements.Categories");
  const locale = useLocale();
  const tCommon = useTranslations("Common");
  const tAnnouncementErrors = useTranslations("Announcements.Errors");
  const tErrors = useTranslations("Errors");
  const query = useAllCategories(true);
  const setActive = useSetCategoryActive();
  const refresh = useRefreshAnnouncements();

  function toggle(category: Category) {
    setActive.mutate(
      { id: category.id, active: !category.active },
      {
        onSuccess: () => toast.success(t(category.active ? "deactivated" : "activated")),
        onError: (error) => {
          const { message, stale } = getAnnouncementError(error, tAnnouncementErrors, tErrors);
          toast.error(message);
          if (stale) void refresh();
        },
      },
    );
  }

  let content;
  if (query.isPending) {
    content = <LoadingState />;
  } else if (query.isError) {
    content = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  } else if (query.data.length === 0) {
    content = <EmptyState title={t("empty")} className="border border-dashed" />;
  } else {
    content = (
      <ul className="divide-y rounded-xl border bg-card">
        {query.data.map((category) => (
          <li key={category.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className={cn("flex min-w-0 flex-1 items-center gap-2", !category.active && "opacity-60")}>
              <AnnouncementCategoryBadge category={category} />
              {/* Tên ở ngôn ngữ còn lại (nếu có) để HR thấy cả hai khi quản lý */}
              {otherName(category, locale) && (
                <span className="text-xs text-muted-foreground">{otherName(category, locale)}</span>
              )}
              <span className="text-xs text-muted-foreground">{t("order", { order: category.sortOrder })}</span>
              {!category.active && <span className="text-xs text-muted-foreground">· {t("inactive")}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
                {t("edit")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggle(category)} disabled={setActive.isPending}>
                {category.active ? t("deactivate") : t("activate")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      {content}
      <DialogFooter>
        <Button variant="outline" onClick={onAdd}>
          <PlusIcon />
          {t("add")}
        </Button>
        <DialogClose render={<Button />}>{tCommon("confirm")}</DialogClose>
      </DialogFooter>
    </>
  );
}

function CategoryForm({ category, onBack }: { category: Category | null; onBack: () => void }) {
  const t = useTranslations("Announcements.Categories");
  const tForm = useTranslations("Announcements.Categories.Form");
  const tColors = useTranslations("Announcements.Categories.colors");
  const tValidation = useTranslations("Announcements.Validation");
  const tAnnouncementErrors = useTranslations("Announcements.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");
  const refresh = useRefreshAnnouncements();

  const editing = category !== null;
  const schema = useMemo(() => categorySchema(tValidation), [tValidation]);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: category ? toCategoryFormValues(category) : EMPTY_CATEGORY_FORM,
  });
  const create = useCreateCategory();
  const update = useUpdateCategory(category?.id ?? "");
  const mutation = editing ? update : create;
  const { errors } = form.formState;
  const [name, nameEn, color] = useWatch({ control: form.control, name: ["name", "nameEn", "color"] });

  function submit(values: CategoryFormValues) {
    const onSuccess = () => {
      toast.success(t(editing ? "saved" : "created"));
      onBack();
    };
    const onError = (error: unknown) => {
      if (applyServerFieldErrors(error, form.setError)) return;
      const { message, stale } = getAnnouncementError(error, tAnnouncementErrors, tErrors);
      const nameField = nameErrorField(error);
      if (nameField) {
        form.setError(nameField, { type: "server", message }, { shouldFocus: true });
      } else if (stale) {
        // Loại đã đổi hoặc đã bị xóa khỏi danh sách: báo, tải lại và về danh sách.
        toast.error(message);
        void refresh();
        onBack();
      }
    };
    if (category) {
      update.mutate({ ...toCategoryRequest(values), version: category.version }, { onSuccess, onError });
    } else {
      create.mutate(toCategoryRequest(values), { onSuccess, onError });
    }
  }

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) && !nameErrorField(mutation.error)
      ? getAnnouncementError(mutation.error, tAnnouncementErrors, tErrors)
      : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? tForm("editTitle") : tForm("createTitle")}</DialogTitle>
        <DialogDescription>{tForm("description")}</DialogDescription>
      </DialogHeader>

      {formError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError.message}</AlertDescription>
        </Alert>
      )}

      <form id={FORM_ID} onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="announcement-category-name">{tForm("name")}</FieldLabel>
            <Input
              id="announcement-category-name"
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.nameEn}>
            <FieldLabel htmlFor="announcement-category-name-en">{tForm("nameEn")}</FieldLabel>
            <Input
              id="announcement-category-name-en"
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              aria-invalid={!!errors.nameEn}
              {...form.register("nameEn")}
            />
            <FieldDescription>{tForm("nameEnHint")}</FieldDescription>
            <FieldError errors={[errors.nameEn]} />
          </Field>

          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <Field>
                <FieldLabel id="announcement-category-color-label">{tForm("color")}</FieldLabel>
                <div role="radiogroup" aria-labelledby="announcement-category-color-label" className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={field.value === option}
                      aria-label={tColors(option)}
                      title={tColors(option)}
                      onClick={() => field.onChange(option)}
                      className={cn(
                        "size-7 rounded-full border-2 border-transparent transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        CATEGORY_SWATCH_CLASSES[option],
                        field.value === option && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                      )}
                    />
                  ))}
                </div>
              </Field>
            )}
          />

          <Field data-invalid={!!errors.sortOrder}>
            <FieldLabel htmlFor="announcement-category-order">{tForm("order")}</FieldLabel>
            <Input
              id="announcement-category-order"
              inputMode="numeric"
              className="w-28"
              aria-invalid={!!errors.sortOrder}
              {...form.register("sortOrder")}
            />
            <FieldDescription>{tForm("orderHint")}</FieldDescription>
            <FieldError errors={[errors.sortOrder]} />
          </Field>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {tForm("preview")}
            <AnnouncementCategoryBadge category={{ name: name.trim() || tForm("previewName"), nameEn: nameEn.trim() || null, color }} />
          </div>
        </FieldGroup>
      </form>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onBack}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {tForm("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Trùng tên gắn vào đúng ô tên (tiếng Việt hay tiếng Anh) thay vì Alert chung. */
function nameErrorField(error: unknown): "name" | "nameEn" | null {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  if (code === "ANNOUNCEMENT_CATEGORY_NAME_EXISTS") return "name";
  if (code === "ANNOUNCEMENT_CATEGORY_NAME_EN_EXISTS") return "nameEn";
  return null;
}
