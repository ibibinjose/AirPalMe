export const RATE_MOODS = [
  { id: "love", emoji: "😍", label: "Love" },
  { id: "good", emoji: "👍", label: "Good" },
  { id: "ok", emoji: "😐", label: "Ok" },
  { id: "meh", emoji: "👎", label: "Meh" },
] as const;

export type RateMood = (typeof RATE_MOODS)[number]["id"];

export type VenueRating = {
  id: string;
  mood: RateMood;
  emoji: string;
  note?: string;
  at: string;
  target: "stall" | "event" | "stay";
  eventId?: string;
  stallId?: string;
  stallName?: string;
  propertyId?: string;
};

const KEY = "airpal.ratings.v1";

export function loadRatings(): VenueRating[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VenueRating[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistRatings(rows: VenueRating[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function ratingsForEvent(eventId: string) {
  return loadRatings().filter((r) => r.eventId === eventId);
}

export function myRating(target: VenueRating["target"], key: string) {
  return loadRatings().find((r) =>
    target === "stall" ? r.stallId === key : target === "event" ? r.eventId === key && !r.stallId : r.propertyId === key,
  );
}
