"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatMinutes } from "../work-rules";
import { useAiErrorMessage, useTaskProfile } from "./hooks";
import type { TaskProfile } from "./types";

type Asked = { title: string; description: string };

/**
 * Phần A của trợ lý phân bổ AI trong form việc: PM bấm nút thì AI đọc tiêu đề + mô tả, đoán nhóm công việc và kỹ năng
 * (chỉ trong danh mục). PM bấm "Áp dụng" mới điền vào form; không tự chạy khi gõ để tiết kiệm hạn mức. Chỉ hiện khi
 * trợ lý đang bật (người gọi kiểm tra).
 */
export function TaskProfileHint({
  projectId,
  title,
  description,
  onApply,
}: {
  projectId: string;
  title: string;
  description: string;
  onApply: (profile: TaskProfile) => void;
}) {
  const t = useTranslations("AllocationAi.profile");
  const errorMessage = useAiErrorMessage();
  const mutation = useTaskProfile(projectId);
  const [asked, setAsked] = useState<Asked | null>(null);
  const [result, setResult] = useState<TaskProfile | null>(null);

  const current: Asked = { title: title.trim(), description: description.trim() };
  const stale = !!asked && (asked.title !== current.title || asked.description !== current.description);

  function ask() {
    setAsked(current);
    setResult(null);
    mutation.mutate(
      { title: current.title, description: current.description || null },
      { onSuccess: (profile) => setResult(profile) },
    );
  }

  function apply(profile: TaskProfile) {
    onApply(profile);
    setResult(null);
    setAsked(null);
  }

  const empty = !!result && !result.category && result.skills.length === 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" size="sm" variant="outline" disabled={!current.title || mutation.isPending} onClick={ask}>
          {mutation.isPending ? <Spinner /> : <SparklesIcon aria-hidden />}
          {asked && !mutation.isPending ? t("askAgain") : t("ask")}
        </Button>
        <span className="text-xs text-muted-foreground">{current.title ? t("hint") : t("needTitle")}</span>
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(mutation.error)}
        </p>
      )}

      {result && (
        <div className="grid gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm" aria-live="polite">
          {empty ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              <dl className="grid gap-1.5 sm:grid-cols-[auto_1fr] sm:gap-x-3">
                <dt className="text-muted-foreground">{t("category")}</dt>
                <dd>
                  {result.category
                    ? t("categoryValue", { name: result.category.name, hours: formatMinutes(result.category.defaultMinutes) })
                    : t("noCategory")}
                </dd>
                <dt className="text-muted-foreground">{t("skills")}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {result.skills.length === 0
                    ? t("noSkills")
                    : result.skills.map((skill) => (
                        <Badge key={skill.skillId} variant="secondary">
                          {skill.minLevel != null ? t("skillLevel", { name: skill.name, level: skill.minLevel }) : skill.name}
                        </Badge>
                      ))}
                </dd>
              </dl>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {stale ? t("stale") : result.source === "AI" ? t("sourceAi") : t("sourceSearch")}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)}>
                  {t("dismiss")}
                </Button>
                <Button type="button" size="sm" onClick={() => apply(result)}>
                  {t("apply")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
