/**
 * Client-side wave state. The server owns the real 24h cooldown; this mirror
 * only paints the instant "Waved" state so the button flips without a refetch.
 */
import { normalizeWaveHandle, waveCooldownRemainingMs } from "@shared/waves";

const KEY = "airpal.waved";

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function lastWavedAt(handle: string): string | undefined {
  return readAll()[normalizeWaveHandle(handle)];
}

export function waveOnCooldown(handle: string, now = Date.now()): boolean {
  return waveCooldownRemainingMs(lastWavedAt(handle), now) > 0;
}

export function markWaved(handle: string, at = new Date().toISOString()): void {
  try {
    const all = readAll();
    all[normalizeWaveHandle(handle)] = at;
    const keys = Object.keys(all).slice(-100);
    const trimmed: Record<string, string> = {};
    for (const k of keys) trimmed[k] = all[k]!;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* cooldown paint is best-effort; the server still enforces */
  }
}
