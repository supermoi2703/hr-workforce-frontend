"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTab } from "./activity-tab";
import { ChangePasswordTab } from "./change-password-tab";
import { DevicesTab } from "./devices-tab";
import { ProfileTab } from "./profile-tab";

const ACCOUNT_TABS = ["profile", "password", "devices", "activity"] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number];

function resolveTab(value: string | null): AccountTab {
  return (ACCOUNT_TABS as readonly (string | null)[]).includes(value) ? (value as AccountTab) : "profile";
}

/**
 * Trang tài khoản chia tab. Tab đang mở lưu trên URL (?tab=devices) để F5 / gửi link vẫn đúng tab; đổi tab bằng
 * history.pushState (Next đồng bộ với useSearchParams, không gọi lại server) nên nút Back quay về tab trước.
 * Panel của tab chưa mở không render, nên chỉ gọi API của tab đang xem.
 */
export function AccountTabs() {
  const t = useTranslations("Account");
  const tab = resolveTab(useSearchParams().get("tab"));

  function changeTab(value: unknown) {
    const next = resolveTab(String(value));
    if (next !== tab) window.history.pushState(null, "", `?tab=${next}`);
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs value={tab} onValueChange={changeTab} className="gap-6">
        {/* Không đặt overflow-x-auto: gạch chân tab đang chọn nằm dưới đáy thanh 5px, overflow sẽ sinh thanh cuộn. */}
        <TabsList variant="line">
          {ACCOUNT_TABS.map((value) => (
            <TabsTrigger key={value} value={value} className="px-3">
              {t(`Tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="password">
          <ChangePasswordTab />
        </TabsContent>
        <TabsContent value="devices">
          <DevicesTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
