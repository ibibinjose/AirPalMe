import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import { handleError, normalizeHandle, type BioKind, type BioOffer, type BioProfile } from "@shared/bio";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  liveBackendEnabled,
  checkHandleAvailableRemote,
  createBusinessProfileRemote,
  recordBioTapRemote,
  setBioOfferRemote,
  transferHandleRemote,
  updateBusinessProfileRemote,
} from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { bumpTap, loadBios, persistBios, subscribeBios, tapCount } from "@/lib/bio-store";
import { syncBioToListing } from "@/lib/identity";
import { placeByHandle } from "@/lib/catalog";
import { stallByHandle } from "@/lib/bio-handle";
import { getCachedListings } from "@/lib/listings";

type CreateBioInput = Pick<BioProfile, "handle" | "name" | "city" | "shortWhy"> & {
  category?: BioProfile["category"];
  kind?: BioKind;
  registeredName?: string;
  registrationNumber?: string;
  domain?: string;
  trademark?: string;
  phone?: string;
  geo?: BioProfile["geo"];
  propertyId?: string;
};

type BioValue = {
  profiles: BioProfile[];
  mine: BioProfile | null;
  business: BioProfile | null;
  byHandle: (handle: string) => BioProfile | undefined;
  handleFree: (handle: string, exceptId?: string) => Promise<{ ok: boolean; reason?: string }>;
  createProfile: (input: CreateBioInput) => Promise<BioProfile>;
  updateProfile: (patch: Partial<BioProfile> & { handle: string }) => Promise<void>;
  setOffer: (handle: string, offer: BioOffer | null) => Promise<void>;
  transferHandle: (from: string, to: string) => Promise<string>;
  recordTap: (handle: string, kind?: string) => void;
  tapsToday: (handle: string) => number;
};

const BioContext = createContext<BioValue | undefined>(undefined);

export function BioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<BioProfile[]>(() => (typeof window === "undefined" ? [] : loadBios()));

  const refresh = useCallback(() => setProfiles(loadBios()), []);

  useEffect(() => {
    refresh();
    return subscribeBios(refresh);
  }, [refresh]);

  const owned = useMemo(() => {
    if (!user) return profiles.filter((p) => p.ownerEmail || p.ownerUid || p.id.startsWith("bio-"));
    return profiles.filter((p) => p.ownerUid === user.uid || p.ownerEmail === user.email);
  }, [profiles, user]);

  const mine = useMemo(() => owned.find((p) => p.kind === "person") || owned[0] || null, [owned]);

  const business = useMemo(
    () =>
      owned.find((p) => (p.kind || "business") === "business" && p.kind !== "person") ||
      owned.find((p) => p.kind === "business") ||
      null,
    [owned],
  );

  const byHandle = useCallback(
    (handle: string) => profiles.find((p) => p.handle === normalizeHandle(handle)),
    [profiles],
  );

  const tapsToday = useCallback((handle: string) => tapCount(handle), []);

  const recordTap = useCallback((handle: string, kind?: string) => {
    bumpTap(handle);
    if (liveBackendEnabled()) {
      void recordBioTapRemote({ handle, kind: kind || "view" }).catch(() => undefined);
    }
  }, []);

  const handleFree = useCallback(async (handle: string, exceptId?: string) => {
    const err = handleError(handle);
    if (err) return { ok: false, reason: err };
    const h = normalizeHandle(handle);
    const skip = exceptId || "";
    const existing = loadBios().find((p) => p.handle === h && p.id !== skip);
    if (existing) return { ok: false, reason: "Taken" };
    const listingHit = getCachedListings().find((row) => row.handle === h && row.id !== skip);
    if (listingHit) return { ok: false, reason: "Taken" };
    if (liveBackendEnabled()) {
      try {
        const res = await checkHandleAvailableRemote({ handle: h });
        if (!res.ok) return { ok: false, reason: res.reason || "Taken" };
      } catch {
        /* local already checked */
      }
    }
    return { ok: true };
  }, []);

  const createProfile = useCallback(
    async (input: CreateBioInput) => {
      const h = normalizeHandle(input.handle);
      const err = handleError(h);
      if (err) throw new Error(err);
      const kind: BioKind = input.kind || "person";
      const sameKind = kind === "business" ? business : mine?.kind === "person" ? mine : null;
      const existing = loadBios().find((p) => p.handle === h);
      if (existing && existing.id !== sameKind?.id) throw new Error("Taken");
      const place = placeByHandle(h);
      const stall = stallByHandle(h);
      const listing = getCachedListings().find((row) => row.handle === h || row.id === business?.listingId);
      const listingId = kind === "business" ? business?.listingId || listing?.id || `list-${h}` : business?.listingId;
      const keep = kind === "business" ? business : sameKind;
      const profile: BioProfile = {
        id: keep?.id || existing?.id || `bio-${nanoid(8)}`,
        handle: h,
        kind,
        ownerUid: getFirebaseAuth()?.currentUser?.uid || user?.uid,
        ownerEmail: getFirebaseAuth()?.currentUser?.email || user?.email,
        name: input.name.trim(),
        shortWhy: input.shortWhy.trim(),
        city: input.city.trim() || "Sydney",
        category: input.category || keep?.category || (kind === "person" ? "services" : "eat"),
        hours: keep?.hours || place?.hours || (kind === "person" ? "" : stall ? "Market hours" : "See bio"),
        openNow: keep?.openNow ?? place?.openNow ?? true,
        phone: input.phone || keep?.phone || place?.phone,
        geo: input.geo || keep?.geo || place?.geo,
        avatar: keep?.avatar || place?.heroImage,
        cover: keep?.cover || place?.heroImage || place?.photos?.[0],
        offer:
          keep?.offer ||
          (place?.deal ? { badge: place.deal.badge, detail: place.deal.detail } : undefined) ||
          (stall?.offer ? { badge: "Market", detail: stall.offer } : undefined),
        products: keep?.products || [],
        services: keep?.services || [],
        deals: keep?.deals || [],
        links: keep?.links || [],
        placeId: keep?.placeId || place?.id,
        listingId,
        propertyId: input.propertyId || keep?.propertyId,
        stallId: keep?.stallId || stall?.id,
        eventId: keep?.eventId || stall?.eventId,
        mapsPlaceId: keep?.mapsPlaceId || place?.mapsPlaceId,
        registeredName: input.registeredName?.trim() || keep?.registeredName,
        registrationNumber: input.registrationNumber?.trim() || keep?.registrationNumber,
        domain: input.domain?.trim() || keep?.domain,
        trademark: input.trademark?.trim() || keep?.trademark,
      };
      persistBios([
        profile,
        ...loadBios().filter(
          (p) =>
            p.handle !== h &&
            p.id !== profile.id &&
            !(p.ownerUid && p.ownerUid === profile.ownerUid && (p.kind || "business") === kind),
        ),
      ]);
      if (kind === "business") syncBioToListing(profile);
      refresh();
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        try {
          const res = await createBusinessProfileRemote({
            handle: h,
            name: profile.name,
            city: profile.city,
            category: profile.category,
            shortWhy: profile.shortWhy,
            placeId: profile.placeId,
            listingId: profile.listingId,
          });
          profile.id = res.profileId;
          persistBios([profile, ...loadBios().filter((p) => p.handle !== h && p.id !== profile.id)]);
          refresh();
        } catch {
          /* local profile is enough for demo */
        }
      }
      return profile;
    },
    [business, mine, refresh, user],
  );

  const updateProfile = useCallback(
    async (patch: Partial<BioProfile> & { handle: string }) => {
      const current = loadBios().find((p) => p.handle === patch.handle);
      if (!current) throw new Error("No profile");
      const next = { ...current, ...patch };
      if (patch.deals)
        next.offer = next.deals[0]
          ? { badge: next.deals[0].badge || next.deals[0].title, detail: next.deals[0].detail }
          : undefined;
      persistBios([next, ...loadBios().filter((p) => p.handle !== next.handle)]);
      if ((next.kind || "business") === "business") syncBioToListing(next);
      refresh();
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        try {
          await updateBusinessProfileRemote({
            handle: next.handle,
            name: next.name,
            shortWhy: next.shortWhy,
            city: next.city,
            category: next.category,
            hours: next.hours,
            openNow: next.openNow,
            phone: next.phone,
            avatar: next.avatar,
            cover: next.cover,
            links: next.links,
            products: next.products,
            services: next.services,
            deals: next.deals,
            mapsPlaceId: next.mapsPlaceId,
            listingId: next.listingId,
            placeId: next.placeId,
          });
        } catch {
          /* local save already applied */
        }
      }
    },
    [refresh],
  );

  const setOffer = useCallback(
    async (handle: string, offer: BioOffer | null) => {
      const current = loadBios().find((p) => p.handle === handle);
      if (!current) return;
      const next = { ...current, offer: offer || undefined };
      persistBios([next, ...loadBios().filter((p) => p.handle !== handle)]);
      syncBioToListing(next);
      refresh();
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        try {
          await setBioOfferRemote({
            handle,
            badge: offer?.badge || "",
            detail: offer?.detail || "",
            active: Boolean(offer),
          });
        } catch {
          /* local save already applied */
        }
      }
    },
    [refresh],
  );

  const transferHandle = useCallback(
    async (from: string, to: string) => {
      const err = handleError(to);
      if (err) throw new Error(err);
      const h = normalizeHandle(to);
      const current = loadBios().find((p) => p.handle === from);
      if (!current) throw new Error("No profile");
      const taken = loadBios().some((p) => p.handle === h && p.id !== current.id);
      if (taken) throw new Error("Taken");
      if (getCachedListings().some((row) => row.handle === h && row.id !== current.listingId)) throw new Error("Taken");
      const next = { ...current, handle: h };
      persistBios([next, ...loadBios().filter((p) => p.handle !== from && p.handle !== h)]);
      syncBioToListing(next);
      refresh();
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        try {
          await transferHandleRemote({ from, to: h });
        } catch {
          /* local already moved */
        }
      }
      return h;
    },
    [refresh],
  );

  const value = useMemo<BioValue>(
    () => ({
      profiles,
      mine,
      business,
      byHandle,
      tapsToday,
      recordTap,
      handleFree,
      createProfile,
      updateProfile,
      setOffer,
      transferHandle,
    }),
    [
      business,
      byHandle,
      createProfile,
      handleFree,
      mine,
      profiles,
      recordTap,
      setOffer,
      tapsToday,
      transferHandle,
      updateProfile,
    ],
  );

  return <BioContext.Provider value={value}>{children}</BioContext.Provider>;
}

export function useBio() {
  const ctx = useContext(BioContext);
  if (!ctx) throw new Error("useBio");
  return ctx;
}
