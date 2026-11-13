"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const PREVIEW_ROWS = 8;

/** Danh sách dài (đội trăm người, bench...): hiện 8 dòng đầu, bấm để xem hết. */
export function useExpandable<T>(rows: T[]) {
  const [expanded, setExpanded] = useState(false);
  return {
    shown: expanded ? rows : rows.slice(0, PREVIEW_ROWS),
    expanded,
    toggle: () => setExpanded((value) => !value),
    more: rows.length > PREVIEW_ROWS,
    total: rows.length,
  };
}

export function ExpandButton({ list }: { list: ReturnType<typeof useExpandable> }) {
  const t = useTranslations("Dashboard.Common");
  if (!list.more) return null;
  return (
    <Button variant="ghost" size="sm" className="justify-self-start" onClick={list.toggle}>
      {list.expanded ? t("showLess") : t("showAll", { count: list.total })}
    </Button>
  );
}
