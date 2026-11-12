"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementManagePage } from "@/features/announcements/components/announcement-manage-page";
import type { CoverUploader } from "@/features/announcements/types";
import { useOrgUnits } from "@/features/employees/hooks";
import { getFileErrorMessage } from "@/features/files/errors";
import { uploadFile } from "@/features/files/upload";

/**
 * Ghép trang quản lý bảng tin với danh mục tổ chức (features/employees) và việc tải ảnh bìa lên kho (features/files):
 * feature không import nhau nên route làm cầu nối.
 */
export function AnnouncementManage() {
  const org = useOrgUnits();
  const tErrors = useTranslations("Errors");

  const uploader = useMemo<CoverUploader>(
    () => ({
      upload: (file, onProgress, signal) => uploadFile("ANNOUNCEMENT_COVER", file, { onProgress, signal }),
      describeError: (error) => getFileErrorMessage(error, tErrors),
    }),
    [tErrors],
  );

  return (
    <AnnouncementManagePage
      org={{ offices: org.offices, departments: org.departments, isPending: org.isPending }}
      uploader={uploader}
    />
  );
}
