"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listKioskOffices } from "../kiosk-api";
import { KioskDevicesPanel } from "./kiosk-devices-panel";
import { OfficeIpRangesPanel } from "./office-ip-ranges-panel";

export function KioskManagementPage() {
  const t = useTranslations("KioskManagement");
  const offices = useQuery({ queryKey: ["attendance", "kiosk-offices"], queryFn: listKioskOffices });
  const [officeId, setOfficeId] = useState<string | null>(null);
  const selectedOffice = offices.data?.find((office) => office.id === officeId) ?? offices.data?.[0];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={
        <a className={buttonVariants({ variant: "outline" })} href="/kiosk" target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon /> {t("openKiosk")}
        </a>
      } />
      {offices.isPending ? <LoadingState /> : offices.isError ? (
        <ErrorState error={offices.error} onRetry={() => offices.refetch()} />
      ) : selectedOffice ? (
        <>
          <div className="space-y-2">
            <Label id="kiosk-office-label" htmlFor="kiosk-office">{t("office")}</Label>
            <Select value={selectedOffice.id} onValueChange={setOfficeId}>
              <SelectTrigger id="kiosk-office" aria-labelledby="kiosk-office-label" className="min-w-48">
                <SelectValue>{selectedOffice.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {offices.data.map((office) => <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Tabs defaultValue="devices">
            <TabsList>
              <TabsTrigger value="devices">{t("devicesTab")}</TabsTrigger>
              <TabsTrigger value="ipRanges">{t("ipRangesTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="devices" className="pt-3">
              <KioskDevicesPanel key={selectedOffice.id} officeId={selectedOffice.id} />
            </TabsContent>
            <TabsContent value="ipRanges" className="pt-3">
              <OfficeIpRangesPanel key={selectedOffice.id} officeId={selectedOffice.id} />
            </TabsContent>
          </Tabs>
        </>
      ) : <EmptyState title={t("noOffices")} />}
    </>
  );
}
