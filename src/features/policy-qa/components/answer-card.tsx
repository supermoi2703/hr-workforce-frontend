"use client";

import { useState } from "react";
import { AlertCircleIcon, ChevronDownIcon, ChevronUpIcon, FileTextIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownContent } from "@/features/announcements/components/markdown-content";
import { formatDate } from "@/lib/format";
import { getPolicyQaError } from "../error-messages";
import {
  formatParameterValue,
  humanizeExcerpt,
  parameterLabel,
  sourceTitle,
  type ParameterTranslate,
} from "../parameter-labels";
import type { PolicyQaAnswer, PolicyQaEntry, PolicyQaParameter } from "../types";

/** Câu hỏi của người dùng, canh phải. */
export function QuestionBubble({ children }: { children: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm break-words whitespace-pre-wrap text-primary-foreground">
        {children}
      </p>
    </div>
  );
}

/** Câu trả lời của trợ lý theo trạng thái của một mục: đang tìm, đã trả lời / không có quy định, hoặc lỗi. */
export function AnswerCard({ entry, onRetry }: { entry: PolicyQaEntry; onRetry: (entry: PolicyQaEntry) => void }) {
  const t = useTranslations("PolicyQa");
  const tPolicyQaErrors = useTranslations("PolicyQa.errors");
  const tErrors = useTranslations("Errors");
  const tCommon = useTranslations("Common");

  if (entry.state === "pending") {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground"
        role="status"
      >
        <Spinner className="size-4" />
        {t("searching")}
      </div>
    );
  }
  if (entry.state === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>{getPolicyQaError(entry.error, tPolicyQaErrors, tErrors)}</span>
          <Button variant="outline" size="sm" onClick={() => onRetry(entry)}>
            <RefreshCwIcon />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const answer = entry.answer;
  if (!answer) return null;
  if (!answer.answered) {
    return <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{t("noAnswer")}</div>;
  }
  return <Answered answer={answer} />;
}

function Answered({ answer }: { answer: PolicyQaAnswer }) {
  const t = useTranslations("PolicyQa");
  const tParameters = useTranslations("PolicyQa.parameters") as unknown as ParameterTranslate;
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border bg-card px-4 py-3">
      <MarkdownContent>{answer.answer}</MarkdownContent>
      {answer.parameters.length > 0 && <Parameters parameters={answer.parameters} />}
      <div className="space-y-2 border-t pt-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded text-left text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {t("sourcesTitle", { count: answer.sources.length })}
            {answer.sources.map((source) => (
              <Badge key={source.id} variant="outline" className="font-normal">
                <FileTextIcon />
                {sourceTitle(source.section, source.file)}
              </Badge>
            ))}
          </span>
          {open ? <ChevronUpIcon className="size-4 shrink-0" /> : <ChevronDownIcon className="size-4 shrink-0" />}
        </button>
        {open && (
          <ul className="space-y-3">
            {answer.sources.map((source) => (
              <li key={source.id} className="rounded-lg bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{source.section}</p>
                <MarkdownContent className="text-xs">{humanizeExcerpt(source.excerpt, tParameters)}</MarkdownContent>
              </li>
            ))}
            {answer.parameters.length > 0 && <li className="text-xs text-muted-foreground">{t("defaultNote")}</li>}
          </ul>
        )}
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {t("responseTime", { seconds: (answer.latencyMs / 1000).toFixed(1) })}
      </p>
    </div>
  );
}

/** Giá trị đang áp dụng của các tham số được nhắc trong câu trả lời, và thay đổi đã lên lịch. */
function Parameters({ parameters }: { parameters: PolicyQaParameter[] }) {
  const t = useTranslations("PolicyQa.parameters");
  const translate = t as unknown as ParameterTranslate;
  // Chỉ hiện tham số có nhãn: không để lộ tên khóa kỹ thuật
  const labelled = parameters.flatMap((parameter) => {
    const label = parameterLabel(parameter.key, translate);
    return label ? [{ parameter, label }] : [];
  });
  if (labelled.length === 0) return null;
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-xs">
      <p className="mb-1 font-medium">{t("title")}</p>
      <ul className="space-y-1">
        {labelled.map(({ parameter, label }) => (
          <li key={parameter.key} className="flex flex-wrap items-baseline gap-x-2">
            <span>{label}:</span>
            <span className="font-semibold">{formatParameterValue(parameter.key, parameter.value, translate)}</span>
            {parameter.nextFrom && parameter.nextValue !== null && (
              <span className="text-muted-foreground">
                {t("upcoming", {
                  date: formatDate(parameter.nextFrom),
                  value: formatParameterValue(parameter.key, parameter.nextValue, translate),
                })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
