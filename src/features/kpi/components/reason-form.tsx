"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseCoefficient } from "../rules";
import type { AdjustmentInput } from "../types";

type Properties = { pending: boolean } & (
  | { type: "adjust"; cap: number; adjusted: number | null; save: (input: AdjustmentInput) => void }
  | { type: "unlock"; save: (reason: string) => void }
);

export function ReasonForm(props: Properties) {
  const t = useTranslations("Kpi");
  const fieldId = useId();
  const [value, setValue] = useState(props.type === "adjust" ? String(props.adjusted ?? "") : "");
  const [reset, setReset] = useState(false);
  const [reason, setReason] = useState("");
  const coefficient = props.type === "adjust" ? parseCoefficient(value, props.cap) : undefined;
  const trimmedReason = reason.trim();
  const adjustedValue = reset ? null : coefficient;
  const canSave = Boolean(trimmedReason) && (props.type === "unlock" || adjustedValue !== undefined);

  return (
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!canSave || props.pending) return;
      if (props.type === "unlock") props.save(trimmedReason);
      else if (adjustedValue !== undefined) props.save({ coefficient: adjustedValue, reason: trimmedReason });
    }}>
      {props.type === "adjust" && (
        <div className="space-y-2">
          {props.adjusted !== null && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} />
              {t("useMachine")}
            </label>
          )}
          {!reset && (
            <>
              <Label htmlFor={`${fieldId}-coefficient`}>{t("adjusted")}</Label>
              <Input id={`${fieldId}-coefficient`} inputMode="decimal" value={value}
                onChange={(event) => setValue(event.target.value)} aria-describedby={`${fieldId}-range`} required />
              <p id={`${fieldId}-range`} className="text-xs text-muted-foreground">{t("coefficientRange", { cap: props.cap })}</p>
            </>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-reason`}>{t("reason")}</Label>
        <Textarea id={`${fieldId}-reason`} value={reason} maxLength={500} required
          onChange={(event) => setReason(event.target.value)} />
      </div>
      <Button type="submit" disabled={!canSave || props.pending}>
        {props.type === "adjust" ? t("save") : t("unlock")}
      </Button>
    </form>
  );
}
