import { doc, getDoc } from "firebase/firestore";
import { BIO_LINK_TYPES, isSafeBioHref, normalizeHandle, sanitizeCatalog, type BioKind, type BioLink, type BioLinkType, type BioProfile } from "@shared/bio";
import type { BusinessCategoryId } from "@shared/business";
import { getFirebaseDb } from "./firebase";

const KEY = "airpal.bios.v1";
const TAPS_KEY = "airpal.bio-taps.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function withCatalog(row: BioProfile): BioProfile {
  return {
    ...row,
    products: sanitizeCatalog("product", row.products),
    services: sanitizeCatalog("service", row.services),
    deals: sanitizeCatalog("deal", row.deals),
    links: Array.isArray(row.links) ? row.links.filter((l) => l && isSafeBioHref(l.href)) : [],
  };
}

export function loadBios(): BioProfile[] {
  const extra = readJson<BioProfile[]>(KEY, []);
  const by = new Map<string, BioProfile>();
  for (const row of extra) by.set(row.handle, withCatalog(row));
  return Array.from(by.values());
}

const listeners = new Set<() => void>();

export function subscribeBios(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function persistBios(rows: BioProfile[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function tapCount(handle: string) {
  const all = readJson<Record<string, number>>(TAPS_KEY, {});
  return all[`${handle}:${todayKey()}`] || 0;
}

export function bumpTap(handle: string) {
  const all = readJson<Record<string, number>>(TAPS_KEY, {});
  const k = `${handle}:${todayKey()}`;
  all[k] = (all[k] || 0) + 1;
  try {
    localStorage.setItem(TAPS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all[k];
}

const LINK_TYPE = new Set<string>(BIO_LINK_TYPES.map((t) => t.id));

export function profileFromDoc(id: string, data: Record<string, unknown>): BioProfile {
  const geoRaw = data.geo as { lat?: number; lng?: number; latitude?: number; longitude?: number } | undefined;
  const lat = Number(geoRaw?.lat ?? geoRaw?.latitude);
  const lng = Number(geoRaw?.lng ?? geoRaw?.longitude);
  const links = Array.isArray(data.links)
    ? (data.links as Array<Record<string, unknown>>)
        .filter((row) => LINK_TYPE.has(String(row.type || "")) && isSafeBioHref(row.href))
        .map((row, i) => ({
          id: String(row.id || `l-${i}`),
          type: String(row.type) as BioLinkType,
          label: String(row.label || ""),
          href: String(row.href).trim().slice(0, 300),
        })) satisfies BioLink[]
    : [];
  const offer = data.offer as { badge?: string; detail?: string } | null | undefined;
  return {
    id,
    handle: normalizeHandle(String(data.handle || "")),
    kind: data.kind === "person" || data.kind === "business" ? (data.kind as BioKind) : undefined,
    ownerUid: data.ownerUid ? String(data.ownerUid) : undefined,
    name: String(data.name || ""),
    shortWhy: String(data.shortWhy || ""),
    city: String(data.city || ""),
    category: (data.category as BusinessCategoryId) || "eat",
    hours: String(data.hours || ""),
    openNow: Boolean(data.openNow),
    phone: data.phone ? String(data.phone) : undefined,
    avatar: data.avatar ? String(data.avatar) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    offer: offer?.badge ? { badge: String(offer.badge), detail: String(offer.detail || "") } : undefined,
    products: sanitizeCatalog("product", data.products),
    services: sanitizeCatalog("service", data.services),
    deals: sanitizeCatalog("deal", data.deals),
    links,
    placeId: data.placeId ? String(data.placeId) : undefined,
    listingId: data.listingId ? String(data.listingId) : undefined,
    propertyId: data.propertyId ? String(data.propertyId) : undefined,
    stallId: data.stallId ? String(data.stallId) : undefined,
    eventId: data.eventId ? String(data.eventId) : undefined,
    mapsPlaceId: data.mapsPlaceId ? String(data.mapsPlaceId) : undefined,
    registeredName: data.registeredName ? String(data.registeredName) : undefined,
    registrationNumber: data.registrationNumber ? String(data.registrationNumber) : undefined,
    domain: data.domain ? String(data.domain) : undefined,
    trademark: data.trademark ? String(data.trademark) : undefined,
  };
}

export async function fetchPublicBio(handle: string): Promise<BioProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const h = normalizeHandle(handle);
  if (!h) return null;
  const href = await getDoc(doc(db, "handles", h));
  if (!href.exists()) return null;
  const profileId = String(href.data()?.profileId || "");
  if (!profileId) return null;
  const snap = await getDoc(doc(db, "profiles", profileId));
  if (!snap.exists()) return null;
  return profileFromDoc(snap.id, snap.data() as Record<string, unknown>);
}
