"use client";

import { AnnouncementManagePage } from "@/features/announcements/components/announcement-manage-page";
import { useOrgUnits } from "@/features/employees/hooks";

/** Ghép trang quản lý bảng tin với danh mục tổ chức (feature không import nhau). */
export function AnnouncementManage() {
  const org = useOrgUnits();
  return <AnnouncementManagePage org={{ offices: org.offices, departments: org.departments, isPending: org.isPending }} />;
}
