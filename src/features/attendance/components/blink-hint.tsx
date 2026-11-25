"use client";

import { useTranslations } from "next-intl";
import type { BlinkCaptureStatus } from "../blink-capture";

export function BlinkHint({ status }: { status: BlinkCaptureStatus }) {
  const t = useTranslations("Attendance.blink");
  return <p role="status">{t(status)}</p>;
}
