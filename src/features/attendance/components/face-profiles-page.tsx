"use client";

import { useState } from "react";
import { ScanFaceIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { useAttendanceErrorMessage, useFaceProfile, useFaceProfiles, useRevokeFace } from "../hooks";
import type { EmployeeFaceStatus } from "../types";
import { EnrollFaceDialog } from "./enroll-face-dialog";
import { PunchPhoto } from "./punch-photo";

const PAGE_SIZE = 20;

/** HR: danh sách nhân viên và trạng thái đăng ký khuôn mặt; đăng ký / đăng ký lại / gỡ. */
export function FaceProfilesPage() {
  const t = useTranslations("Attendance.enroll");
  const errorMessage = useAttendanceErrorMessage();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(keyword.trim());
  const profiles = useFaceProfiles(debounced || undefined, page, PAGE_SIZE);
  const revoke = useRevokeFace();
  const [enrolling, setEnrolling] = useState<EmployeeFaceStatus | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  async function confirmRevoke(employee: EmployeeFaceStatus) {
    try {
      await revoke.mutateAsync(employee.employeeId);
      toast.success(t("revoked", { name: employee.fullName }));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="relative max-w-sm">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(0);
          }}
          placeholder={t("search")}
          className="pl-8"
        />
      </div>

      {profiles.isPending ? (
        <LoadingState />
      ) : profiles.isError ? (
        <ErrorState error={profiles.error} onRetry={() => profiles.refetch()} />
      ) : profiles.data.content.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.enrolledAt")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.data.content.map((employee) => (
                <TableRow key={employee.employeeId}>
                  <TableCell className="tabular-nums">{employee.employeeCode}</TableCell>
                  <TableCell>
                    {employee.status === "ACTIVE" ? (
                      <button type="button" className="text-left underline-offset-4 hover:underline" onClick={() => setViewing(employee.employeeId)}>
                        {employee.fullName}
                      </button>
                    ) : (
                      employee.fullName
                    )}
                  </TableCell>
                  <TableCell>
                    {employee.status === "ACTIVE" ? (
                      <Badge variant="success">{t("statusActive", { count: employee.templateCount })}</Badge>
                    ) : employee.status === "REVOKED" ? (
                      <Badge variant="secondary">{t("statusRevoked")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("statusNone")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(employee.enrolledAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant={employee.status === "ACTIVE" ? "outline" : "default"} onClick={() => setEnrolling(employee)}>
                        <ScanFaceIcon /> {employee.status === "ACTIVE" ? t("reenroll") : t("enroll")}
                      </Button>
                      {employee.status === "ACTIVE" && (
                        <ConfirmDialog
                          trigger={
                            <Button size="icon-sm" variant="ghost" aria-label={t("revoke")}>
                              <Trash2Icon />
                            </Button>
                          }
                          title={t("revokeConfirmTitle", { name: employee.fullName })}
                          description={t("revokeConfirmDescription")}
                          confirmLabel={t("revoke")}
                          destructive
                          onConfirm={() => confirmRevoke(employee)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {profiles.data && profiles.data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {t("previous")}
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {page + 1} / {profiles.data.totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page + 1 >= profiles.data.totalPages} onClick={() => setPage(page + 1)}>
            {t("next")}
          </Button>
        </div>
      )}

      {enrolling && <EnrollFaceDialog employee={enrolling} onClose={() => setEnrolling(null)} />}
      {viewing && <TemplatesPanel employeeId={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** Xem ảnh mẫu đã đăng ký (ảnh vuông quanh mặt lưu ở kho file). */
function TemplatesPanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const t = useTranslations("Attendance.enroll");
  const profile = useFaceProfile(employeeId);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t("templatesTitle", { name: profile.data?.fullName ?? "" })}</h2>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState error={profile.error} />
      ) : (
        <div className="flex flex-wrap gap-3">
          {profile.data.templates.map((template, index) => (
            <PunchPhoto key={template.id} fileId={template.photoFileId} alt={t("photoAlt", { index: index + 1 })} className="size-28" />
          ))}
          <p className="w-full text-xs text-muted-foreground">
            {t("templatesMeta", { model: profile.data.model, consent: profile.data.consentVersion, date: formatDateTime(profile.data.consentedAt) })}
          </p>
        </div>
      )}
    </section>
  );
}
