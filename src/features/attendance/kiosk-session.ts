import { isApiError } from "@/lib/api/errors";
import { pairKiosk } from "./kiosk-api";

const TOKEN_KEY = "attendance.kiosk.token";
const TOKEN_CHANGE = "attendance-kiosk-token-change";

export function getKioskToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function subscribeKioskToken(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(TOKEN_CHANGE, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TOKEN_CHANGE, listener);
  };
}

export async function pairKioskBrowser(code: string) {
  const { token } = await pairKiosk(code);
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(TOKEN_CHANGE));
}

export function clearKioskToken(rejectedToken: string) {
  // A response from an earlier request can arrive after a different tab has paired again.
  if (getKioskToken() !== rejectedToken) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(TOKEN_CHANGE));
}

export function isKioskTokenRejected(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}
