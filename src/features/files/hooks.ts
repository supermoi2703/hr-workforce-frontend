import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDownloadUrl } from "./api";
import type { FilePurpose, StoredFile } from "./types";
import { uploadFile } from "./upload";

export const fileKeys = {
  downloadUrl: (fileId: string) => ["files", fileId, "download-url"] as const,
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; file: StoredFile }
  | { status: "error"; error: unknown };

/** Tải một file lên theo purpose, có tiến trình và hủy. */
export function useFileUpload(purpose: FilePurpose, headers?: HeadersInit) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: "uploading", progress: 0 });
      try {
        const stored = await uploadFile(purpose, file, {
          headers,
          signal: controller.signal,
          onProgress: (progress) => setState({ status: "uploading", progress }),
        });
        setState({ status: "done", file: stored });
        return stored;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setState({ status: "idle" });
          return null;
        }
        setState({ status: "error", error });
        return null;
      }
    },
    [purpose, headers],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, upload, cancel, reset };
}

// Link có hạn 10 phút ở backend; làm mới sớm hơn để ảnh không bị hỏng khi để trang lâu.
const DOWNLOAD_URL_STALE_MS = 8 * 60 * 1000;

/** URL xem/tải file (dùng làm src của <img> hoặc href). */
export function useDownloadUrl(fileId: string | null | undefined, headers?: HeadersInit) {
  return useQuery({
    queryKey: fileKeys.downloadUrl(fileId ?? ""),
    queryFn: ({ signal }) => getDownloadUrl(fileId as string, { headers, signal }),
    enabled: Boolean(fileId),
    staleTime: DOWNLOAD_URL_STALE_MS,
    refetchInterval: DOWNLOAD_URL_STALE_MS,
    retry: false,
  });
}
