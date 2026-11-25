import { http, type RequestOptions } from "@/lib/api/http-client";

export type KioskOffice = { id: string; name: string; code: string };
export type KioskDevice = {
  id: string;
  name: string;
  officeId: string;
  status: "UNPAIRED" | "ACTIVE" | "REVOKED";
};
export type KioskPairingCode = { pairingCode: string; expiresAt: string };
export type OfficeIpRange = { id: string; officeId: string; cidr: string; note: string | null };

const guestRequest = { skipAuth: true, credentials: "omit" } satisfies RequestOptions;
const enc = encodeURIComponent;

export function kioskRequestOptions(token: string): RequestOptions {
  return { ...guestRequest, headers: { "X-Kiosk-Token": token } };
}

export const pairKiosk = (code: string) =>
  http.post<{ token: string }>("/api/kiosk/pair", { code: code.trim() }, guestRequest);

export const listKioskOffices = () => http.get<KioskOffice[]>("/api/kiosk/offices");
export const listKioskDevices = (officeId: string) =>
  http.get<KioskDevice[]>("/api/kiosk/devices", { query: { officeId } });
export const createKioskDevice = (name: string, officeId: string) =>
  http.post<KioskPairingCode & { device: KioskDevice }>("/api/kiosk/devices", { name, officeId });
export const issueKioskPairingCode = (deviceId: string) =>
  http.post<KioskPairingCode>(`/api/kiosk/devices/${enc(deviceId)}/pairing-code`);
export const revokeKioskDevice = (deviceId: string) =>
  http.post<void>(`/api/kiosk/devices/${enc(deviceId)}/revoke`);

const ipRangesUrl = (officeId: string) => `/api/kiosk/offices/${enc(officeId)}/ip-ranges`;
export const listOfficeIpRanges = (officeId: string) => http.get<OfficeIpRange[]>(ipRangesUrl(officeId));
export const createOfficeIpRange = (officeId: string, cidr: string, note: string | null) =>
  http.post<OfficeIpRange>(ipRangesUrl(officeId), { cidr, note });
export const deleteOfficeIpRange = (officeId: string, rangeId: string) =>
  http.delete<void>(`${ipRangesUrl(officeId)}/${enc(rangeId)}`);
