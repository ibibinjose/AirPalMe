/**
 * Glanceable inbox timestamps. Pure: pass `nowMs` in tests, default live.
 * Invalid or future input degrades to "" (row hides the stamp) rather than
 * showing a wrong time.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseMs(iso: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Compact relative age for notification rows: Just now · 5m · 3h ·
 * Yesterday · Mon · 12 May.
 */
export function relativeAgo(iso: string, nowMs = Date.now()): string {
  const ms = parseMs(iso);
  if (ms === null) return "";
  const diff = nowMs - ms;
  if (diff < 0) return "";
  if (diff < 60_000) return "Just now";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < DAY_MS && startOfLocalDay(nowMs) === startOfLocalDay(ms)) {
    return `${Math.floor(diff / (60 * 60_000))}h`;
  }
  const days = Math.round((startOfLocalDay(nowMs) - startOfLocalDay(ms)) / DAY_MS);
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) {
    return new Date(ms).toLocaleDateString([], { weekday: "short" });
  }
  if (days >= 7) {
    const sameYear = new Date(ms).getFullYear() === new Date(nowMs).getFullYear();
    return new Date(ms).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "2-digit" as const }),
    });
  }
  return "";
}

/**
 * Chat-list stamp: time today ("14:32"), Yesterday, weekday, or date.
 * Same-day keeps clock precision; older converges with relativeAgo.
 */
export function smartChatTime(iso: string, nowMs = Date.now()): string {
  const ms = parseMs(iso);
  if (ms === null) return "";
  if (ms > nowMs) return "";
  if (startOfLocalDay(nowMs) === startOfLocalDay(ms)) {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return relativeAgo(iso, nowMs);
}
