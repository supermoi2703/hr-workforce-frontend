"use client";

import { ImageOffIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePhotoUrl } from "../hooks";

/** Ảnh chấm công / ảnh mẫu từ kho file (private): xin URL có hạn rồi hiện. */
export function PunchPhoto({ fileId, alt, className }: { fileId: string | null; alt: string; className?: string }) {
  const photo = usePhotoUrl(fileId);
  const box = cn("size-12 shrink-0 rounded-md", className);

  if (!fileId || photo.isError) {
    return (
      <span className={cn(box, "flex items-center justify-center bg-muted text-muted-foreground")}>
        <ImageOffIcon className="size-4" aria-hidden />
      </span>
    );
  }
  if (photo.isPending) return <Skeleton className={box} />;
  return (
    // URL có chữ ký từ kho, không đi qua next/image (ảnh nhỏ, tránh cấu hình remotePatterns).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.data.url} alt={alt} className={cn(box, "object-cover")} />
  );
}
