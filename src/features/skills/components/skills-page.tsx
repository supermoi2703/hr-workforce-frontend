"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/states";
import { usePendingCount, useSkillPageState } from "../hooks";
import type { SkillTab } from "../types";
import { MySkills } from "./my-skills";
import { PendingQueue } from "./pending-queue";
import { SkillCatalog } from "./skill-catalog";
import { SkillSearch } from "./skill-search";

/**
 * Kỹ năng (/skills): tự khai (mọi người), hàng chờ xác nhận (ai có cấp dưới trên sơ đồ, hoặc HR / Admin theo
 * skill:verify), tìm người theo kỹ năng (skill:read),
 * danh mục (skill:manage). Tab và điều kiện tìm nằm trên URL. Luật: backend modules/skill/README.md mục 3,
 * docs/policies/skill.md.
 */
export function SkillsPage() {
  const t = useTranslations("Skills");
  const { state, setState, tabs, loading } = useSkillPageState();
  const canVerify = tabs.includes("pending");
  const pendingCount = usePendingCount(canVerify).data ?? 0;

  if (loading) return <LoadingState />;

  return (
    <Tabs value={state.tab} onValueChange={(value) => setState({ ...state, tab: value as SkillTab })} className="min-w-0 gap-5">
      {/* Một hàng gọn như Dashboard: tiêu đề bên trái, tab bên phải (di động: tab xuống dòng). Băng màu và dòng mô tả của
          từng tab đã nói trang làm gì, nên không cần câu mô tả trang. */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        {tabs.length > 1 && (
          <div className="-mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none]">
            <TabsList variant="line" aria-label={t("title")}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {t(`Tabs.${tab}`)}
                  {tab === "pending" && pendingCount > 0 && (
                    <Badge variant="warning" className="tabular-nums">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
      </div>
      <TabsContent value={state.tab}>
        {state.tab === "mine" && (
          <MySkills
            pendingCount={canVerify ? pendingCount : undefined}
            onOpenPending={canVerify ? () => setState({ ...state, tab: "pending" }) : undefined}
          />
        )}
        {state.tab === "pending" && <PendingQueue />}
        {state.tab === "search" && <SkillSearch criteria={state.criteria} onChange={(criteria) => setState({ ...state, criteria })} />}
        {state.tab === "catalog" && <SkillCatalog />}
      </TabsContent>
    </Tabs>
  );
}
