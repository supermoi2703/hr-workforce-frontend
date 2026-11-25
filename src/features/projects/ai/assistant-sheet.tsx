"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, SendIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SuggestAssigneeDialog } from "../components/suggest-assignee-dialog";
import { TaskFormDialog } from "../components/task-form-dialog";
import type { Project } from "../types";
import { AssistantAnswerView, Examples } from "./assistant-answer";
import { MAX_QUESTION_LENGTH, criteriaForTask, taskFromWork } from "./assistant-rules";
import { useAiErrorMessage, type useAssistantConversation } from "./hooks";
import type { Understood } from "./types";

type Conversation = ReturnType<typeof useAssistantConversation>;

/**
 * Bảng "Trợ lý AI" bên phải trang dự án (workload bước 6, phần B): PM hỏi bằng câu, trợ lý hiểu thành điều kiện rồi hiện
 * kết quả của lõi luật. Chỉ người điều phối dự án mở được (người gọi kiểm tra). Hội thoại do trang giữ, đóng mở lại vẫn
 * còn.
 *
 * @param task việc đang mở khi bấm "Hỏi trợ lý" trong task (ngữ cảnh "việc này"); null = cả dự án
 */
export function AssistantSheet({
  project,
  open,
  onOpenChange,
  conversation,
  task,
  onOpenTask,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  task: { id: string; key: string } | null;
  onOpenTask: (key: string) => void;
}) {
  const t = useTranslations("AllocationAi.assistant");
  const errorMessage = useAiErrorMessage();
  const router = useRouter();
  const [text, setText] = useState("");
  const [suggesting, setSuggesting] = useState<Understood | null>(null);
  const [creating, setCreating] = useState<Understood | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { entries, pending, ask, retry, clear } = conversation;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries, open]);

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH || pending) return;
    ask(trimmed, task?.id ?? null);
    setText("");
  }

  const actions = {
    onOpenSuggest: (understood: Understood) => setSuggesting(understood),
    onCreateTask: (understood: Understood) => setCreating(understood),
    onOpenTask: (key: string) => {
      onOpenChange(false);
      onOpenTask(key);
    },
    onOpenPerson: (employeeId: string) => router.push(`/allocations?employeeId=${encodeURIComponent(employeeId)}`),
    onAsk: submit,
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary" aria-hidden />
              {t("title")}
            </SheetTitle>
            <SheetDescription>{task ? t("descriptionTask", { key: task.key }) : t("description")}</SheetDescription>
          </SheetHeader>

          <section className="grid flex-1 content-start gap-4 overflow-y-auto p-4" aria-live="polite">
            {entries.length === 0 ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">{t("intro")}</p>
                <Examples onAsk={submit} disabled={pending} withTask={!!task} />
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="grid gap-2">
                  <p className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
                    {entry.question}
                  </p>
                  {entry.status === "pending" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner /> {t("thinking")}
                    </p>
                  )}
                  {entry.status === "error" && (
                    <div role="alert" className="grid gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <p className="text-destructive">{errorMessage(entry.error)}</p>
                      <p className="text-xs text-muted-foreground">{t("fallback")}</p>
                      <Button size="sm" variant="outline" className="justify-self-start" disabled={pending} onClick={() => retry(entry.id)}>
                        <RotateCcwIcon /> {t("retry")}
                      </Button>
                    </div>
                  )}
                  {entry.status === "done" && entry.answer && <AssistantAnswerView answer={entry.answer} actions={actions} />}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </section>

          <form
            className="grid gap-2 border-t p-4"
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
                  // Enter gửi, Shift + Enter xuống dòng; đang gõ bằng bộ gõ tiếng Việt (IME) thì Enter là chốt chữ
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
              />
              <Button type="submit" disabled={pending || !text.trim()} aria-label={t("send")}>
                <SendIcon />
              </Button>
            </div>
            <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{t("privacy")}</span>
              <span className="flex items-center gap-3">
                {entries.length > 0 && (
                  <Button type="button" size="sm" variant="link" className="h-auto p-0 text-xs" disabled={pending} onClick={clear}>
                    {t("clear")}
                  </Button>
                )}
                <span className={cn("tabular-nums", text.length > MAX_QUESTION_LENGTH * 0.9 && "text-destructive")}>
                  {text.length}/{MAX_QUESTION_LENGTH}
                </span>
              </span>
            </p>
          </form>
        </SheetContent>
      </Sheet>

      {suggesting?.task && (
        <SuggestAssigneeDialog
          project={project}
          taskId={suggesting.task.id}
          taskKey={suggesting.task.key}
          initialCriteria={criteriaForTask(suggesting)}
          onClose={() => setSuggesting(null)}
        />
      )}
      {creating && <TaskFormDialog project={project} initial={taskFromWork(creating)} onClose={() => setCreating(null)} />}
    </>
  );
}
