"use client";

import { useEffect } from "react";
import { CircleAlertIcon, RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// Lỗi không lường trước khi render một trang trong khu vực đã đăng nhập. Sidebar/header vẫn giữ nguyên.
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("ErrorPage");
  const tCommon = useTranslations("Common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>
          {t("description")}
          {error.digest && <> {t("code", { digest: error.digest })}</>}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={() => retry()}>
          <RotateCwIcon /> {tCommon("retry")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
