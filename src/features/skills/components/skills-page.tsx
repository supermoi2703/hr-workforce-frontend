"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/states";
import { useCurrentUser } from "@/lib/auth/auth-provider";
import { usePendingCount, useSkillPageState } from "../hooks";
import type { SkillTab } from "../types";
import { MySkills } from "./my-skills";
import { PendingQueue } from "./pending-queue";
import { SkillCatalog } from "./skill-catalog";
import { SkillSearch } from "./skill-search";

/**
 * Kỹ năng (/skills): tự khai (mọi người), hàng chờ xác nhận (skill:verify), tìm người theo kỹ năng (skill:read),
 * danh mục (skill:manage). Tab và điều kiện tìm nằm trên URL. Luật: backend modules/skill/README.md mục 3,
 * docs/policies/skill.md.
 */
export function SkillsPage() {
  const t = useTranslations("Skills");
  const { status } = useCurrentUser();
  const { state, setState, tabs } = useSkillPageState();
  const pendingCount = usePendingCount(tabs.includes("pending")).data ?? 0;

  if (status === "loading") return <LoadingState />;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={state.tab} onValueChange={(value) => setState({ ...state, tab: value as SkillTab })}>
        {tabs.length > 1 && (
          <TabsList className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-auto sm:inline-flex sm:w-fit">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`Tabs.${tab}`)}
                {tab === "pending" && pendingCount > 0 && (
                  <Badge variant="warning" className="ml-1 tabular-nums">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value={state.tab} className="mt-4">
          {state.tab === "mine" && <MySkills />}
          {state.tab === "pending" && <PendingQueue />}
          {state.tab === "search" && <SkillSearch criteria={state.criteria} onChange={(criteria) => setState({ ...state, criteria })} />}
          {state.tab === "catalog" && <SkillCatalog />}
        </TabsContent>
      </Tabs>
    </>
  );
}
