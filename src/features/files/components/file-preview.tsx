"use client";

import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getFileErrorMessage } from "../errors";
import { isImage } from "../format";
import { useDownloadUrl } from "../hooks";

type FilePreviewProps = {
  fileId: string;
  contentType: string;
  name?: string | null;
  className?: string;
  requestHeaders?: HeadersInit;
};

/** Hiển thị file đã lưu: ảnh thì hiện ảnh, file khác thì hiện link mở. URL có hạn được lấy và làm mới tự động. */
export function FilePreview({ fileId, contentType, name, className, requestHeaders }: FilePreviewProps) {
  const download = useDownloadUrl(fileId, requestHeaders);

  if (download.isPending) {
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Đang tải file...
      </span>
    );
  }
  if (download.isError) {
    return <p className="text-sm text-destructive">{getFileErrorMessage(download.error)}</p>;
  }

  if (isImage(contentType)) {
    return (
      // URL có chữ ký từ kho, không đi qua next/image (không cần tối ưu ảnh nhỏ, tránh cấu hình remotePatterns).
      // eslint-disable-next-line @next/next/no-img-element
      <img src={download.data.url} alt={name ?? "Ảnh"} className={className ?? "max-h-64 rounded-lg border object-contain"} />
    );
  }
  return (
    <a
      href={download.data.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
    >
      <FileTextIcon className="size-4" /> {name ?? "Mở file"} <ExternalLinkIcon className="size-3.5" />
    </a>
  );
}
