"use client";

import { Fragment, useMemo, useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { setSkillActive } from "../api";
import { useSkillCatalog, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { countCatalog, filterSkills, groupCatalog } from "../rules";
import { CATALOG_STATUSES, SKILL_CATEGORIES, type CatalogStatus, type Skill, type SkillCategory } from "../types";
import { SkillFormDialog, type SkillFormTarget } from "./skill-form-dialog";

const ALL = "all";
const COLUMN_COUNT = 4;

/**
 * Tab "Danh mục" (skill:manage): thêm, sửa, ngừng dùng / dùng lại. Không xóa (kỹ năng đã khai vẫn giữ). Danh mục nhỏ
 * (~50, thực tế 100–200) nên tải một lần và lọc ở frontend, không phân trang (README backend skill mục 5).
 * Lọc theo trạng thái để HR xem riêng kỹ năng đã ngừng dùng; ở "Tất cả", kỹ năng ngừng dùng nằm cuối mỗi nhóm.
 */
export function SkillCatalog() {
  const t = useTranslations("Skills.Catalog");
  const tCategory = useTranslations("Skills.Categories");
  const query = useSkillCatalog();
  const errorMessage = useSkillErrorMessage();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<SkillCategory | undefined>();
  const [status, setStatus] = useState<CatalogStatus>("active");
  const [form, setForm] = useState<SkillFormTarget>(null);
  const [toggling, setToggling] = useState<Skill | null>(null);
  // Giữ kỹ năng vừa chọn để chữ trong hộp xác nhận không đổi khi hộp đang đóng (toggling đã về null).
  const [lastToggled, setLastToggled] = useState<Skill | null>(null);
  const toggle = useSkillMutation((skill: Skill) => setSkillActive(skill.id, !skill.active));

  const all = query.data;
  const counts = useMemo(() => countCatalog(all ?? []), [all]);
  const groups = useMemo(() => (all ? groupCatalog(filterSkills(all, { text, category, status })) : []), [all, text, category, status]);
  const categoryItems: Record<string, string> = {
    [ALL]: t("allCategories"),
    ...Object.fromEntries(SKILL_CATEGORIES.map((c) => [c, tCategory(c)])),
  };

  function askToggle(skill: Skill) {
    setToggling(skill);
    setLastToggled(skill);
  }
  const shown = toggling ?? lastToggled;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Tabs value={status} onValueChange={(value) => setStatus(value as CatalogStatus)}>
          <TabsList aria-label={t("status")}>
            {CATALOG_STATUSES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t(`statusFilter.${value}`)}
                <span className="text-muted-foreground tabular-nums">{counts[value]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="bg-card pl-8"
          />
        </div>
        <Select
          value={category ?? ALL}
          onValueChange={(value) => setCategory(!value || value === ALL ? undefined : (String(value) as SkillCategory))}
          items={categoryItems}
        >
          <SelectTrigger className="w-full bg-card sm:w-52" aria-label={t("category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="lg:ml-auto" onClick={() => setForm("create")}>
          <PlusIcon /> {t("add")}
        </Button>
      </div>

      {query.isPending ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          className="border border-dashed py-12"
          title={!all?.length ? t("emptyTitle") : status === "inactive" && !text && !category ? t("noInactiveTitle") : t("noMatchTitle")}
          description={!all?.length ? t("empty") : status === "inactive" && !text && !category ? t("noInactive") : t("noMatch")}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("description")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.category}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={COLUMN_COUNT} className="py-1.5 text-xs font-medium text-muted-foreground">
                      {tCategory(group.category)} · {group.items.length}
                    </TableCell>
                  </TableRow>
                  {group.items.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn("font-medium", !skill.active && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                            {skill.name}
                          </span>
                          {!skill.active && (
                            <Badge variant="warning">
                              <ArchiveIcon aria-hidden /> {t("inactive")}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className={cn("font-mono text-xs", !skill.active && "text-muted-foreground")}>{skill.code}</TableCell>
                      <TableCell className="hidden max-w-80 truncate text-muted-foreground md:table-cell" title={skill.description ?? undefined}>
                        {skill.description || "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("actionsFor", { name: skill.name })} />}>
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setForm(skill)}>
                              <PencilIcon /> {t("edit")}
                            </DropdownMenuItem>
                            {skill.active ? (
                              <DropdownMenuItem variant="destructive" onClick={() => askToggle(skill)}>
                                <ArchiveIcon /> {t("deactivate")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => askToggle(skill)}>
                                <ArchiveRestoreIcon /> {t("activate")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SkillFormDialog target={form} onClose={() => setForm(null)} />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        title={t(shown?.active ? "deactivateTitle" : "activateTitle", { name: shown?.name ?? "" })}
        description={shown?.active ? t("deactivateDescription") : t("activateDescription")}
        confirmLabel={shown?.active ? t("deactivate") : t("activate")}
        destructive={!!shown?.active}
        onConfirm={() =>
          toggle.mutateAsync(toggling!).then(
            (result) => toast.success(t(result.active ? "activated" : "deactivated", { name: result.name })),
            (error: unknown) => {
              toast.error(errorMessage(error));
              throw error;
            },
          )
        }
      />
    </div>
  );
}
