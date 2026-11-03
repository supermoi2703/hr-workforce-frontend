"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckIcon, CircleAlertIcon, SearchIcon, UserRoundXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { assignDepartmentHead, assignTeamLead } from "../api";
import { getOrgError } from "../error-messages";
import { useOrgAdminMutation, useOrgMembers } from "../hooks";
import type { OrgChartPerson } from "../types";

export type HeadTarget = {
  kind: "department" | "team";
  id: string;
  name: string;
  current: OrgChartPerson | null;
};

/** Số ứng viên mỗi lần tải; đơn vị đông hơn thì gõ tên / mã để tìm (tìm ở backend, không giới hạn quy mô). */
const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

/** Gán / đổi / bỏ trống trưởng phòng hoặc trưởng team (cần org:manage). Chỉ chọn trong người của chính đơn vị đó. */
export function AssignHeadDialog({ target, onClose }: { target: HeadTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && <AssignHeadForm key={`${target.kind}-${target.id}`} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

type Choice = { id: string; fullName: string; employeeCode: string; position?: string };

function AssignHeadForm({ target, onDone }: { target: HeadTarget; onDone: () => void }) {
  const t = useTranslations("Organization.Admin");
  const tOrgErrors = useTranslations("Organization.Errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");

  // null = để trống. Giữ cả tên để vẫn hiện đúng người đã chọn khi đổi từ khóa tìm.
  const [selected, setSelected] = useState<Choice | null>(
    target.current ? { id: target.current.id, fullName: target.current.fullName, employeeCode: target.current.employeeCode } : null,
  );
  const [text, setText] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Ứng viên: người của đơn vị ở mọi văn phòng; trưởng hiện tại (nếu còn trong đơn vị) luôn đứng đầu do backend xếp
  const candidates = useOrgMembers(
    target.kind === "department"
      ? { departmentId: target.id, keyword: keyword || undefined }
      : { teamId: target.id, keyword: keyword || undefined },
    { page: 0, size: PAGE_SIZE },
  );
  const mutation = useOrgAdminMutation((employeeId: string | null) =>
    target.kind === "department" ? assignDepartmentHead(target.id, employeeId) : assignTeamLead(target.id, employeeId),
  );

  const people: Choice[] = (candidates.data?.content ?? []).map((person) => ({
    id: person.id,
    fullName: person.fullName,
    employeeCode: person.employeeCode,
    position: person.position?.name,
  }));
  const total = candidates.data?.totalElements ?? 0;
  const unchanged = (selected?.id ?? null) === (target.current?.id ?? null);
  const role = target.kind === "department" ? t("roleDepartmentHead") : t("roleTeamLead");

  function submit() {
    mutation.mutate(selected?.id ?? null, {
      onSuccess: () => {
        toast.success(
          selected ? t("headAssigned", { name: selected.fullName, unit: target.name }) : t("headCleared", { unit: target.name }),
        );
        onDone();
      },
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("assignTitle", { role, unit: target.name })}</DialogTitle>
        <DialogDescription>{t(target.kind === "department" ? "assignDepartmentHint" : "assignTeamHint")}</DialogDescription>
      </DialogHeader>

      {mutation.isError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{getOrgError(mutation.error, tOrgErrors, tErrors)}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("searchCandidates")}
            aria-label={t("searchCandidates")}
            className="pl-8 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        <div role="radiogroup" aria-label={role} className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-lg border p-1">
          <Option checked={selected === null} onSelect={() => setSelected(null)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
              <UserRoundXIcon className="size-4" aria-hidden />
            </span>
            <span className="font-medium">{t("vacantOption")}</span>
          </Option>
          {candidates.isPending ? (
            <div className="flex flex-col gap-1 p-1" aria-hidden>
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : people.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t("noCandidates")}</p>
          ) : (
            people.map((person) => (
              <Option key={person.id} checked={selected?.id === person.id} onSelect={() => setSelected(person)}>
                <UserAvatar name={person.fullName} seed={person.employeeCode} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{person.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">{person.employeeCode}</span>
                    {person.position && <> · {person.position}</>}
                  </span>
                </span>
              </Option>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {total > people.length ? t("candidatesHint", { shown: people.length, total }) : t("assignActiveOnly")}
        </p>
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{tCommon("cancel")}</DialogClose>
        <Button onClick={submit} disabled={unchanged || mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

function Option({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        checked ? "bg-primary/10" : "hover:bg-muted",
      )}
    >
      {children}
      {checked && <CheckIcon className="ml-auto size-4 shrink-0 text-primary" aria-hidden />}
    </button>
  );
}
