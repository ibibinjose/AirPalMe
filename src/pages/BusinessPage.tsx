import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BUSINESS_CATEGORIES, listingToPlace, type BusinessCategoryId } from "@shared/business";
import { Button } from "@/components/ui/Button";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { Photo } from "@/components/ui/Photo";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { useBio } from "@/contexts/BioContext";
import { withWalk } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneField } from "@/components/forms/PhoneField";
import { addressOk, countryByCode, emptyAddress, formatAddress, formatGps, isValidPhone, type AddressParts } from "@shared/geo-address";
import { locateBusiness } from "@/lib/locate";
import { ImageField } from "@/components/media/ImageField";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { BusinessBookingsSection } from "@/components/booking/BusinessBookingsSection";
import { BusinessNavHub } from "@/components/business/BusinessNavHub";

export function BusinessPage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { mine, savePlace, saveDeal, confirmHours } = useListings();
  const { mine: bio } = useBio();
  const [tab, setTab] = useState<"place" | "offer" | "bookings" | "list">("place");
  const [name, setName] = useState("");
  const [address, setAddress] = useState<AddressParts>(emptyAddress("AU"));
  const [hours, setHours] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [phone, setPhone] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<BusinessCategoryId>("eat");
  const [badge, setBadge] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState("");

  useEffect(() => {
    if (!mine) return;
    setName(mine.name);
    const lines = (mine.address || "").split("\n");
    setAddress({
      ...emptyAddress("AU"),
      line1: lines[0] || mine.address || "",
      city: lines[1]?.split(" ")[0] || "",
    });
    setHours(mine.hours);
    setShortWhy(mine.shortWhy);
    setPhone(mine.phone || "");
    setGeo(mine.geo);
    setCategory(mine.category);
    setBadge(mine.deal?.badge || "");
    setDetail(mine.deal?.detail || "");
    setHero(mine.heroImage || "");
  }, [mine]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (!user) {
    return (
      <AuthGate
        next="/business"
        kicker="Local Business"
        title="List your business"
        lede="Sign in or create an account first. Then you can claim your verified @handle, publish local deals, and connect with neighbourhood visitors."
      />
    );
  }

  if (!mine) {
    return (
      <div className="grid min-h-[40vh] place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl">No listing yet</p>
          <Button className="mt-4" onClick={() => nav("/join")}>
            List
          </Button>
        </div>
      </div>
    );
  }

  async function onPlace(e: FormEvent) {
    e.preventDefault();
    if (!addressOk(address) || (phone && !isValidPhone(phone))) {
      toast.error("Check address and phone");
      return;
    }
    setBusy(true);
    try {
      await savePlace({ name, category, address: formatAddress(address), hours, shortWhy, phone, geo, handle: mine!.handle, heroImage: hero });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeal(e: FormEvent) {
    e.preventDefault();
    if (!badge.trim() || !detail.trim()) {
      toast.error("Badge and detail");
      return;
    }
    setBusy(true);
    try {
      await saveDeal(mine!.id, { badge: badge.trim(), detail: detail.trim(), claimHint: "Show AirPal" });
      toast.success("Offer live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const [stats, setStats] = useState<{ campaigns: number; rsvps: number }>({ campaigns: 0, rsvps: 0 });

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) return;
    void (async () => {
      try {
        const csnap = await getDocs(query(collection(db, "campaigns"), where("ownerUid", "==", user.uid)));
        let rsvps = 0;
        for (const c of csnap.docs) {
          try {
            const rsnap = await getDocs(query(collection(db, "campaign_rsvps"), where("campaignId", "==", c.id)));
            for (const r of rsnap.docs) rsvps += Number((r.data() as { seats?: number }).seats || 1);
          } catch {
            // roster reads need campaign ownership; skip silently.
          }
        }
        setStats({ campaigns: csnap.size, rsvps });
      } catch {
        setStats({ campaigns: 0, rsvps: 0 });
      }
    })();
  }, [user]);

  const handle = mine.handle || bio?.handle;
  const preview = withWalk(listingToPlace({ ...mine, name, category, placeCategory: mine.placeCategory, address: formatAddress(address), hours, shortWhy, deal: badge ? { badge, detail } : mine.deal, handle, heroImage: mine.heroImage, geo: geo || mine.geo, phone }));

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <div className="relative -mx-4 overflow-hidden">
        <Photo src={hero || mine.heroImage || "/media/harbour.jpg"} className="h-40 w-full object-cover" />
        <div className="hero-scrim absolute inset-0" />
        <p className="absolute left-4 top-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">Your place</p>
        <BioHandleButton handle={handle} className="absolute bottom-3 right-4 z-10" />
      </div>
      <h1 className="font-display mt-4 text-3xl font-semibold">{mine.name}</h1>
      
      <div className="mt-4">
        <BusinessNavHub
          activeTab={tab}
          onTabChange={setTab}
          listingActive={mine.status === "active"}
          dealLive={Boolean(mine.deal)}
          campaignCount={stats.campaigns}
          bookingCount={stats.rsvps}
          businessName={mine.name}
        />
      </div>

      {tab === "place" && (
        <form className="mt-5 space-y-3" onSubmit={onPlace}>
          <ImageField
            kind="hero"
            folder="listings"
            value={hero}
            onChange={(src) => {
              setHero(src || "");
              void savePlace({
                name,
                category,
                address: formatAddress(address),
                hours,
                shortWhy,
                phone,
                geo,
                handle: mine.handle,
                heroImage: src || "",
              });
            }}
          />
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInput} />
          <div className="flex flex-wrap gap-2">
            {BUSINESS_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn("h-9 rounded-full px-3 text-sm", category === c.id ? "bg-brand text-white" : "bg-white ring-1 ring-line")}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={locating}
            onClick={() => {
              setLocating(true);
              void locateBusiness()
                .then((found) => {
                  setGeo(found.geo);
                  if (found.fields) {
                    const code = found.fields.countryCode || address.countryCode;
                    setAddress((a) => ({
                      ...a,
                      countryCode: code || a.countryCode,
                      line1: found.fields?.address || a.line1,
                      city: found.fields?.city || a.city,
                      region: found.fields?.state || a.region,
                    }));
                    const dial = countryByCode(code)?.dial;
                    if (dial && !isValidPhone(phone)) setPhone(dial + " ");
                    toast.success(formatGps(found.geo.lat, found.geo.lng));
                  } else toast.success(formatGps(found.geo.lat, found.geo.lng));
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : "Location failed"))
                .finally(() => setLocating(false));
            }}
          >
            {locating ? "Locating…" : geo ? `Pinned ${formatGps(geo.lat, geo.lng)} · update` : "Use current location"}
          </Button>
          <AddressFields value={address} onChange={setAddress} />
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" className={fieldInput} />
          <HostFreshnessBanner
            kind="hours"
            at={mine.hoursVerifiedAt || mine.updatedAt}
            onConfirm={async () => {
              await confirmHours();
              toast.success("Hours confirmed");
            }}
          />
          <input value={shortWhy} onChange={(e) => setShortWhy(e.target.value)} className={fieldInput} />
          <PhoneField value={phone} onChange={setPhone} />
          <Button type="submit" className="w-full" disabled={busy} loading={busy}>
            Save
          </Button>
        </form>
      )}

      {tab === "bookings" && <BusinessBookingsSection />}

      {tab === "list" && (
        <GuestListPanel clubId={handle || mine.id} clubName={mine.name} />
      )}

      {tab === "offer" && (
        <form className="mt-5 space-y-3" onSubmit={onDeal}>
          <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="15% off" className={fieldInput} />
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Show this stay at the till."
            className={fieldTextarea}
          />
          <Button type="submit" className="w-full" disabled={busy} loading={busy}>
            Publish
          </Button>
        </form>
      )}

      <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Around you</p>
      <div className="mt-3 max-w-xs">
        <PlaceCard place={preview} walk={preview.walk} />
      </div>
      <button type="button" className="mt-4 block text-sm text-brand" onClick={() => nav("/bio/edit")}>
        Your @handle
      </button>
      <button type="button" className="mt-2 block text-sm text-brand" onClick={() => nav("/business/campaigns")}>
        Experience campaigns
      </button>
      <button type="button" className="mt-2 text-sm text-brand" onClick={() => nav("/?chip=deals")}>
        Open What’s around
      </button>
    </div>
  );
}
