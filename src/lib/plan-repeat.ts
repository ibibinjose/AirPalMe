import type { HangoutPlan } from "@shared/plan";
import type { CreatePlanInput } from "@/contexts/PlanContext";

const DAY_MS = 86_400_000;

/**
 * Next date with the past plan's weekday, strictly after today
 * ("same again next Saturday"). Falls back to today for unreadable input.
 */
export function repeatPlanDate(pastDate: string, today: string): string {
  const past = new Date(`${pastDate}T00:00:00Z`);
  const base = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(past.getTime()) || Number.isNaN(base.getTime())) return today;
  const want = past.getUTCDay();
  const next = new Date(base.getTime() + DAY_MS);
  while (next.getUTCDay() !== want) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * One-tap repeat input: same shape, place, stops, and crew on a future date.
 * Repeats start private — the host can reopen them. Only the crew that went
 * (going + maybe) is re-invited; declined guests stay out.
 */
export function repeatPlanInput(plan: HangoutPlan, today: string): CreatePlanInput {
  return {
    title: plan.title,
    type: plan.type,
    theme: plan.theme,
    date: repeatPlanDate(plan.date, today),
    time: plan.time,
    endTime: plan.endTime,
    city: plan.city,
    destination: plan.destination,
    heroImage: plan.heroImage,
    notes: plan.notes,
    isPublic: false,
    interests: plan.interests,
    geo: plan.geo,
    initialStops: plan.stops.map((s) => ({
      name: s.name,
      time: s.time,
      notes: s.notes,
      icon: s.icon,
      placeId: s.placeId,
      address: s.address,
    })),
    invited: plan.attendees
      .filter((a) => a.status === "going" || a.status === "maybe")
      .map((a) => ({ id: a.id, name: a.name, handle: a.handle })),
  };
}
