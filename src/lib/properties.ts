import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import type { MenuItem, PropertyInfo } from "@shared/airpal-data";
import { buildHostProperty, parseHostPropertyKind } from "@shared/host-property";
import { isoFromUnknown } from "@shared/freshness";
import { getFirebaseDb } from "./firebase";
import { liveBackendEnabled, updatePropertyProfileRemote, updatePropertyWifiRemote } from "./functions";

const CACHE_KEY = "airpal.properties.v1";

function readCache(): Record<string, PropertyInfo> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PropertyInfo>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, PropertyInfo>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore storage quota / sandbox */
  }
}

const listeners = new Set<(propertyId: string, property: PropertyInfo) => void>();

function notifyPropertyChange(prop: PropertyInfo) {
  listeners.forEach((fn) => fn(prop.id, prop));
}

export function subscribePropertyChanges(fn: (propertyId: string, property: PropertyInfo) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Generic placeholder for a stay the DB does not know. Carries no venue
 * facts — name/address/room data stay empty so the UI shows "ask the desk"
 * states instead of invented content. Never a fake hotel.
 */
export function unknownProperty(id: string): PropertyInfo {
  return {
    id: id || "unknown",
    name: "",
    tagline: "",
    destination: "",
    city: "",
    country: "",
    address: "",
    phone: "",
    whatsapp: "",
    wifi: { network: "", password: "", speed: "" },
    checkIn: "",
    checkOut: "",
    breakfast: { hours: "", location: "", type: "", price: "" },
    facilities: [],
  };
}

export function getCachedProperty(id: string): PropertyInfo | undefined {
  if (!id) return undefined;
  const cache = readCache();
  return cache[id];
}

export function saveCachedProperty(prop: PropertyInfo) {
  if (!prop || !prop.id) return;
  const cache = readCache();
  cache[prop.id] = prop;
  writeCache(cache);
  notifyPropertyChange(prop);
}

/** Normalize raw doc data into a valid PropertyInfo */
export function normalizeProperty(id: string, data: Record<string, unknown>): PropertyInfo {
  const kind = parseHostPropertyKind(data.kind as string | undefined);
  const base = buildHostProperty({
    propertyName: String(data.name || "My Property"),
    ownerEmail: String(data.ownerEmail || ""),
    ownerId: String(data.ownerId || ""),
    kind,
    city: String(data.city || data.destination || "Your city"),
    country: String(data.country || "Australia"),
    countryCode: data.countryCode ? String(data.countryCode) : undefined,
    state: data.state ? String(data.state) : undefined,
    postalCode: data.postalCode ? String(data.postalCode) : undefined,
    address: String(data.address || ""),
    phone: String(data.phone || ""),
    id,
    tagline: data.tagline ? String(data.tagline) : undefined,
    wifiNetwork: (data.wifi as { network?: string } | undefined)?.network,
    wifiPassword: (data.wifi as { password?: string } | undefined)?.password,
    checkIn: data.checkIn ? String(data.checkIn) : undefined,
    checkOut: data.checkOut ? String(data.checkOut) : undefined,
  });

  return {
    ...base,
    ...data,
    id,
    name: String(data.name || base.name || ""),
    phone: String(data.phone || base.phone || ""),
    whatsapp: String(data.whatsapp || base.whatsapp || ""),
    wifi: {
      network: (data.wifi as { network?: string } | undefined)?.network || base.wifi.network || "",
      password: (data.wifi as { password?: string } | undefined)?.password || base.wifi.password || "",
      speed: (data.wifi as { speed?: string } | undefined)?.speed || base.wifi.speed || "",
    },
    breakfast: {
      ...base.breakfast,
      ...((data.breakfast as object) || {}),
    },
    facilities:
      Array.isArray(data.facilities) && data.facilities.length > 0
        ? (data.facilities as PropertyInfo["facilities"])
        : base.facilities || [],
    roomTokens: (data.roomTokens as Record<string, string>) || base.roomTokens || {},
    lobbyMarkerId: data.lobbyMarkerId ? String(data.lobbyMarkerId) : undefined,
    wifiUpdatedAt: isoFromUnknown(data.wifiUpdatedAt),
    hoursVerifiedAt: isoFromUnknown(data.hoursVerifiedAt),
  };
}

const REMOTE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function refreshProperty(id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    const snap = await withTimeout(getDoc(doc(db, "properties", id)), REMOTE_TIMEOUT_MS);
    if (snap?.exists()) {
      saveCachedProperty(normalizeProperty(id, snap.data() as Record<string, unknown>));
    }
  } catch {
    /* stay on cache */
  }
}

export async function fetchProperty(id: string): Promise<PropertyInfo> {
  if (!id) return unknownProperty(id);
  const cached = getCachedProperty(id);
  // Cached DB copy wins instantly (offline-safe); remote refreshes in background.
  if (cached) {
    if (liveBackendEnabled()) void refreshProperty(id);
    return cached;
  }
  if (liveBackendEnabled()) {
    const db = getFirebaseDb();
    if (db) {
      try {
        const snap = await withTimeout(getDoc(doc(db, "properties", id)), REMOTE_TIMEOUT_MS);
        if (snap?.exists()) {
          const prop = normalizeProperty(id, snap.data() as Record<string, unknown>);
          saveCachedProperty(prop);
          return prop;
        }
      } catch {
        /* unknown stay below */
      }
    }
  }

  // Unknown stay: generic placeholder, never a fake venue.
  return unknownProperty(id);
}

/** In-room dining from `properties/{id}/menu`. Empty when the stay has none. */
export async function fetchPropertyMenu(propertyId: string): Promise<MenuItem[]> {
  if (!propertyId || propertyId === "unknown") return [];
  const db = getFirebaseDb();
  if (!db) return [];
  try {
    const snap = await withTimeout(getDocs(collection(db, "properties", propertyId, "menu")), REMOTE_TIMEOUT_MS);
    if (!snap) return [];
    const items: MenuItem[] = [];
    for (const row of snap.docs) {
      const data = row.data() as Partial<MenuItem>;
      const name = String(data.name || "").trim();
      const price = Number(data.price);
      if (!name || !Number.isFinite(price)) continue;
      items.push({
        id: String(data.id || row.id),
        propertyId,
        name,
        category: (data.category as MenuItem["category"]) || "Mains",
        price,
        description: String(data.description || ""),
        dietary: Array.isArray(data.dietary) ? data.dietary.map(String) : undefined,
        popular: Boolean(data.popular),
        available: data.available !== false,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export function subscribeProperty(id: string, callback: (prop: PropertyInfo) => void): () => void {
  // Always trigger immediately with the cached DB copy when present.
  const initial = id ? getCachedProperty(id) : undefined;
  if (initial) callback(initial);

  // Subscribe to local cache updates
  const unsubLocal = subscribePropertyChanges((changedId, changedProp) => {
    if (changedId === id) callback(changedProp);
  });

  // Subscribe to Firestore if enabled
  let unsubFirestore: (() => void) | undefined;
  if (liveBackendEnabled() && id) {
    const db = getFirebaseDb();
    if (db) {
      try {
        unsubFirestore = onSnapshot(
          doc(db, "properties", id),
          (snap) => {
            if (snap.exists()) {
              const prop = normalizeProperty(id, snap.data() as Record<string, unknown>);
              saveCachedProperty(prop);
              callback(prop);
            }
          },
          () => {
            /* keep last cached property */
          },
        );
      } catch {
        /* ignore */
      }
    }
  }

  // Also kick off an async fetch if not cached
  if (!initial) {
    void fetchProperty(id).then(callback);
  }

  return () => {
    unsubLocal();
    if (unsubFirestore) unsubFirestore();
  };
}

export async function updatePropertyWifi(data: {
  propertyId: string;
  network: string;
  password: string;
  speed?: string;
}): Promise<void> {
  const current = getCachedProperty(data.propertyId) || (await fetchProperty(data.propertyId));
  const updated: PropertyInfo = {
    ...current,
    wifi: {
      network: data.network,
      password: data.password,
      speed: data.speed || current.wifi?.speed || "Wi-Fi",
    },
  };
  saveCachedProperty(updated);

  if (liveBackendEnabled()) {
    await updatePropertyWifiRemote({
      propertyId: data.propertyId,
      network: data.network,
      password: data.password,
      speed: data.speed || current.wifi?.speed || "Wi-Fi",
    });
  }
}

export type PropertyProfilePatch = {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  heroImage?: string;
  staffPicks?: PropertyInfo["staffPicks"];
  winbackOffer?: PropertyInfo["winbackOffer"];
  breakfast?: PropertyInfo["breakfast"];
  facilities?: PropertyInfo["facilities"];
  roomTypes?: PropertyInfo["roomTypes"];
  roomStatuses?: PropertyInfo["roomStatuses"];
  confirmHours?: boolean;
};

export async function savePropertyProfile(propertyId: string, patch: PropertyProfilePatch): Promise<PropertyInfo> {
  const current = getCachedProperty(propertyId) || (await fetchProperty(propertyId));
  const next: PropertyInfo = {
    ...current,
    ...patch,
    id: propertyId,
    wifi: { ...current.wifi, password: current.wifi?.password || "" },
    hoursVerifiedAt: patch.confirmHours ? new Date().toISOString() : current.hoursVerifiedAt,
  };
  saveCachedProperty(next);

  const db = getFirebaseDb();
  if (db) {
    const { confirmHours, ...rest } = patch;
    // Firestore rejects undefined: an explicitly-undefined field clears the stored value.
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      cleaned[key] = value === undefined ? deleteField() : value;
    }
    await setDoc(
      doc(db, "properties", propertyId),
      {
        ...cleaned,
        ...(confirmHours ? { hoursVerifiedAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
  if (liveBackendEnabled()) {
    try {
      await updatePropertyProfileRemote({ propertyId, ...patch });
    } catch {
      /* client write already applied; callable may not be deployed yet */
    }
  }
  return next;
}

export function subscribePropertyMenu(propertyId: string, callback: (rows: MenuItem[]) => void): () => void {
  if (!propertyId || propertyId === "unknown") {
    callback([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db) {
    void fetchPropertyMenu(propertyId).then(callback);
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "menu"),
    (snap) => {
      const items: MenuItem[] = [];
      for (const row of snap.docs) {
        const data = row.data() as Partial<MenuItem>;
        const name = String(data.name || "").trim();
        const price = Number(data.price);
        if (!name || !Number.isFinite(price)) continue;
        items.push({
          id: String(data.id || row.id),
          propertyId,
          name,
          category: (data.category as MenuItem["category"]) || "Mains",
          price,
          description: String(data.description || ""),
          dietary: Array.isArray(data.dietary) ? data.dietary.map(String) : undefined,
          popular: Boolean(data.popular),
          available: data.available !== false,
        });
      }
      callback(items);
    },
    () => {
      void fetchPropertyMenu(propertyId).then(callback);
    },
  );
}

export async function savePropertyMenuItem(propertyId: string, item: MenuItem): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database is not configured.");
  await setDoc(doc(db, "properties", propertyId, "menu", item.id), {
    ...item,
    propertyId,
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePropertyMenuItem(propertyId: string, itemId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database is not configured.");
  await deleteDoc(doc(db, "properties", propertyId, "menu", itemId));
}
