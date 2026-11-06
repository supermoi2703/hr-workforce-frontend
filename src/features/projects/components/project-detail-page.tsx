"use client";

import { Suspense, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "../hooks";
import { BoardTab } from "./board-tab";
import { CapacityTab } from "./capacity-tab";
import { MembersTab } from "./members-tab";
import { OverviewTab } from "./overview-tab";
import { SettingsTab } from "./settings-tab";
import { SprintTab } from "./sprint-tab";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskSheet } from "./task-sheet";
import { TasksTab } from "./tasks-tab";

const TABS = ["overview", "list", "board", "sprint", "capacity", "members", "settings"] as const;
type Tab = (typeof TABS)[number];

export function ProjectDetailPage({ code }: { code: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProjectDetail code={code} />
    </Suspense>
  );
}

/** Trang một dự án. Tab và việc đang mở nằm trên URL để chia sẻ được: ?tab=board&task=HRM-12. */
function ProjectDetail({ code }: { code: string }) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const project = useProject(code);
  const [creating, setCreating] = useState(false);

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

  if (project.isPending) return <LoadingState />;
  if (project.isError) return <ErrorState error={project.error} onRetry={() => project.refetch()} />;

  const p = project.data;
  const taskTabs: Tab[] = ["list", "board", "sprint"];
  const tabs = TABS.filter((tab) => (tab !== "sprint" || p.sprintEnabled) && (p.can.viewTasks || !taskTabs.includes(tab)));
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && tabs.includes(asked) ? asked : "overview";

  return (
    <>
      <PageHeader
        title={`${p.code} · ${p.name}`}
        description={[p.pm ? t("pmOf", { name: p.pm.fullName }) : null, t(p.sprintEnabled ? "modeSprint" : "modeFlow")].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            {p.status === "CLOSED" && <Badge variant="outline">{t("closed")}</Badge>}
            {p.can.createTask && (
              <Button onClick={() => setCreating(true)}>
                <PlusIcon /> {t("newTask")}
              </Button>
            )}
          </div>
        }
      />
      <Tabs value={tab} onValueChange={(value) => setQuery({ tab: value as string })}>
        <TabsList className="max-w-full overflow-x-auto">
          {tabs.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          {tab === "overview" && <OverviewTab project={p} onOpenTask={openTask} />}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          {tab === "list" && <TasksTab project={p} onOpenTask={openTask} />}
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          {tab === "board" && <BoardTab project={p} onOpenTask={openTask} />}
        </TabsContent>
        <TabsContent value="sprint" className="mt-4">
          {tab === "sprint" && <SprintTab project={p} onOpenTask={openTask} />}
        </TabsContent>
        <TabsContent value="capacity" className="mt-4">
          {tab === "capacity" && <CapacityTab project={p} />}
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          {tab === "members" && <MembersTab project={p} />}
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          {tab === "settings" && <SettingsTab project={p} />}
        </TabsContent>
      </Tabs>
      {creating && <TaskFormDialog project={p} onClose={() => setCreating(false)} />}
      <TaskSheet taskKey={params.get("task")} project={p} onClose={() => openTask(null)} onOpenTask={openTask} />
    </>
  );
}
