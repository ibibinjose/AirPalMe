const DAY = 24 * 60 * 60 * 1000;

/** How often hosts must re-confirm. Wi-Fi monthly; hours fortnightly; event schedules weekly. */
export const FRESHNESS_SLA_MS = {
  wifi: 30 * DAY,
  hours: 14 * DAY,
  events: 7 * DAY,
} as const;

/** After this, guest Open now / Live now is hidden — hours may be wrong. */
export const FRESHNESS_HIDE_OPEN_MS = 45 * DAY;

export type FreshnessKind = keyof typeof FRESHNESS_SLA_MS;

export type Freshness = {
  at: string | null;
  ageMs: number | null;
  stale: boolean;
  hideOpenNow: boolean;
  confirmedLabel: string;
  hostNudge: string;
};

function daysAgo(ageMs: number) {
  const days = Math.max(1, Math.round(ageMs / DAY));
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function freshnessOf(iso: string | undefined | null, kind: FreshnessKind, now = Date.now()): Freshness {
  const sla = FRESHNESS_SLA_MS[kind];
  const at = iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
  if (!at) {
    return {
      at: null,
      ageMs: null,
      stale: true,
      hideOpenNow: true,
      confirmedLabel: "Never confirmed",
      hostNudge:
        kind === "hours"
          ? "Confirm opening hours — guests currently see no Open now badge."
          : kind === "events"
            ? "Confirm this event is still on — Tonight may show the wrong time."
            : "Set live Wi-Fi — guests see “ask the desk” until this is set.",
    };
  }
  const ageMs = Math.max(0, now - Date.parse(at));
  const stale = ageMs >= sla;
  const hideOpenNow = kind === "hours" && ageMs >= FRESHNESS_HIDE_OPEN_MS;
  const when = daysAgo(ageMs);
  const confirmedLabel = ageMs < DAY ? "Confirmed today" : `Confirmed ${when}`;
  const hostNudge = stale
    ? kind === "hours"
      ? `Hours last confirmed ${when} — tap to confirm they’re still right.`
      : kind === "events"
        ? `Schedule last confirmed ${when} — tap if tonight is still accurate.`
        : `Wi-Fi last updated ${when} — re-verify the password.`
    : confirmedLabel;
  return { at, ageMs, stale, hideOpenNow, confirmedLabel, hostNudge };
}

export function isoFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string" && value && !Number.isNaN(Date.parse(value))) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}
