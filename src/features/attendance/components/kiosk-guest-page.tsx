"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { useAttendanceErrorMessage } from "../hooks";
import { clearKioskToken, getKioskToken, pairKioskBrowser, subscribeKioskToken } from "../kiosk-session";
import { KioskScreen } from "./kiosk-screen";

const getServerToken = () => undefined;

export function KioskGuestPage() {
  const token = useSyncExternalStore<string | null | undefined>(subscribeKioskToken, getKioskToken, getServerToken);
  const [needsPairing, setNeedsPairing] = useState(false);

  function forgetRejectedToken(rejectedToken: string) {
    if (getKioskToken() !== rejectedToken) return;
    setNeedsPairing(true);
    clearKioskToken(rejectedToken);
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6">
      <div className="flex justify-end"><LanguageToggle /></div>
      {token === undefined ? <LoadingState /> : token ? (
        <KioskScreen key={token} token={token} onTokenRejected={forgetRejectedToken} />
      ) : (
        <KioskPairingForm needsPairing={needsPairing} onPaired={() => setNeedsPairing(false)} />
      )}
    </main>
  );
}

function KioskPairingForm({ needsPairing, onPaired }: { needsPairing: boolean; onPaired: () => void }) {
  const t = useTranslations("Attendance.kioskPairing");
  const errorMessage = useAttendanceErrorMessage();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !code.trim()) return;
    setPending(true);
    setError(null);
    try {
      await pairKioskBrowser(code);
      onPaired();
    } catch (failure) {
      setError(isApiError(failure) ? errorMessage(failure) : t("storageError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6" aria-labelledby="kiosk-pairing-title">
      <div className="space-y-1.5">
        <h1 id="kiosk-pairing-title" className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {needsPairing && <Alert><AlertDescription>{t("tokenRejected")}</AlertDescription></Alert>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="kiosk-pairing-code">{t("code")}</Label>
          <Input id="kiosk-pairing-code" value={code} onChange={(event) => setCode(event.target.value)}
            maxLength={64} autoComplete="off" autoCapitalize="characters" spellCheck={false} required disabled={pending} />
        </div>
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending && <Spinner />}{t("submit")}
        </Button>
      </form>
    </section>
  );
}
