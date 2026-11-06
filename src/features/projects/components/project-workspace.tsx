"use client";

import { Suspense, useCallback, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "../types";
import { setSprintMode } from "../work-api";
import { useWorkErrorMessage, useWorkMutation } from "../work-hooks";
import { BoardTab } from "./board-tab";
import { CapacityTab } from "./capacity-tab";
import { OverviewTab } from "./overview-tab";
import { SprintTab } from "./sprint-tab";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskSheet } from "./task-sheet";
import { TasksTab } from "./tasks-tab";

const TABS = ["overview", "list", "board", "sprint", "capacity", "members", "info"] as const;
type Tab = (typeof TABS)[number];
const TASK_TABS: readonly Tab[] = ["list", "board", "sprint"];
const INSIGHT_TABS: readonly Tab[] = ["overview", "capacity"];

type ProjectWorkspaceProps = {
  project: Project;
  /** Thông tin dự án và danh sách người tham gia: phần của 3.1 + 3.2, truyền từ trang chi tiết. */
  info: ReactNode;
  members: ReactNode;
};

export function ProjectWorkspace(props: ProjectWorkspaceProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Workspace {...props} />
    </Suspense>
  );
}

/**
 * Các tab của một dự án. Tab và việc đang mở nằm trên URL để chia sẻ được: ?tab=board&task=HRM-12.
 * Người ngoài dự án chỉ thấy Thông tin và Người tham gia; HR thấy thêm số liệu, không thấy nội dung việc.
 */
function Workspace({ project, info, members }: ProjectWorkspaceProps) {
  const t = useTranslations("ProjectWork");
  const errorMessage = useWorkErrorMessage();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const { can } = project;
  const toggleSprint = useWorkMutation((enabled: boolean) => setSprintMode(project.id, enabled));

  const setQuery = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  const openTask = useCallback((key: string | null) => setQuery({ task: key }), [setQuery]);

  const tabs = TABS.filter((tab) => {
    if (tab === "sprint" && !project.sprintEnabled) return false;
    if (TASK_TABS.includes(tab)) return can.viewTaskContent;
    if (INSIGHT_TABS.includes(tab)) return can.viewTaskContent || can.viewAllocation;
    return true;
  });
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && tabs.includes(asked) ? asked : tabs[0];

  return (
    <>
      <div>
        <Tabs value={tab} onValueChange={(value) => setQuery({ tab: value as string })}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full overflow-x-auto">
              {tabs.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {t(`tabs.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {can.createTask && (
              <Button onClick={() => setCreating(true)}>
                <PlusIcon /> {t("newTask")}
              </Button>
            )}
          </div>
          <TabsContent value="overview" className="mt-4">
            {tab === "overview" && <OverviewTab project={project} onOpenTask={openTask} />}
          </TabsContent>
          <TabsContent value="list" className="mt-4">
            {tab === "list" && <TasksTab project={project} onOpenTask={openTask} />}
          </TabsContent>
          <TabsContent value="board" className="mt-4">
            {tab === "board" && <BoardTab project={project} onOpenTask={openTask} />}
          </TabsContent>
          <TabsContent value="sprint" className="mt-4">
            {tab === "sprint" && <SprintTab project={project} onOpenTask={openTask} />}
          </TabsContent>
          <TabsContent value="capacity" className="mt-4">
            {tab === "capacity" && <CapacityTab project={project} />}
          </TabsContent>
          <TabsContent value="members" className="mt-4">
            {tab === "members" && members}
          </TabsContent>
          <TabsContent value="info" className="mt-4 grid gap-3">
            {tab === "info" && info}
            {tab === "info" && can.manageSprint && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={project.sprintEnabled}
                  onCheckedChange={(checked) =>
                    toggleSprint.mutate(checked === true, { onError: (error) => toast.error(errorMessage(error)) })
                  }
                />
                {t("useSprints")}
              </label>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {creating && <TaskFormDialog project={project} onClose={() => setCreating(false)} />}
      <TaskSheet taskKey={params.get("task")} project={project} onClose={() => openTask(null)} onOpenTask={openTask} />
    </>
  );
}
