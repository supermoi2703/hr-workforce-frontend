"use client";

import { useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BanIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { transitionTask } from "../work-api";
import { useProjectMembers } from "../hooks";
import { useBoard, useWorkErrorMessage, useWorkMutation, useSprints } from "../work-hooks";
import { formatMinutes, toColumns } from "../work-rules";
import type { Project } from "../types";
import { BOARD_STATUSES, type TaskCard, type TaskStatus } from "../work-types";
import { PriorityIcon, TypeIcon } from "./badges";
import { SimpleSelect } from "./simple-select";

const ALL_SPRINTS = "ALL";

/** S5: bảng 4 cột. Kéo bằng HTML5, không cần thư viện; tự tải lại 3 giây nên trình duyệt khác thấy thay đổi. */
export function BoardTab({ project, onOpenTask }: { project: Project; onOpenTask: (key: string) => void }) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const queryClient = useQueryClient();
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const [sprintChoice, setSprintChoice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const members = useProjectMembers(project.id);
  const sprints = useSprints(project.id, project.sprintEnabled);
  const active = sprints.data?.find((sprint) => sprint.status === "ACTIVE");
  const sprint = sprintChoice ?? active?.id ?? ALL_SPRINTS;
  const filter = { assigneeId, sprintId: sprint === ALL_SPRINTS ? undefined : sprint };
  const board = useBoard(project.id, filter);
  const move = useWorkMutation(({ card, to }: { card: TaskCard; to: TaskStatus }) => transitionTask(card.id, to, card.version));

  function drop(event: DragEvent, to: TaskStatus) {
    event.preventDefault();
    setDragOver(null);
    const card = board.data?.find((item) => item.id === event.dataTransfer.getData("text/plain"));
    if (!card || card.status === to) return;
    // Đổi ngay trên màn hình cho mượt; lỗi thì tải lại dữ liệu thật.
    queryClient.setQueriesData<TaskCard[]>({ queryKey: ["projects", "work", "board", project.id] }, (cards) =>
      cards?.map((item) => (item.id === card.id ? { ...item, status: to } : item)),
    );
    move.mutate({ card, to }, { onError: (error) => toast.error(errorMessage(error)) });
  }

  if (board.isPending) return <LoadingState />;
  if (board.isError) return <ErrorState error={board.error} onRetry={() => board.refetch()} />;

  const people = (members.data ?? []).filter((member) => member.role !== "OBSERVER");
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {people.map((member) => (
            <button
              key={member.employee.id}
              type="button"
              title={member.employee.fullName}
              className={cn("rounded-full ring-offset-2", assigneeId === member.employee.id && "ring-primary ring-2")}
              onClick={() => setAssigneeId(assigneeId === member.employee.id ? undefined : member.employee.id)}
            >
              <UserAvatar name={member.employee.fullName} seed={member.employee.id} size="sm" />
            </button>
          ))}
        </div>
        {project.sprintEnabled && (
          <SimpleSelect
            className="w-52"
            value={sprint}
            onChange={setSprintChoice}
            options={[
              { value: ALL_SPRINTS, label: t("allSprints") },
              ...(sprints.data ?? []).filter((item) => item.status !== "CLOSED").map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        )}
        <span className="text-muted-foreground ml-auto text-xs">{t("boardLive")}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {toColumns(BOARD_STATUSES, board.data).map((column) => (
          <section
            key={column.status}
            aria-label={t(`status.${column.status}`)}
            className={cn("bg-muted/40 min-h-64 rounded-lg p-2", dragOver === column.status && "ring-primary ring-2")}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(column.status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(event) => drop(event, column.status)}
          >
            <h3 className="text-muted-foreground mb-2 flex items-center justify-between px-1 text-sm font-medium">
              {t(`status.${column.status}`)} <span className="tabular-nums">{column.cards.length}</span>
            </h3>
            <div className="grid gap-2">
              {column.cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  draggable={project.can.createTask}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}
                  onClick={() => onOpenTask(card.key)}
                  className="bg-card hover:border-primary/50 grid gap-2 rounded-md border p-2.5 text-left text-sm shadow-xs"
                >
                  <span className="line-clamp-2">{card.title}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <TypeIcon type={card.type} />
                    <span className="font-mono">{card.key}</span>
                    <PriorityIcon priority={card.priority} />
                    {card.blocked && (
                      <span title={t("blocked")} className="text-destructive inline-flex">
                        <BanIcon className="size-3.5" />
                      </span>
                    )}
                    <span className={cn("ml-auto", card.overdue && "text-destructive")}>{formatDate(card.dueDate, "")}</span>
                    {card.remainingMinutes != null && card.status !== "DONE" && <span className="tabular-nums">{formatMinutes(card.remainingMinutes)}</span>}
                    {card.assignee && <UserAvatar name={card.assignee.fullName} seed={card.assignee.id} size="sm" />}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
