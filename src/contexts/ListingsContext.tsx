import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { nanoid } from "nanoid";
import {
  DEFAULT_LISTING_GEO,
  DEFAULT_PRECINCT_ID,
  placeCategoryFor,
  type BusinessCategoryId,
  type BusinessListing,
} from "@shared/business";
import type { PlaceDeal } from "@shared/nearby";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { liveBackendEnabled, upsertBusinessDealRemote, upsertBusinessListingRemote } from "@/lib/functions";
import {
  getCachedListings,
  hydrateListings,
  listingDefaults,
  removeCachedListing,
  subscribeListings,
  upsertCachedListing,
} from "@/lib/listings";
import { fetchPlaces, loadPlaces } from "@/lib/places-store";
import { syncListingToBio } from "@/lib/identity";
import { useAuth } from "@/contexts/AuthContext";
import { useOptionalSync } from "@/contexts/SyncContext";
import { track } from "@/lib/analytics";
import { isoFromUnknown } from "@shared/freshness";

export type SavePlaceInput = {
  name: string;
  category: BusinessCategoryId;
  address: string;
  hours: string;
  shortWhy: string;
  description?: string;
  phone?: string;
  geo?: { lat: number; lng: number };
  handle?: string;
  heroImage?: string;
  mapsPlaceId?: string;
  website?: string;
};

type ListingsValue = {
  listings: BusinessListing[];
  mine: BusinessListing | null;
  myListings: BusinessListing[];
  selectedListingId: string | null;
  setSelectedListingId: (id: string | null) => void;
  version: number;
  /** True after the first listings + places fetch settles (success or fail). */
  remoteLoaded: boolean;
  savePlace: (input: SavePlaceInput, targetListingId?: string) => Promise<BusinessListing>;
  createPlace: (input: SavePlaceInput) => Promise<BusinessListing>;
  deleteListing: (listingId: string) => Promise<void>;
  saveDeal: (listingId: string, deal: PlaceDeal | null) => Promise<void>;
  confirmHours: () => Promise<void>;
};

const ListingsContext = createContext<ListingsValue | undefined>(undefined);

function fromFirestore(id: string, data: Record<string, unknown>): BusinessListing {
  const geo = data.geo as { lat?: number; lng?: number; latitude?: number; longitude?: number } | undefined;
  return listingDefaults({
    id,
    placeId: String(data.placeId || id),
    ownerUid: String(data.ownerUid || ""),
    ownerEmail: String(data.ownerEmail || ""),
    name: String(data.name || ""),
    category: data.category as BusinessCategoryId,
    placeCategory: placeCategoryFor(String(data.category || "eat")),
    address: String(data.address || ""),
    hours: String(data.hours || "See venue"),
    shortWhy: String(data.shortWhy || ""),
    description: data.description ? String(data.description) : undefined,
    heroImage: data.heroImage ? String(data.heroImage) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    mapsPlaceId: data.mapsPlaceId ? String(data.mapsPlaceId) : undefined,
    website: data.website ? String(data.website) : undefined,
    deal: (data.deal as PlaceDeal | undefined) || undefined,
    geo: {
      lat: Number(geo?.lat ?? geo?.latitude ?? DEFAULT_LISTING_GEO.lat),
      lng: Number(geo?.lng ?? geo?.longitude ?? DEFAULT_LISTING_GEO.lng),
    },
    precinctId: String(data.precinctId || DEFAULT_PRECINCT_ID),
    status: data.status === "inactive" ? "inactive" : "active",
    verifiedOwner: data.verifiedOwner === true,
    plan: data.plan === "featured" || data.plan === "partner" ? data.plan : "presence",
    updatedAt: isoFromUnknown(data.updatedAt),
    hoursVerifiedAt: isoFromUnknown(data.hoursVerifiedAt) || isoFromUnknown(data.updatedAt),
  });
}

const SELECTED_LISTING_STORAGE_KEY = "airpal.selected_listing_id";

export function ListingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const sync = useOptionalSync();
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [version, setVersion] = useState(0);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [selectedListingId, setSelectedListingIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_LISTING_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setSelectedListingId = useCallback((id: string | null) => {
    setSelectedListingIdState(id);
    try {
      if (id) localStorage.setItem(SELECTED_LISTING_STORAGE_KEY, id);
      else localStorage.removeItem(SELECTED_LISTING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const bump = useCallback((rows: BusinessListing[]) => {
    setListings(rows);
    setVersion((n) => n + 1);
  }, []);

  useEffect(() => {
    bump(hydrateListings());
    return subscribeListings(() => bump(getCachedListings()));
  }, [bump]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setRemoteLoaded(true);
      return;
    }
    void Promise.all([
      getDocs(query(collection(db, "listings"), where("status", "==", "active")))
        .then((snap) => {
          const remote = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
          const local = getCachedListings();
          const byId = new Map<string, BusinessListing>();
          for (const row of [...local, ...remote]) byId.set(row.id, row);
          const merged = Array.from(byId.values());
          merged.forEach(upsertCachedListing);
          bump(merged);
        })
        .catch(() => undefined),
      fetchPlaces()
        .then(() => {
          loadPlaces();
          bump(getCachedListings());
        })
        .catch(() => undefined),
    ]).finally(() => setRemoteLoaded(true));

    const handleReload = () => {
      bump(getCachedListings());
    };
    window.addEventListener("airpal:reload-data", handleReload);
    return () => {
      window.removeEventListener("airpal:reload-data", handleReload);
    };
  }, [bump]);

  const myListings = useMemo(() => {
    if (!user) return [];
    return listings.filter(
      (row) =>
        row.ownerUid === user.uid ||
        (user.email && row.ownerEmail?.trim().toLowerCase() === user.email.trim().toLowerCase()),
    );
  }, [listings, user]);

  const mine = useMemo(() => {
    if (!user) {
      return listings.find((row) => row.ownerEmail && !row.ownerUid) || listings[0] || null;
    }
    if (selectedListingId) {
      const target = myListings.find((row) => row.id === selectedListingId);
      if (target) return target;
    }
    return myListings[0] || null;
  }, [listings, myListings, selectedListingId, user]);

  const value = useMemo<ListingsValue>(
    () => ({
      listings,
      mine,
      myListings,
      selectedListingId,
      setSelectedListingId,
      version,
      remoteLoaded,
      async savePlace(input, targetListingId) {
        const existing = targetListingId
          ? listings.find((r) => r.id === targetListingId) || mine
          : mine;
        const id = existing?.id || `list-${nanoid(8)}`;
        const listing = listingDefaults({
          ...existing,
          id,
          name: input.name.trim(),
          category: input.category,
          placeCategory: placeCategoryFor(input.category),
          address: input.address.trim(),
          hours: input.hours.trim() || "See venue",
          shortWhy: input.shortWhy.trim(),
          description: input.description !== undefined ? input.description.trim() : existing?.description,
          phone: input.phone?.trim(),
          ownerEmail: getFirebaseAuth()?.currentUser?.email || user?.email || existing?.ownerEmail || input.name,
          ownerUid: getFirebaseAuth()?.currentUser?.uid || user?.uid || existing?.ownerUid,
          geo: input.geo || existing?.geo || DEFAULT_LISTING_GEO,
          handle: input.handle || existing?.handle,
          heroImage: input.heroImage !== undefined ? input.heroImage : existing?.heroImage,
          mapsPlaceId: input.mapsPlaceId !== undefined ? input.mapsPlaceId : existing?.mapsPlaceId,
          website: input.website !== undefined ? input.website : existing?.website,
          hoursVerifiedAt: new Date().toISOString(),
        });
        upsertCachedListing(listing);
        syncListingToBio(listing);
        bump(getCachedListings());
        setSelectedListingId(listing.id);
        if (!existing) {
          void track("host_activation", {
            tenantId: listing.ownerUid || "local",
            activationStep: "listing_created",
            contextId: listing.id,
            actorRole: "host_admin",
          });
        }
        await sync?.runJob({
          id: `listing-${listing.id}`,
          label: "Listing",
          remote:
            liveBackendEnabled() && getFirebaseAuth()?.currentUser
              ? async () => {
                  const res = await upsertBusinessListingRemote({
                    listingId: listing.id,
                    name: listing.name,
                    category: listing.category,
                    address: listing.address,
                    hours: listing.hours,
                    shortWhy: listing.shortWhy,
                    description: listing.description,
                    phone: listing.phone,
                    lat: listing.geo.lat,
                    lng: listing.geo.lng,
                    precinctId: listing.precinctId,
                    heroImage: listing.heroImage,
                    mapsPlaceId: listing.mapsPlaceId,
                    website: listing.website,
                  });
                  listing.id = res.listingId;
                  listing.placeId = res.placeId;
                  upsertCachedListing(listing);
                  bump(getCachedListings());
                }
              : undefined,
        });
        return listing;
      },
      async createPlace(input) {
        const id = `list-${nanoid(8)}`;
        const listing = listingDefaults({
          id,
          name: input.name.trim(),
          category: input.category,
          placeCategory: placeCategoryFor(input.category),
          address: input.address.trim(),
          hours: input.hours.trim() || "See venue",
          shortWhy: input.shortWhy.trim(),
          description: input.description?.trim(),
          phone: input.phone?.trim(),
          ownerEmail: getFirebaseAuth()?.currentUser?.email || user?.email || input.name,
          ownerUid: getFirebaseAuth()?.currentUser?.uid || user?.uid,
          geo: input.geo || DEFAULT_LISTING_GEO,
          handle: input.handle,
          heroImage: input.heroImage,
          mapsPlaceId: input.mapsPlaceId,
          website: input.website,
          hoursVerifiedAt: new Date().toISOString(),
        });
        upsertCachedListing(listing);
        syncListingToBio(listing);
        bump(getCachedListings());
        setSelectedListingId(listing.id);
        void track("host_activation", {
          tenantId: listing.ownerUid || "local",
          activationStep: "listing_created",
          contextId: listing.id,
          actorRole: "host_admin",
        });
        await sync?.runJob({
          id: `listing-${listing.id}`,
          label: "Listing",
          remote:
            liveBackendEnabled() && getFirebaseAuth()?.currentUser
              ? async () => {
                  const res = await upsertBusinessListingRemote({
                    listingId: listing.id,
                    name: listing.name,
                    category: listing.category,
                    address: listing.address,
                    hours: listing.hours,
                    shortWhy: listing.shortWhy,
                    description: listing.description,
                    phone: listing.phone,
                    lat: listing.geo.lat,
                    lng: listing.geo.lng,
                    precinctId: listing.precinctId,
                    heroImage: listing.heroImage,
                    mapsPlaceId: listing.mapsPlaceId,
                    website: listing.website,
                  });
                  listing.id = res.listingId;
                  listing.placeId = res.placeId;
                  upsertCachedListing(listing);
                  bump(getCachedListings());
                }
              : undefined,
        });
        return listing;
      },
      async deleteListing(listingId: string) {
        removeCachedListing(listingId);
        const nextListings = listings.filter((r) => r.id !== listingId && r.placeId !== listingId);
        bump(nextListings);
        if (selectedListingId === listingId) {
          const remaining = nextListings.filter(
            (r) => r.ownerUid === user?.uid || (user?.email && r.ownerEmail === user.email),
          );
          setSelectedListingId(remaining[0]?.id || null);
        }
        const db = getFirebaseDb();
        if (db && user) {
          try {
            await deleteDoc(doc(db, "listings", listingId));
            const placeId = listingId.replace(/^list-/, "pl-");
            await setDoc(doc(db, "places", placeId), { status: "inactive", updatedAt: new Date().toISOString() }, { merge: true });
          } catch {
            /* ignore */
          }
        }
        void track("host_activation", {
          tenantId: user?.uid || "local",
          activationStep: "listing_deleted",
          contextId: listingId,
        });
      },
      async confirmHours() {
        if (!mine) return;
        const nowIso = new Date().toISOString();
        const listing = listingDefaults({ ...mine, hoursVerifiedAt: nowIso, updatedAt: nowIso });
        upsertCachedListing(listing);
        bump(getCachedListings());
        void track("host_activation", {
          tenantId: listing.ownerUid || "local",
          activationStep: "hours_verified",
          contextId: listing.id,
        });
        await sync?.runJob({
          id: `listing-hours-${listing.id}`,
          label: "Hours",
          remote:
            liveBackendEnabled() && getFirebaseAuth()?.currentUser
              ? async () => {
                  await upsertBusinessListingRemote({
                    listingId: listing.id,
                    name: listing.name,
                    category: listing.category,
                    address: listing.address,
                    hours: listing.hours,
                    shortWhy: listing.shortWhy,
                    phone: listing.phone,
                    lat: listing.geo.lat,
                    lng: listing.geo.lng,
                    precinctId: listing.precinctId,
                    heroImage: listing.heroImage,
                    mapsPlaceId: listing.mapsPlaceId,
                    website: listing.website,
                  });
                }
              : undefined,
        });
      },
      async saveDeal(listingId, deal) {
        const current = getCachedListings().find((row) => row.id === listingId);
        if (!current) return;
        const next = { ...current, deal: deal || undefined };
        upsertCachedListing(next);
        syncListingToBio(next);
        bump(getCachedListings());
        await sync?.runJob({
          id: `deal-${listingId}`,
          label: "Offer",
          remote:
            liveBackendEnabled() && getFirebaseAuth()?.currentUser && deal
              ? () =>
                  upsertBusinessDealRemote({
                    listingId,
                    badge: deal.badge,
                    detail: deal.detail,
                    expiry: deal.expiry,
                    active: true,
                  })
              : undefined,
        });
      },
    }),
    [bump, listings, mine, myListings, remoteLoaded, selectedListingId, setSelectedListingId, sync, user, version],
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

export function useListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListings");
  return ctx;
}
