"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { useAttendanceErrorMessage } from "../hooks";
import { createKioskDevice, issueKioskPairingCode, listKioskDevices, revokeKioskDevice, type KioskDevice, type KioskPairingCode } from "../kiosk-api";

const STATUS_VARIANT = { UNPAIRED: "warning", ACTIVE: "success", REVOKED: "outline" } as const;

export function KioskDevicesPanel({ officeId }: { officeId: string }) {
  const t = useTranslations("KioskManagement.devices");
  const errorMessage = useAttendanceErrorMessage();
  const queryClient = useQueryClient();
  const queryKey = ["attendance", "kiosk-devices", officeId];
  const devices = useQuery({ queryKey, queryFn: () => listKioskDevices(officeId), refetchOnWindowFocus: "always" });
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The code is kept only while its dialog is open and never added to the list cache.
  const [issued, setIssued] = useState<(KioskPairingCode & { deviceName: string }) | null>(null);

  async function createDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { device, pairingCode, expiresAt } = await createKioskDevice(name.trim(), officeId);
      setIssued({ deviceName: device.name, pairingCode, expiresAt });
      setName("");
      void queryClient.invalidateQueries({ queryKey });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setCreating(false);
    }
  }

  async function reissue(device: KioskDevice) {
    try {
      const code = await issueKioskPairingCode(device.id);
      setIssued({ deviceName: device.name, ...code });
      void queryClient.invalidateQueries({ queryKey });
    } catch (failure) {
      toast.error(errorMessage(failure));
      throw failure;
    }
  }

  async function revoke(device: KioskDevice) {
    try {
      await revokeKioskDevice(device.id);
      void queryClient.invalidateQueries({ queryKey });
    } catch (failure) {
      toast.error(errorMessage(failure));
      throw failure;
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={createDevice}>
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="kiosk-device-name">{t("name")}</Label>
          <Input id="kiosk-device-name" value={name} onChange={(event) => setName(event.target.value)}
            maxLength={100} required disabled={creating} />
        </div>
        <Button type="submit" disabled={creating || !name.trim()}>{creating && <Spinner />}{t("create")}</Button>
      </form>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {devices.isPending ? <LoadingState /> : devices.isError ? (
        <ErrorState error={devices.error} onRetry={() => devices.refetch()} />
      ) : devices.data.length === 0 ? <EmptyState title={t("empty")} /> : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("statusColumn")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.data.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[device.status]}>{t(`status.${device.status}`)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <ConfirmDialog trigger={<Button variant="outline" size="sm" />} triggerLabel={t("reissue")}
                        title={t("reissueTitle", { name: device.name })} description={t("reissueDescription")}
                        confirmLabel={t("reissue")} onConfirm={() => reissue(device)} />
                      {device.status !== "REVOKED" && (
                        <ConfirmDialog trigger={<Button variant="destructive" size="sm" />} triggerLabel={t("revoke")}
                          title={t("revokeTitle", { name: device.name })} description={t("revokeDescription")}
                          confirmLabel={t("revoke")} destructive onConfirm={() => revoke(device)} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {issued && (
        <Dialog open onOpenChange={(open) => !open && setIssued(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("codeTitle", { name: issued.deviceName })}</DialogTitle>
              <DialogDescription>{t("codeDescription", { expiry: formatDateTime(issued.expiresAt) })}</DialogDescription>
            </DialogHeader>
            <code className="block select-all rounded-lg border bg-muted p-4 text-center text-2xl font-semibold tracking-widest">
              {issued.pairingCode}
            </code>
            <DialogFooter><Button onClick={() => setIssued(null)}>{t("close")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
