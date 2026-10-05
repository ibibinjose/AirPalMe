import type { NearbyPlace, PlaceCategory } from "@shared/nearby";
import { isOpenAt, parseHoursWindow } from "./hours";

export type NowMood = "coffee" | "eat" | "see" | "shop" | "any";
export type NowWhen = "now" | "tonight";

export const NOW_MOODS: Array<{ id: NowMood; label: string }> = [
  { id: "coffee", label: "Coffee" },
  { id: "eat", label: "Eat" },
  { id: "see", label: "See" },
  { id: "shop", label: "Shop" },
  { id: "any", label: "Anything" },
];

export const NOW_WHENS: Array<{ id: NowWhen; label: string }> = [
  { id: "now", label: "Now" },
  { id: "tonight", label: "Tonight" },
];

const MOOD_CATEGORIES: Record<Exclude<NowMood, "any">, PlaceCategory[]> = {
  coffee: ["coffee"],
  eat: ["eat"],
  see: ["things"],
  shop: ["shops"],
};

/** Evening anchor for "tonight": 7:30pm in minutes. */
export const TONIGHT_MINUTES = 19 * 60 + 30;

export type SuggestablePlace = NearbyPlace & { meters?: number; walk?: string };

export function filterByMood(places: SuggestablePlace[], mood: NowMood): SuggestablePlace[] {
  if (mood === "any") return places;
  const cats = MOOD_CATEGORIES[mood];
  return places.filter((p) => cats.includes(p.category));
}

/**
 * Whether a venue's hours cover tonight (7:30pm) on the given weekday
 * (0 = Sunday, as in `zonedWeekdayIndex`). Returns null when hours cannot
 * be interpreted — never guess.
 */
export function eveningAvailable(hours: string | undefined, weekday: number): boolean | null {
  if (!hours || !hours.trim()) return null;
  const parsed = parseHoursWindow(hours);
  if (parsed === "always") return true;
  if (parsed === "unknown") return null;
  if (parsed.days && !parsed.days.includes(weekday)) return false;
  const { start, end } = parsed;
  if (end <= 24 * 60) return start <= TONIGHT_MINUTES && TONIGHT_MINUTES <= end;
  // Overnight window (open past midnight): covers tonight when it starts by 7:30pm.
  return start <= TONIGHT_MINUTES;
}

export type RankedPlace = SuggestablePlace & { open: boolean | null };

function opennessRank(open: boolean | null): number {
  return open === true ? 0 : open === null ? 1 : 2;
}

/** Stable rank: confirmed open first, unknown second, closed last. */
export function rankForWhen(
  places: SuggestablePlace[],
  when: NowWhen,
  now: Date,
  timeZone: string,
  weekday: number,
): RankedPlace[] {
  return places
    .map((place, index) => ({
      place,
      index,
      open: when === "now" ? isOpenAt(place.hours, now, timeZone) : eveningAvailable(place.hours, weekday),
    }))
    .sort((a, b) => opennessRank(a.open) - opennessRank(b.open) || a.index - b.index)
    .map(({ place, open }) => ({ ...place, open }));
}

export type Suggestion = {
  place: SuggestablePlace;
  open: boolean | null;
  /** Understandable reasons only (walk time, never an opaque score). */
  reasons: string[];
};

export type PickSuggestionOpts = {
  mood: NowMood;
  when: NowWhen;
  now: Date;
  timeZone: string;
  weekday: number;
  /** Already-shown ids to skip, so the guest gets an alternative. */
  excludeIds?: string[];
};

/** One assembled suggestion from live places, or null when nothing fits. */
export function pickSuggestion(places: SuggestablePlace[], opts: PickSuggestionOpts): Suggestion | null {
  const pool = rankForWhen(filterByMood(places, opts.mood), opts.when, opts.now, opts.timeZone, opts.weekday);
  const excluded = new Set(opts.excludeIds ?? []);
  const pick = pool.find((p) => !excluded.has(p.id));
  if (!pick) return null;
  const reasons: string[] = [];
  if (pick.walk) reasons.push(pick.walk);
  return { place: pick, open: pick.open, reasons };
}
