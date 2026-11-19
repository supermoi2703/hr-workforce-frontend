"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircleIcon, InfoIcon, RotateCcwIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isValidQuestion, MAX_QUESTION_LENGTH, toHistory } from "../conversation";
import { useAskPolicyQa, usePolicyQaStatus } from "../hooks";
import type { PolicyQaEntry } from "../types";
import { AnswerCard, QuestionBubble } from "./answer-card";

const SUGGESTIONS = ["leave", "remote", "lunch", "approval"] as const;

/**
 * Trang hỏi đáp chính sách (AI-2), mở cho mọi vai trò từ 18/11. Hội thoại chỉ nằm trong bộ nhớ trang: tải lại là hỏi lại từ đầu. Mỗi câu hỏi gửi kèm
 * vài lượt đã được trả lời gần nhất để hiểu câu hỏi nối tiếp.
 */
export function PolicyQaPage() {
  const t = useTranslations("PolicyQa");
  const status = usePolicyQaStatus();
  const ask = useAskPolicyQa();
  const [entries, setEntries] = useState<PolicyQaEntry[]>([]);
  const [text, setText] = useState("");
  const nextId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const busy = entries.some((entry) => entry.state === "pending");
  const disabled = status.data ? !status.data.enabled : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  function update(id: string, patch: Partial<PolicyQaEntry>) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function submit(raw: string) {
    const question = raw.trim();
    if (busy || disabled || !isValidQuestion(question)) return;
    const id = String(nextId.current++);
    const history = toHistory(entries);
    setEntries((current) => [...current, { id, question, state: "pending" }]);
    setText("");
    ask.mutate(
      { question, history },
      {
        onSuccess: (answer) => update(id, { state: "done", answer }),
        onError: (error) => update(id, { state: "error", error }),
      },
    );
  }

  function retry(entry: PolicyQaEntry) {
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    submit(entry.question);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setEntries([])} disabled={busy}>
              <RotateCcwIcon />
              {t("newConversation")}
            </Button>
          )
        }
      />

      {disabled && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{t("status.disabled")}</AlertDescription>
        </Alert>
      )}
      {status.data?.enabled && status.data.mode !== "HYBRID" && (
        <Alert>
          <InfoIcon />
          <AlertDescription>{t("status.keywordOnly")}</AlertDescription>
        </Alert>
      )}

      <section className="flex min-h-64 flex-col gap-4" aria-live="polite">
        {entries.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed p-6">
            <p className="text-sm font-medium">{t("suggestionsTitle")}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 text-left whitespace-normal"
                  disabled={disabled}
                  onClick={() => submit(t(`suggestions.${key}`))}
                >
                  {t(`suggestions.${key}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <QuestionBubble>{entry.question}</QuestionBubble>
              <AnswerCard entry={entry} onRetry={retry} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </section>

      <form
        className="sticky bottom-0 space-y-2 bg-background/95 pt-2 pb-1 backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          submit(text);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter gửi, Shift + Enter xuống dòng; đang gõ tiếng Việt bằng bộ gõ (IME) thì Enter là chốt chữ, không gửi
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(text);
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("inputLabel")}
            maxLength={MAX_QUESTION_LENGTH}
            rows={2}
            className="min-h-14 resize-none"
            disabled={disabled}
          />
          <Button type="submit" disabled={busy || disabled || !isValidQuestion(text)}>
            <SendIcon />
            {t("ask")}
          </Button>
        </div>
        <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("hint")}</span>
          <span className={cn(text.length > MAX_QUESTION_LENGTH * 0.9 && "text-destructive")}>
            {text.length}/{MAX_QUESTION_LENGTH}
          </span>
        </p>
      </form>
    </div>
  );
}
