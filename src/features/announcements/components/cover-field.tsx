"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleAlertIcon, ImageIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { compressCover } from "../image";
import type { CoverUploader } from "../types";
import { CoverImage } from "./cover-image";

type CoverFieldProps = {
  /** id file đang là ảnh bìa; "" = không có. */
  value: string;
  /** Link xem ảnh đã có sẵn từ backend (bài đã lưu). Ảnh vừa chọn dùng bản xem trước ngay trên máy. */
  currentUrl: string | null;
  onChange: (fileId: string) => void;
  uploader: CoverUploader;
  disabled?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Ô ảnh bìa: kéo thả hoặc chọn ảnh → nén ngay trên trình duyệt → tải thẳng lên kho (thanh tiến trình) → xem trước. Chỉ
 * giữ id file trong form; backend kiểm tra ảnh thuộc người đang lưu. Bỏ ảnh là đặt lại id rỗng.
 */
export function CoverField({ value, currentUrl, onChange, uploader, disabled }: CoverFieldProps) {
  const t = useTranslations("Announcements.Form");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bản xem trước ngay trên máy (blob:) của ảnh vừa chọn, để không chờ backend ký link.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Giải phóng blob cũ khi đổi ảnh hoặc đóng form.
  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);
  // Đóng form giữa chừng thì hủy lần tải đang chạy.
  useEffect(() => {
    const controller = controllerRef;
    return () => controller.current?.abort();
  }, []);

  const uploading = progress !== null;
  const preview = value ? (localPreview ?? currentUrl) : null;

  async function handleFile(file: File | undefined) {
    if (!file || uploading || disabled) return;
    setError(null);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress(0);
    try {
      const prepared = await compressCover(file);
      const stored = await uploader.upload(prepared, setProgress, controller.signal);
      setLocalPreview(URL.createObjectURL(prepared));
      onChange(stored.id);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(uploader.describeError(caught));
    } finally {
      setProgress(null);
    }
  }

  function remove() {
    setLocalPreview(null);
    setError(null);
    onChange("");
  }

  return (
    <div className="space-y-2">
      {preview && !uploading ? (
        <div className="relative overflow-hidden rounded-lg border">
          <CoverImage src={preview} />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-2 right-2"
            onClick={remove}
            disabled={disabled}
            aria-label={t("coverRemove")}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40",
            dragging && "border-primary bg-muted/40",
            (disabled || uploading) && "cursor-not-allowed opacity-70",
          )}
        >
          {uploading ? (
            <>
              <Spinner />
              <span>{t("coverUploading", { percent: progress ?? 0 })}</span>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress ?? 0}%` }} />
              </div>
            </>
          ) : (
            <>
              <ImageIcon className="size-6" aria-hidden />
              <span>{t("coverDrop")}</span>
              <span className="text-xs">{t("coverHint")}</span>
            </>
          )}
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // chọn lại cùng file vẫn kích hoạt onChange
          void handleFile(file);
        }}
      />

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {preview && !uploading && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
          {t("coverChange")}
        </Button>
      )}
    </div>
  );
}
