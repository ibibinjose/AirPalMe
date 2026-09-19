/** Stash the just-published venue so /business/setup can add 3 things without retyping. */

export const SHOWCASE_STORAGE_KEY = "airpal.businessShowcase";

export type BusinessShowcaseDraft = {
  listingId?: string;
  placeId?: string;
  name: string;
  category?: string;
  shortWhy?: string;
  hours?: string;
  phone?: string;
  website?: string;
  mapsPlaceId?: string;
  heroImage?: string;
  logoUrl?: string;
};

export function stashBusinessShowcase(draft: BusinessShowcaseDraft) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function takeBusinessShowcase(): BusinessShowcaseDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHOWCASE_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SHOWCASE_STORAGE_KEY);
    const parsed = JSON.parse(raw) as BusinessShowcaseDraft;
    if (!parsed?.name?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekBusinessShowcase(): BusinessShowcaseDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHOWCASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BusinessShowcaseDraft;
    return parsed?.name?.trim() ? parsed : null;
  } catch {
    return null;
  }
}
