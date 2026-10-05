import type { PlanType } from "@shared/plan";
import { NOW_MOODS, type NowMood, type NowWhen } from "./now-suggest";

const MOOD_PLAN_TYPE: Record<NowMood, PlanType> = {
  coffee: "catchup",
  eat: "lunch",
  see: "walk",
  shop: "escape",
  any: "nightout",
};

export function moodPlanType(mood: NowMood): PlanType {
  return MOOD_PLAN_TYPE[mood];
}

export function suggestionPlanTitle(mood: NowMood, placeName: string): string {
  if (mood === "any") return placeName;
  const label = NOW_MOODS.find((m) => m.id === mood)?.label ?? "";
  return label ? `${label} at ${placeName}` : placeName;
}

/** "now" → next top of hour (device-local, the venue is nearby); "tonight" → 7pm. */
export function defaultPlanTime(when: NowWhen, now: Date): string {
  if (when === "tonight") return "19:00";
  const next = (now.getHours() + 1) % 24;
  return `${String(next).padStart(2, "0")}:00`;
}

export type NowPlanPrefill = {
  mood: NowMood;
  when: NowWhen;
  placeName: string;
  address?: string;
  city: string;
  /** YYYY-MM-DD */
  date: string;
  now: Date;
  geo: { lat: number; lng: number };
};

/** Prefilled /plan/new link carrying the Now suggestion (title, time, meeting point). */
export function nowPlanHref(prefill: NowPlanPrefill): string {
  const params = new URLSearchParams({
    title: suggestionPlanTitle(prefill.mood, prefill.placeName),
    type: moodPlanType(prefill.mood),
    date: prefill.date,
    time: defaultPlanTime(prefill.when, prefill.now),
    dest: prefill.address || prefill.placeName,
    city: prefill.city,
    lat: String(prefill.geo.lat),
    lng: String(prefill.geo.lng),
  });
  return `/plan/new?${params.toString()}`;
}
