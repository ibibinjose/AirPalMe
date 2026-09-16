import { collection, doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import {
  DEFAULT_HARBOUR_ROCKS_MARKER,
  DEFAULT_ROOM_101_MARKER,
  DEFAULT_STREET_ARGYLE_MARKER,
  THE_ROCKS_PLACES,
  THE_ROCKS_EVENTS,
} from "@shared/the-rocks-data";
import { SEED_BIO } from "@shared/bio";
import { KERALA_PLACES } from "@shared/kerala-data";
import { SEED_EVENT, SEED_STALLS } from "@shared/event";
import { WALKING_TOURS } from "@shared/tours";
import { HARBOUR_COLLEGE } from "@shared/campus";
import { THE_ROCKS_ZOO } from "@shared/zoo";
import { listingDefaults, upsertCachedListing } from "./listings";
import { cachePlaces, loadPlaces } from "./places-store";
import { businessCategoryForPlace, placeCategoryFor } from "@shared/business";
import { persistBios, loadBios } from "./bio-store";
import { upsertStoredMarker } from "./markers-store";
import { cacheTours } from "./tours-store";
import { cacheCampus } from "./campus-store";
import { cacheHunts } from "./hunts-store";
import { saveCachedProperty } from "./properties";
import { harbourStaySeeds } from "./seed-stay";

export type SeedResult = {
  ok: boolean;
  placesCount: number;
  eventsCount: number;
  biosCount: number;
  propertiesCount: number;
  error?: string;
};

function cleanDoc(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = cleanDoc(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

/**
 * Seeds data into the real Firestore database and local caches.
 * Rather than hardcoding seed data in client app bundles, this populates
 * the actual database collections (properties, listings, places, events, bios).
 */
export async function seedDatabase(): Promise<SeedResult> {
  let placesCount = 0;
  let eventsCount = 0;
  let biosCount = 0;
  let propertiesCount = 0;

  try {
    const db = getFirebaseDb();

    // 0. Live Harbour stay so /g/harbour-hotel and lobby QR resolve from Firestore.
    const stays = harbourStaySeeds();
    propertiesCount = stays.length;
    for (const stay of stays) {
      saveCachedProperty(stay.property);
      if (!db) continue;
      try {
        const propRef = doc(db, "properties", stay.property.id);
        const stamped = new Date().toISOString();
        void setDoc(
          propRef,
          cleanDoc({ ...stay.property, wifiUpdatedAt: stamped, updatedAt: stamped }),
        ).catch(() => undefined);
        void setDoc(
          doc(db, "properties", stay.property.id, "private", "hostSecrets"),
          cleanDoc({ ...stay.secrets, updatedAt: new Date().toISOString() }),
        ).catch(() => undefined);
        const byNumber: Record<string, string> = {};
        for (const row of stay.qrCodes) byNumber[row.roomNumber] = row.token;
        void setDoc(doc(db, "properties", stay.property.id, "private", "roomMap"), {
          byToken: stay.property.roomTokens || {},
          byNumber,
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);
        for (const row of stay.qrCodes) {
          void setDoc(doc(db, "properties", stay.property.id, "qrCodes", row.token), {
            type: "room",
            roomNumber: row.roomNumber,
            roomToken: row.token,
            propertyId: stay.property.id,
            updatedAt: new Date().toISOString(),
          }).catch(() => undefined);
        }
        for (const item of stay.menu) {
          void setDoc(
            doc(collection(db, "properties", stay.property.id, "menu"), item.id),
            cleanDoc({ ...item, updatedAt: new Date().toISOString() }),
          ).catch(() => undefined);
        }
      } catch {
        /* platformAdmin / host required — admin CLI seed writes these for real */
      }
    }

    // 1. Seed Listings & Places from The Rocks + Kerala
    for (const place of [...THE_ROCKS_PLACES, ...KERALA_PLACES]) {
      const listing = listingDefaults({
        id: `list-${place.id}`,
        placeId: place.id,
        name: place.name,
        category: businessCategoryForPlace(place.category),
        placeCategory: placeCategoryFor(place.category),
        address: place.address || "Local precinct",
        hours: place.hours || "See venue",
        shortWhy: place.shortWhy,
        heroImage: place.heroImage,
        phone: place.phone,
        deal: place.deal,
        geo: place.geo,
        precinctId: place.precinctId || "local",
        handle: place.handle,
        status: "active",
      });

      upsertCachedListing(listing);
      placesCount++;

      if (db) {
        try {
          void setDoc(
            doc(db, "listings", listing.id),
            cleanDoc({
              ...listing,
              updatedAt: new Date().toISOString(),
            }),
          ).catch(() => undefined);
          void setDoc(
            doc(db, "places", place.id),
            cleanDoc({
              ...place,
              updatedAt: new Date().toISOString(),
            }),
          ).catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
    }

    // Also seed Cut Bar listing
    const cutBarListing = listingDefaults({
      id: "list-cut-bar-grill",
      placeId: "cut-bar-grill",
      handle: "cutbar",
      name: "The Cut Bar & Grill",
      category: "eat",
      placeCategory: "eat",
      address: "Argyle St, The Rocks",
      hours: "12:00–22:30",
      shortWhy: "Dry-aged beef under Argyle.",
      heroImage: "/media/laneway.jpg",
      deal: { badge: "Welcome flute", detail: "With dinner. Show AirPal." },
      status: "active",
    });
    upsertCachedListing(cutBarListing);
    placesCount++;
    const byPlaceId = new Map(loadPlaces().map((p) => [p.id, p]));
    for (const place of [...THE_ROCKS_PLACES, ...KERALA_PLACES]) {
      if (place.status === "active") byPlaceId.set(place.id, place);
    }
    cachePlaces(Array.from(byPlaceId.values()));

    if (db) {
      try {
        void setDoc(
          doc(db, "listings", cutBarListing.id),
          cleanDoc({ ...cutBarListing, updatedAt: new Date().toISOString() }),
        ).catch(() => undefined);
      } catch {
        /* ignore */
      }
    }

    // 2. Seed Events (curated NearbyEvents become real DB docs).
    // status "live" keeps them publicly listable per firestore.rules; docs
    // without a city stay unscoped and match every guest city.
    for (const event of THE_ROCKS_EVENTS) {
      eventsCount++;
      if (db) {
        try {
          void setDoc(
            doc(db, "events", event.id),
            cleanDoc({
              ...event,
              status: "live",
              updatedAt: new Date().toISOString(),
            }),
          ).catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
    }

    // 2b. Seed the market as an organiser-style record plus its stalls, so
    // /e/evt-rocks-market renders the expo directory from the DB, not the bundle.
    if (db) {
      try {
        void setDoc(
          doc(db, "events", SEED_EVENT.id),
          cleanDoc({ ...SEED_EVENT, updatedAt: new Date().toISOString() }),
        ).catch(() => undefined);
        for (const stall of SEED_STALLS) {
          void setDoc(
            doc(collection(db, "events", SEED_EVENT.id, "stalls"), stall.id),
            cleanDoc({ ...stall, updatedAt: new Date().toISOString() }),
          ).catch(() => undefined);
        }
      } catch {
        /* ignore */
      }
    }
    eventsCount++;

    // 3. Markers (QR /q/:id)
    const markers = [DEFAULT_HARBOUR_ROCKS_MARKER, DEFAULT_ROOM_101_MARKER, DEFAULT_STREET_ARGYLE_MARKER];
    for (const marker of markers) {
      upsertStoredMarker(marker);
      if (db) {
        try {
          void setDoc(doc(db, "markers", marker.id), cleanDoc({ ...marker, updatedAt: new Date().toISOString() })).catch(
            () => undefined,
          );
        } catch {
          /* ignore */
        }
      }
    }

    // 4. Walking tours
    cacheTours(WALKING_TOURS);
    if (db) {
      for (const tour of WALKING_TOURS) {
        try {
          void setDoc(doc(db, "tours", tour.id), cleanDoc({ ...tour, updatedAt: new Date().toISOString() })).catch(
            () => undefined,
          );
        } catch {
          /* ignore */
        }
      }
    }

    // 5. Campus
    cacheCampus(HARBOUR_COLLEGE);
    if (db) {
      try {
        void setDoc(
          doc(db, "campuses", HARBOUR_COLLEGE.id),
          cleanDoc({ ...HARBOUR_COLLEGE, updatedAt: new Date().toISOString() }),
        ).catch(() => undefined);
      } catch {
        /* ignore */
      }
    }

    // 6. Zoo hunts
    cacheHunts([THE_ROCKS_ZOO]);
    if (db) {
      try {
        void setDoc(
          doc(db, "zooHunts", THE_ROCKS_ZOO.id),
          cleanDoc({ ...THE_ROCKS_ZOO, updatedAt: new Date().toISOString() }),
        ).catch(() => undefined);
      } catch {
        /* ignore */
      }
    }

    // 7. Seed Bio
    const existingBios = loadBios();
    if (!existingBios.some((b) => b.handle === SEED_BIO.handle)) {
      persistBios([...existingBios, SEED_BIO]);
      biosCount++;
      if (db) {
        try {
          void setDoc(
            doc(db, "bios", SEED_BIO.handle),
            cleanDoc({
              ...SEED_BIO,
              updatedAt: new Date().toISOString(),
            }),
          ).catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
    }

    return {
      ok: true,
      placesCount,
      eventsCount,
      biosCount,
      propertiesCount,
    };
  } catch (err) {
    return {
      ok: false,
      placesCount,
      eventsCount,
      biosCount,
      propertiesCount,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
