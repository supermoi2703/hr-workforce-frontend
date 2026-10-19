"use client";

import { useId, useRef } from "react";
import { CheckCircle2Icon, PaperclipIcon, RotateCwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFileErrorMessage } from "../errors";
import { formatFileSize } from "../format";
import { useFileUpload } from "../hooks";
import { CLIENT_UPLOAD_RULES, type FilePurpose, type StoredFile } from "../types";

type FileUploadFieldProps = {
  purpose: FilePurpose;
  /** Gọi khi file đã tải lên xong (ACTIVE): lưu `file.id` vào form nghiệp vụ. */
  onUploaded?: (file: StoredFile) => void;
  label?: string;
  disabled?: boolean;
  /** Chỉ dùng ở trang thử khi chưa có đăng nhập thật (gắn token tay). */
  requestHeaders?: HeadersInit;
};

/**
 * Ô chọn file và tải thẳng lên kho qua presigned URL: chọn file → thanh tiến trình → đã tải lên.
 * Không giữ nội dung file trong form; form chỉ cần `id` trả về qua `onUploaded`.
 */
export function FileUploadField({ purpose, onUploaded, label = "Đính kèm", disabled, requestHeaders }: FileUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, upload, cancel, reset } = useFileUpload(purpose, requestHeaders);
  const rules = CLIENT_UPLOAD_RULES[purpose];

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // chọn lại cùng file vẫn kích hoạt onChange
    if (!file) return;
    const stored = await upload(file);
    if (stored) onUploaded?.(stored);
  }

  const busy = state.status === "uploading";

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={rules?.contentTypes.join(",")}
        onChange={handleChange}
        disabled={disabled || busy || !rules}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled || busy || !rules}>
          <PaperclipIcon /> {label}
        </Button>
        {rules && (
          <span className="text-xs text-muted-foreground">
            Tối đa {formatFileSize(rules.maxSizeBytes)} · {rules.contentTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")}
          </span>
        )}
      </div>

      {state.status === "uploading" && (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${state.progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{state.progress}%</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Hủy tải lên">
            <XIcon />
          </Button>
        </div>
      )}

      {state.status === "done" && (
        <p className="flex items-center gap-2 text-sm">
          <CheckCircle2Icon className="size-4 text-success" />
          <span className="truncate">{state.file.originalName}</span>
          <span className="text-muted-foreground">({formatFileSize(state.file.sizeBytes)})</span>
        </p>
      )}

      {state.status === "error" && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          {getFileErrorMessage(state.error)}
          <Button type="button" variant="ghost" size="icon-sm" onClick={reset} aria-label="Bỏ qua lỗi">
            <RotateCwIcon />
          </Button>
        </p>
      )}
    </div>
  );
}
