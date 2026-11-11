"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "../types";
import { useSourceProjects } from "../work-hooks";

export type SourceProject = Pick<ProjectListItem, "id" | "code" | "name">;

type ProjectSourcePickerProps = {
  value: SourceProject | null;
  onChange: (project: SourceProject) => void;
  /** Dự án đang đề xuất phân bổ: không lấy người từ chính nó. */
  excludeId: string;
  id?: string;
};

/**
 * Chọn dự án để lấy người (đề xuất phân bổ "từ dự án khác"). Tìm ở backend theo mã hoặc tên thay vì tải hết, vì công ty
 * có thể có hàng trăm dự án. Chưa gõ gì thì gợi ý dự án đang chạy; gõ thì tìm cả dự án đã đóng (đội vừa xong việc).
 */
export function ProjectSourcePicker({ value, onChange, excludeId, id }: ProjectSourcePickerProps) {
  const t = useTranslations("Allocations.ProjectPicker");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const keyword = useDebouncedValue(text.trim());
  const projects = useSourceProjects(keyword, open);
  const options = (projects.data?.content ?? []).filter((project) => project.id !== excludeId);

  function pick(project: SourceProject) {
    onChange({ id: project.id, code: project.code, name: project.name });
    setOpen(false);
    setText("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button variant="outline" className={cn("w-full justify-between bg-card font-normal", !value && "text-muted-foreground")} />
        }
      >
        <span className="truncate">{value ? `${value.code} · ${value.name}` : t("placeholder")}</span>
        <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 gap-0 p-0">
        <div className="relative border-b p-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-8 pl-8"
          />
        </div>
        {!keyword && <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">{t("activeHint")}</p>}
        <div className="max-h-64 overflow-y-auto p-1" role="listbox" aria-label={t("listLabel")}>
          {projects.isPending && (
            <div className="space-y-1 p-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
          {projects.isError && <p className="px-3 py-6 text-center text-sm text-destructive">{t("loadFailed")}</p>}
          {projects.data && options.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noMatch")}</p>
          )}
          {options.map((project) => {
            const selected = value?.id === project.id;
            return (
              <button
                key={project.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(project)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
              >
                <span className="shrink-0 font-medium tabular-nums">{project.code}</span>
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {project.status === "CLOSED" && <Badge variant="secondary">{t("closed")}</Badge>}
                {selected && <CheckIcon className="size-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
          {projects.data && projects.data.totalElements > projects.data.content.length && (
            <p className="px-3 py-1.5 text-center text-xs text-muted-foreground">{t("more")}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
