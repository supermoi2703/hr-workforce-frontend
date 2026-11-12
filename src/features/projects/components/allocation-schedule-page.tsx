"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LockIcon, UserRoundSearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isApiError } from "@/lib/api/errors";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { formatDate, todayIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { freePercentOn, scheduleRange, segmentBars, type SegmentBar } from "../allocation-rules";
import { EMPLOYEE_SEARCH_MIN_LENGTH } from "../hooks";
import type { ProjectPerson } from "../types";
import { useAllocationPeople, usePersonAllocations } from "../work-hooks";
import type { AllocationViewerReach, PersonAllocations } from "../work-types";
import { PersonPicker } from "./employee-picker";
import { AllocationTimeline } from "./allocation-timeline";

type UrlPatch = { employeeId?: string | null; from?: string | null; to?: string | null };

/**
 * Trang /allocations: lịch phân bổ của một người trên mọi dự án (chỉ xem). Ai mở được lịch của ai do backend quyết định
 * (README module project mục 8.6); trang chỉ hiện ô chọn người theo `reach`. Người và khoảng ngày nằm trên URL.
 */
export function AllocationSchedulePage() {
  const t = useTranslations("Allocations.Schedule");
  const { user } = useCurrentUser();
  const me = user?.employeeId ?? null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const range = useMemo(() => scheduleRange(searchParams.get("from"), searchParams.get("to")), [searchParams]);
  const target = searchParams.get("employeeId") ?? me;
  const schedule = usePersonAllocations(target, range.from, range.to);
  const reach = useAllocationPeople("").data?.reach;

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

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-end">
        {reach && reach !== "SELF" && (
          <div className="grid gap-1.5 md:w-80">
            <Label htmlFor="schedule-person">{t("person")}</Label>
            <AllocationPersonPicker
              id="schedule-person"
              reach={reach}
              value={viewed}
              onChange={(person) => update({ employeeId: person.id === me ? null : person.id })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:flex">
          <div className="grid gap-1.5">
            <Label htmlFor="schedule-from">{t("from")}</Label>
            <Input
              id="schedule-from"
              type="date"
              value={range.from ?? schedule.data?.from ?? ""}
              onChange={(event) => update({ from: event.target.value || null })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="schedule-to">{t("to")}</Label>
            <Input
              id="schedule-to"
              type="date"
              min={range.from ?? schedule.data?.from}
              value={range.to ?? schedule.data?.to ?? ""}
              onChange={(event) => update({ to: event.target.value || null })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          {(range.from || range.to) && (
            <Button variant="ghost" onClick={() => update({ from: null, to: null })}>
              {t("resetRange")}
            </Button>
          )}
          {me && target !== me && (
            <Button variant="outline" onClick={() => update({ employeeId: null })}>
              {t("mine")}
            </Button>
          )}
        </div>
      </div>

      {!target ? (
        <EmptyState
          className="border border-dashed"
          icon={<UserRoundSearchIcon />}
          title={t("pickTitle")}
          description={t("pickDescription")}
        />
      ) : schedule.isPending ? (
        <LoadingState />
      ) : forbidden ? (
        <EmptyState className="border border-dashed" icon={<LockIcon />} title={t("forbiddenTitle")} description={t("forbidden")} />
      ) : schedule.isError ? (
        <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
      ) : (
        <ScheduleView schedule={schedule.data} isMine={schedule.data.employee.id === me} />
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

function ScheduleView({ schedule, isMine }: { schedule: PersonAllocations; isMine: boolean }) {
  const t = useTranslations("Allocations.Schedule");
  const today = todayIsoDate();
  const bars = segmentBars(schedule.segments, schedule.from, schedule.to);
  const freeToday = freePercentOn(schedule.segments, today);
  const { fullName, employeeCode } = schedule.employee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isMine ? t("myScheduleTitle") : t("scheduleOf", { name: fullName })}</CardTitle>
        <CardDescription>
          {[employeeCode, t("period", { from: formatDate(schedule.from), to: formatDate(schedule.to) })]
            .filter(Boolean)
            .join(" · ")}
          {freeToday !== null && <> · {t("freeToday", { percent: freeToday })}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <AllocationTimeline from={schedule.from} to={schedule.to} today={today} bars={bars} items={schedule.items} />
        <SegmentList bars={bars} />
      </CardContent>
    </Card>
  );
}

/** Cùng số liệu với thanh tổng, dạng chữ: đọc được bằng trình đọc màn hình và trên màn hình hẹp. */
function SegmentList({ bars }: { bars: SegmentBar[] }) {
  const t = useTranslations("Allocations.Schedule");
  return (
    <section className="grid gap-1.5">
      <h3 className="text-sm font-medium">{t("segmentsTitle")}</h3>
      <ul className="grid gap-1 text-sm">
      {bars.map((bar) => (
        <li key={bar.start} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dashed py-1 last:border-b-0">
          <span className="tabular-nums">
            {bar.start === bar.end ? formatDate(bar.start) : `${formatDate(bar.start)} – ${formatDate(bar.end)}`}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {bar.pendingPercent > 0
              ? t("segmentShort", { approved: bar.approvedPercent, held: bar.pendingPercent })
              : t("segmentApprovedOnly", { approved: bar.approvedPercent })}{" "}
            <span className={cn("font-medium", bar.freePercent === 0 ? "text-destructive" : "text-foreground")}>
              {t("free", { percent: bar.freePercent })}
            </span>
          </span>
        </li>
      ))}
      </ul>
    </section>
  );
}
