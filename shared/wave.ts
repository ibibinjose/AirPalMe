/** Short-range Wave: greet AirPals at a venue. BLE/NFC when the phone allows it. */

export const WAVE_TTL_MS = 15 * 60 * 1000;
export const WAVE_CODE_LEN = 6;

/** Documented AirPal Wave BLE service. Android Chrome can scan; iOS Safari cannot advertise. */
export const AIRPAL_BLE_SERVICE = "a1b0a1b0-4a1b-41b0-a1b0-a1b0a1b0a1b0";
export const AIRPAL_BLE_NAME = "AirPal";

export type WaveSession = {
  code: string;
  uid: string;
  handle: string;
  name: string;
  placeKey: string;
  placeName: string;
  listingId?: string;
  placeId?: string;
  hitCount: number;
  expiresAt: string;
  createdAt: string;
};

export type StartWaveRequest = {
  placeName: string;
  placeKey?: string;
  listingId?: string;
  placeId?: string;
};

export type WaveAtRequest = {
  code: string;
};

export function waveCodeFrom(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, WAVE_CODE_LEN);
}

export function waveLive(session: { expiresAt?: string } | null | undefined, now = Date.now()): boolean {
  if (!session?.expiresAt) return false;
  const at = Date.parse(session.expiresAt);
  return Number.isFinite(at) && at > now;
}

export function validateStartWave(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const name = String(input.placeName || "").trim();
  if (name.length < 2) errors.push("Name the place you’re waving from.");
  if (name.length > 80) errors.push("Place name is too long.");
  return errors;
}

export function waveUrl(code: string, origin = "https://airpal.me"): string {
  return `${origin.replace(/\/$/, "")}/w/${waveCodeFrom(code)}`;
}
