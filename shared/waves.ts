/**
 * Waves: named nearby signals between AirPals.
 *
 * One wave per person per 24h, wave-back only (no reply channel), and the
 * recipient always sees who waved. Validation and cooldown math live here so
 * client and callable share one contract.
 */
import { handleError, normalizeHandle } from "./bio";

/** One wave at the same person per day. */
export const WAVE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type SendWaveRequest = {
  toHandle: string;
};

export type SendWaveResponse = {
  ok: boolean;
  wavedAt: string;
  /** True when the recipient had already waved at the sender first. */
  waveBack: boolean;
};

export interface WaveRecord {
  fromUid: string;
  fromHandle: string;
  fromName: string;
  toUid: string;
  toHandle: string;
  city: string;
  sentAt: string;
}

export function normalizeWaveHandle(raw: string): string {
  return normalizeHandle(raw);
}

export function validateWaveRequest(input: { toHandle?: string }): string[] {
  const errors: string[] = [];
  const handle = normalizeWaveHandle(String(input.toHandle || ""));
  if (!handle) {
    errors.push("Choose who to wave at.");
    return errors;
  }
  const err = handleError(handle);
  if (err) errors.push(err);
  return errors;
}

/** Ms until the sender may wave at the same person again; 0 means allowed now. */
export function waveCooldownRemainingMs(lastSentAt: string | number | undefined, now = Date.now()): number {
  if (lastSentAt == null || lastSentAt === "") return 0;
  const at = typeof lastSentAt === "number" ? lastSentAt : Date.parse(lastSentAt);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, WAVE_COOLDOWN_MS - (now - at));
}

export function buildWaveCopy(input: { fromName: string; fromHandle: string; city: string; waveBack: boolean }): {
  title: string;
  body: string;
  href: string;
} {
  const name = input.fromName.trim() || `@${input.fromHandle}`;
  const city = input.city.trim();
  return {
    title: input.waveBack ? `${name} waved back` : `${name} waved at you`,
    body: city ? `They're in ${city} — open their bio to wave back.` : "Open their bio to wave back.",
    href: `/@${input.fromHandle}`,
  };
}
