"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ContractState } from "../types";

const STATE_VARIANT: Record<ContractState, "info" | "success" | "secondary"> = {
  UPCOMING: "info",
  ACTIVE: "success",
  ENDED: "secondary",
};

/** Trạng thái hợp đồng (chưa bắt đầu / đang chạy / đã kết thúc), cùng màu ở mọi màn hình. */
export function ContractStateBadge({ state }: { state: ContractState }) {
  const t = useTranslations("Contracts.states");
  return <Badge variant={STATE_VARIANT[state]}>{t(state)}</Badge>;
}
