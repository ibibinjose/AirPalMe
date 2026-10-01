import { useEffect, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { useSearch } from "wouter";
import { collection, getDocs } from "firebase/firestore";
import { useStay } from "@/contexts/StayContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { getFirebaseDb } from "@/lib/firebase";
import { noteQrContext } from "@/lib/analytics";
import { fetchPropertyByHandle, normalizeProperty, pickDemoProperty, saveCachedProperty } from "@/lib/properties";
import { DEMO_HOTEL_PROPERTY_ID, DEMO_HOTEL_ROOM_TOKEN, harbourStaySeeds } from "@/lib/seed-stay";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { ConciergePage } from "./ConciergePage";

type DemoSource = { kind: "live"; name: string; pinned: boolean } | { kind: "seed"; name: string };

/**
 * Shareable showcase at /DemoHotel — the same post-scan Stay & Guide UI a
 * guest sees after a real room QR scan. Resolves a real listing first: an
 * explicit `?p=<id|@handle>` preview link wins, else the first live listable
 * stay in the guest's city, else the Harbour simulation when no live supply
 * exists. The URL stays /DemoHotel so demos can share that link (no redirect).
 */
export function DemoHotelPage() {
  const { setSession } = useStay();
  const { city } = useLocalNow();
  const pinnedKey = new URLSearchParams(useSearch()).get("p") || "";
  const [source, setSource] = useState<DemoSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

    const seedFallback = () => {
      if (cancelled) return;
      const seed = harbourStaySeeds()[0];
      if (seed?.property) saveCachedProperty(seed.property);
      setSession({
        kind: "stay",
        propertyId: DEMO_HOTEL_PROPERTY_ID,
        roomToken: DEMO_HOTEL_ROOM_TOKEN,
      });
      noteQrContext(`stay:${DEMO_HOTEL_PROPERTY_ID}`, {
        propertyId: DEMO_HOTEL_PROPERTY_ID,
        source: "demo-hotel",
      });
      setSource({ kind: "seed", name: seed?.property.name || "Harbour Hotel" });
    };

    const useLive = (propertyId: string, name: string, pinned: boolean) => {
      if (cancelled) return;
      // Property-level scan: no room token is ever invented for a live listing.
      setSession({ kind: "stay", propertyId });
      noteQrContext(`stay:${propertyId}`, {
        propertyId,
        source: pinned ? "demo-hotel-pinned" : "demo-hotel-live",
      });
      setSource({ kind: "live", name, pinned });
    };

    const resolve = async () => {
      if (pinnedKey) {
        try {
          const found = await fetchPropertyByHandle(pinnedKey);
          if (!cancelled && found.id !== "unknown" && found.name) {
            saveCachedProperty(found);
            useLive(found.id, found.name, true);
            return;
          }
        } catch {
          /* fall through to live list, then seed */
        }
      }
      const db = getFirebaseDb();
      if (!db) {
        seedFallback();
        return;
      }
      try {
        const snap = await getDocs(collection(db, "properties"));
        if (cancelled) return;
        const rows = snap.docs.map((d) => normalizeProperty(d.id, d.data() as Record<string, unknown>));
        const pick = pickDemoProperty(rows, effectiveCity);
        if (pick) {
          saveCachedProperty(pick);
          useLive(pick.id, pick.name, false);
        } else {
          seedFallback();
        }
      } catch {
        seedFallback();
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
    // setSession is stable; re-resolve only when the city or pin changes.
  }, [city, pinnedKey, setSession]);

  if (!source) {
    return (
      <>
        <DemoBanner />
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 pb-16 pt-16 text-center">
          <Loader2 size={28} className="animate-spin text-brand" />
          <p className="text-sm font-semibold text-ink">Preparing your scanned stay…</p>
          <p className="text-xs text-mute">Loading the live listing, as a guest scan would.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DemoBanner />
      <div className="mx-auto max-w-lg px-4 pt-3 md:px-0">
        <p className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-xs text-mute ring-1 ring-line">
          <ScanLine size={14} className="shrink-0 text-brand" />
          {source.kind === "live" ? (
            <span>
              Simulated AirPal scan · Live listing: <strong className="text-ink">{source.name}</strong>
              {source.pinned ? " (preview link)" : ""}
            </span>
          ) : (
            <span>
              Simulated AirPal scan · <strong className="text-ink">{source.name}</strong> demo stay — no live stays
              listed here yet
            </span>
          )}
        </p>
      </div>
      <ConciergePage />
    </>
  );
}
