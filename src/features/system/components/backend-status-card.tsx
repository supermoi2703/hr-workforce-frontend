"use client";

import { RotateCwIcon, ServerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useErrorMessage } from "@/lib/api/use-error-message";
import { formatTime } from "@/lib/format";
import { useBackendHealth } from "../hooks";

/** Thẻ kiểm tra frontend gọi được backend qua proxy /api (GET /actuator/health). */
export function BackendStatusCard() {
  const t = useTranslations("System");
  const errorMessage = useErrorMessage();
  const health = useBackendHealth();
  const isUp = health.data?.status === "UP";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerIcon className="size-4 text-muted-foreground" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("interval")}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
            aria-label={t("recheck")}
          >
            {health.isFetching ? <Spinner /> : <RotateCwIcon />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {health.isPending ? (
          <span className="text-muted-foreground">{t("checking")}</span>
        ) : health.isError ? (
          <>
            <Badge variant="destructive">{t("down")}</Badge>
            <p className="text-muted-foreground">{errorMessage(health.error)}</p>
          </>
        ) : (
          <>
            <Badge variant={isUp ? "success" : "destructive"}>{isUp ? t("up") : health.data.status}</Badge>
            <p className="text-muted-foreground">{t("updatedAt", { time: formatTime(health.dataUpdatedAt) })}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
