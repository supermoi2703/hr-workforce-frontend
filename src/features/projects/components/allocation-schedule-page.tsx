"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LockIcon, UserRoundSearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";
import { todayIsoDate } from "@/lib/format";
import { EMPLOYEE_SEARCH_MIN_LENGTH } from "../hooks";
import type { ProjectPerson } from "../types";
import { useAllocationPeople, usePersonAllocations } from "../work-hooks";
import type { AllocationViewerReach } from "../work-types";
import { TimelineToolbar } from "../timeline/timeline-parts";
import { parseZoom, shiftedFrom, timelineWindow, type Zoom } from "../timeline/timeline-scale";
import { PersonPicker } from "./employee-picker";
import { AllocationPersonView } from "./allocation-person-view";
import { AllocationTeamView } from "./allocation-team-view";

type Mode = "person" | "team";
type UrlPatch = { employeeId?: string | null; from?: string | null; zoom?: string | null; mode?: string | null };

/**
 * Trang /allocations: lịch tải theo người (workload bước 5). Hai chế độ:
 * - Một người: biểu đồ tải theo tuần + việc trên mọi dự án (dự án không xem được nội dung thì chỉ có số việc);
 * - Cả nhóm: bảng tải theo tuần của những người mình xem được lịch, nặng nhất trước.
 * Ai xem được lịch của ai do backend quyết định (README module project mục 8.6). Người, chế độ, mức phóng to và ngày đầu
 * nằm trên URL để gửi link được.
 */
export function AllocationSchedulePage() {
  const t = useTranslations("Allocations.Schedule");
  const { user } = useCurrentUser();
  const me = user?.employeeId ?? null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = todayIsoDate();
  const zoom = parseZoom(searchParams.get("zoom"));
  const window = timelineWindow(zoom, searchParams.get("from"), today);
  const reach = useAllocationPeople("").data?.reach;
  const canSeeOthers = reach !== undefined && reach !== "SELF";
  const mode: Mode = canSeeOthers && searchParams.get("mode") === "team" ? "team" : "person";
  const target = searchParams.get("employeeId") ?? me;
  // Chờ biết `reach` rồi mới tải: link ?mode=team không tải nhầm lịch một người.
  const schedule = usePersonAllocations(mode === "person" && reach !== undefined ? target : null, window.from, window.to);

  const update = useCallback(
    (patch: UrlPatch) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(patch)) {
        if (value) next.set(name, value);
        else next.delete(name);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const viewed: ProjectPerson | null = schedule.data
    ? { ...schedule.data.employee, employeeCode: schedule.data.employee.employeeCode ?? "" }
    : null;
  const forbidden = isApiError(schedule.error) && schedule.error.status === 403;
  const toolbar = (
    <TimelineToolbar
      window={window}
      zoom={zoom}
      onZoom={(value: Zoom) => update({ zoom: value === "month" ? null : value, from: null })}
      onShift={(direction) => update({ from: shiftedFrom(window.from, zoom, direction) })}
      onToday={() => update({ from: null })}
    />
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canSeeOthers ? (
            <div role="group" aria-label={t("modeLabel")} className="flex rounded-lg bg-muted p-0.5">
              {(["person", "team"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => update({ mode: value === "person" ? null : value })}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    mode === value && "bg-card text-primary shadow-sm",
                  )}
                >
                  {t(`mode.${value}`)}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {mode === "team" ? (
        <AllocationTeamView
          reach={reach!}
          window={window}
          toolbar={toolbar}
          onOpenPerson={(id) => update({ mode: null, employeeId: id === me ? null : id })}
        />
      ) : (
        <>
          {canSeeOthers && (
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end">
              <div className="grid gap-1.5 md:w-80">
                <Label htmlFor="schedule-person">{t("person")}</Label>
                <AllocationPersonPicker
                  id="schedule-person"
                  reach={reach as Exclude<AllocationViewerReach, "SELF">}
                  value={viewed}
                  onChange={(person) => update({ employeeId: person.id === me ? null : person.id })}
                />
              </div>
              {me && target !== me && (
                <Button variant="outline" className="md:ml-auto" onClick={() => update({ employeeId: null })}>
                  {t("mine")}
                </Button>
              )}
            </div>
          )}

          {!target ? (
            <EmptyState className="border border-dashed" icon={<UserRoundSearchIcon />} title={t("pickTitle")} description={t("pickDescription")} />
          ) : schedule.isPending ? (
            <LoadingState />
          ) : forbidden ? (
            <EmptyState className="border border-dashed" icon={<LockIcon />} title={t("forbiddenTitle")} description={t("forbidden")} />
          ) : schedule.isError ? (
            <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
          ) : (
            <AllocationPersonView schedule={schedule.data} isMine={schedule.data.employee.id === me} window={window} zoom={zoom} today={today} toolbar={toolbar} />
          )}
        </>
      )}
    </>
  );
}

type AllocationPersonPickerProps = {
  id: string;
  reach: Exclude<AllocationViewerReach, "SELF">;
  value: ProjectPerson | null;
  onChange: (person: ProjectPerson) => void;
};

/** SCOPED: danh sách có sẵn, gõ để lọc. ALL: tìm cả công ty, gõ ít nhất 2 ký tự. */
function AllocationPersonPicker({ id, reach, value, onChange }: AllocationPersonPickerProps) {
  const tPicker = useTranslations("Projects.Picker");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const keyword = useDebouncedValue(text.trim());
  const tooShort = reach === "ALL" && keyword.length < EMPLOYEE_SEARCH_MIN_LENGTH;
  const options = useAllocationPeople(keyword, open && !tooShort);

  return (
    <PersonPicker
      id={id}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      text={text}
      onTextChange={setText}
      options={{ data: options.data?.people, isPending: options.isPending, isError: options.isError }}
      hint={tooShort ? tPicker("typeMore") : null}
    />
  );
}
