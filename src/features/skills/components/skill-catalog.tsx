"use client";

import { useMemo, useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { setSkillActive } from "../api";
import { useSkillCatalog, useSkillErrorMessage, useSkillMutation } from "../hooks";
import { filterSkills, groupByCategory } from "../rules";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "../types";
import { SkillFormDialog, type SkillFormTarget } from "./skill-form-dialog";

const ALL = "all";

/**
 * Tab "Danh mục" (skill:manage): thêm, sửa, ngừng dùng / dùng lại. Không xóa (kỹ năng đã khai vẫn giữ). Danh mục nhỏ
 * nên tải một lần và lọc ở frontend.
 */
export function SkillCatalog() {
  const t = useTranslations("Skills.Catalog");
  const tCategory = useTranslations("Skills.Categories");
  const query = useSkillCatalog();
  const errorMessage = useSkillErrorMessage();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<SkillCategory | undefined>();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState<SkillFormTarget>(null);
  const [toggling, setToggling] = useState<Skill | null>(null);
  const toggle = useSkillMutation((skill: Skill) => setSkillActive(skill.id, !skill.active));

  const all = query.data;
  // Cùng thứ tự nhóm với các tab khác (backend sắp theo mã nhóm), trong nhóm giữ thứ tự tên của backend.
  const rows = useMemo(
    () => (all ? groupByCategory(filterSkills(all, { text, category, includeInactive })).flatMap((group) => group.items) : []),
    [all, text, category, includeInactive],
  );
  const inactiveCount = all?.filter((s) => !s.active).length ?? 0;
  const categoryItems: Record<string, string> = {
    [ALL]: t("allCategories"),
    ...Object.fromEntries(SKILL_CATEGORIES.map((c) => [c, tCategory(c)])),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={includeInactive} onCheckedChange={(checked) => setIncludeInactive(!!checked)} />
          {t("showInactive", { count: inactiveCount })}
        </Label>
        <Button size="sm" className="sm:ml-auto" onClick={() => setForm("create")}>
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
      ) : rows.length === 0 ? (
        <EmptyState
          className="border border-dashed py-12"
          title={all && all.length > 0 ? t("noMatchTitle") : t("emptyTitle")}
          description={all && all.length > 0 ? t("noMatch") : t("empty")}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("description")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((skill) => (
                <TableRow key={skill.id} className={skill.active ? undefined : "text-muted-foreground"}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {skill.name}
                      {!skill.active && <Badge variant="outline">{t("inactive")}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{skill.code}</TableCell>
                  <TableCell>{tCategory(skill.category)}</TableCell>
                  <TableCell className="hidden max-w-80 truncate md:table-cell" title={skill.description ?? undefined}>
                    {skill.description || <span className="text-muted-foreground">—</span>}
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
                          <DropdownMenuItem variant="destructive" onClick={() => setToggling(skill)}>
                            <ArchiveIcon /> {t("deactivate")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setToggling(skill)}>
                            <ArchiveRestoreIcon /> {t("activate")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SkillFormDialog target={form} onClose={() => setForm(null)} />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        title={t(toggling?.active ? "deactivateTitle" : "activateTitle", { name: toggling?.name ?? "" })}
        description={toggling?.active ? t("deactivateDescription") : t("activateDescription")}
        confirmLabel={toggling?.active ? t("deactivate") : t("activate")}
        destructive={!!toggling?.active}
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
