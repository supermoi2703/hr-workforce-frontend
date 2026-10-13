"use client";

import { RotateCwIcon, ServerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/errors";
import { formatTime } from "@/lib/format";
import { useBackendHealth } from "../hooks";

/** Thẻ kiểm tra frontend gọi được backend qua proxy /api (GET /actuator/health). */
export function BackendStatusCard() {
  const health = useBackendHealth();
  const isUp = health.data?.status === "UP";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerIcon className="size-4 text-muted-foreground" /> Kết nối backend
        </CardTitle>
        <CardDescription>Kiểm tra mỗi 30 giây</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
            aria-label="Kiểm tra lại"
          >
            {health.isFetching ? <Spinner /> : <RotateCwIcon />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {health.isPending ? (
          <span className="text-muted-foreground">Đang kiểm tra...</span>
        ) : health.isError ? (
          <>
            <Badge variant="destructive">Không kết nối được</Badge>
            <p className="text-muted-foreground">{getErrorMessage(health.error)}</p>
          </>
        ) : (
          <>
            <Badge variant={isUp ? "default" : "destructive"}>{isUp ? "Đang hoạt động" : health.data.status}</Badge>
            <p className="text-muted-foreground">Cập nhật lúc {formatTime(health.dataUpdatedAt)}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
