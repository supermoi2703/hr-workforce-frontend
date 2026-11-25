"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAttendanceErrorMessage } from "../hooks";
import { createOfficeIpRange, deleteOfficeIpRange, listOfficeIpRanges } from "../kiosk-api";

export function OfficeIpRangesPanel({ officeId }: { officeId: string }) {
  const t = useTranslations("KioskManagement.networks");
  const errorMessage = useAttendanceErrorMessage();
  const queryClient = useQueryClient();
  const queryKey = ["attendance", "office-ip-ranges", officeId];
  const networks = useQuery({ queryKey, queryFn: () => listOfficeIpRanges(officeId) });
  const [cidr, setCidr] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding || !cidr.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await createOfficeIpRange(officeId, cidr.trim(), note.trim() || null);
      setCidr("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setAdding(false);
    }
  }

  async function removeNetwork(rangeId: string) {
    try {
      await deleteOfficeIpRange(officeId, rangeId);
      void queryClient.invalidateQueries({ queryKey });
    } catch (failure) {
      toast.error(errorMessage(failure));
      throw failure;
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={addNetwork}>
        <div className="space-y-2">
          <Label htmlFor="office-cidr">{t("cidr")}</Label>
          <Input id="office-cidr" value={cidr} onChange={(event) => setCidr(event.target.value)}
            maxLength={49} placeholder="203.0.113.0/24" spellCheck={false} required disabled={adding} />
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="office-cidr-note">{t("note")}</Label>
          <Input id="office-cidr-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} disabled={adding} />
        </div>
        <Button type="submit" disabled={adding || !cidr.trim()}>{adding && <Spinner />}{t("add")}</Button>
      </form>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {networks.isPending ? <LoadingState /> : networks.isError ? (
        <ErrorState error={networks.error} onRetry={() => networks.refetch()} />
      ) : networks.data.length === 0 ? <EmptyState title={t("empty")} description={t("emptyDescription")} /> : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("cidr")}</TableHead>
                <TableHead>{t("note")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks.data.map((range) => (
                <TableRow key={range.id}>
                  <TableCell className="font-mono">{range.cidr}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal">{range.note}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog trigger={<Button variant="destructive" size="sm" />} triggerLabel={t("remove")}
                      title={t("removeTitle", { cidr: range.cidr })} description={t("removeDescription")}
                      confirmLabel={t("remove")} destructive onConfirm={() => removeNetwork(range.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
