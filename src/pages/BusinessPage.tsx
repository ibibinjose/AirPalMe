import { useEffect, useState, type FormEvent } from "react";
import { useLocation, Link } from "wouter";
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
import { hrefForPlace } from "@/lib/bio-handle";
import { partnerAccountPath } from "@/lib/partner-account";
import { cn } from "@/lib/cn";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneField } from "@/components/forms/PhoneField";
import { TradingHoursField } from "@/components/forms/TradingHoursField";
import {
  addressOk,
  countryByCode,
  emptyAddress,
  formatAddress,
  formatGps,
  isValidPhone,
  type AddressParts,
} from "@shared/geo-address";
import { locateBusiness } from "@/lib/locate";
import { ImageField } from "@/components/media/ImageField";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { BusinessBookingsSection } from "@/components/booking/BusinessBookingsSection";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
import { BusinessNavHub } from "@/components/business/BusinessNavHub";
import { BusinessSubscriptionCard } from "@/components/business/BusinessSubscriptionCard";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { NAMES } from "@shared/names";
import { WaveHostCard } from "@/components/wave/WaveHostCard";
import { triggerHapticSelection } from "@/lib/native";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Compass,
  ExternalLink,
  Eye,
  Gift,
  Globe2,
  Headphones,
  MapPin,
  Percent,
  Plus,
  QrCode,
  Save,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

const DEAL_PRESETS = [
  { badge: "10% OFF", detail: "10% discount on entire bill for AirPal guests. Show app at till." },
  { badge: "15% OFF", detail: "15% off food and beverages when booking through AirPal." },
  { badge: "2-for-1 Deal", detail: "Buy one main course or entry pass and get the second free." },
  { badge: "Free Drink", detail: "Complimentary house beverage or barista coffee with any meal purchase." },
];

export function BusinessPage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { mine, myListings, setSelectedListingId, savePlace, saveDeal, confirmHours, deleteListing } =
    useListings();
  const { mine: bio, business, updateProfile } = useBio();
  const [tab, setTab] = useState<"place" | "offer" | "bookings" | "list">("place");
  const [name, setName] = useState("");
  const [address, setAddress] = useState<AddressParts>(emptyAddress("AU"));
  const [hours, setHours] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<BusinessCategoryId>("eat");
  const [badge, setBadge] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setDescription(mine.description || "");
    setPhone(mine.phone || "");
    setGeo(mine.geo);
    setCategory(mine.category);
    setBadge(mine.deal?.badge || "");
    setDetail(mine.deal?.detail || "");
    setHero(mine.heroImage || "");
  }, [mine]);

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

  if (!authReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-mute font-medium">Loading partner dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        next="/business"
        kicker="Local Business Partner"
        title="AirPal Business Studio"
        lede="Sign in or create a partner account. Claim your verified business @handle, publish neighbourhood offers, host group experiences, and accept bookings."
      />
    );
  }

  if (!mine) {
    return (
      <div className="mx-auto min-h-[60vh] max-w-2xl px-4 py-12">
        <div className="rounded-[32px] bg-card p-6 sm:p-10 text-center ring-1 ring-line shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <Building2 className="h-8 w-8" />
          </div>
          <span className="inline-block mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
            {NAMES.partnerAccount}
          </span>
          <h1 className="font-display mt-2 text-2xl sm:text-3xl font-bold text-ink">Launch Your Business on AirPal</h1>
          <p className="mt-2 text-sm text-mute max-w-md mx-auto leading-relaxed">
            One account for your entire hospitality or lifestyle brand. Import directly from Google Places, publish local deals, host exclusive experiences, and manage guest reservations.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line/60">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-xs font-bold text-brand">1</span>
              <h3 className="font-semibold text-xs text-ink mt-2.5">Import Place</h3>
              <p className="text-[11px] text-mute mt-1">Pull hours, photos, and address in one click.</p>
            </div>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line/60">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-600">2</span>
              <h3 className="font-semibold text-xs text-ink mt-2.5">Publish Offers</h3>
              <p className="text-[11px] text-mute mt-1">Drive instant foot traffic with neighbourhood perks.</p>
            </div>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-line/60">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-xs font-bold text-purple-600">3</span>
              <h3 className="font-semibold text-xs text-ink mt-2.5">Direct Payouts</h3>
              <p className="text-[11px] text-mute mt-1">Automatic Stripe transfers directly to your bank.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto gap-2" onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: false }))}>
              <Sparkles className="h-4 w-4" />
              Open a Partner Account
            </Button>
            <Button variant="outlined" size="lg" className="w-full sm:w-auto" onClick={() => nav("/bio/setup?kind=business")}>
              Claim Business @handle
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function onPlace(e: FormEvent) {
    e.preventDefault();
    if (!addressOk(address) || (phone && !isValidPhone(phone))) {
      toast.error("Please verify the street address and contact phone number");
      return;
    }
    setBusy(true);
    try {
      await savePlace({
        name,
        category,
        address: formatAddress(address),
        hours,
        shortWhy,
        description,
        phone,
        geo,
        handle: mine!.handle,
        heroImage: hero,
      });
      if (bio?.handle && (bio.aboutText !== description || bio.shortWhy !== shortWhy || bio.name !== name)) {
        await updateProfile({
          handle: bio.handle,
          name,
          shortWhy,
          aboutText: description,
          hours,
          phone,
          geo,
        });
      }
      toast.success("Venue profile saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save place");
    } finally {
      setBusy(false);
    }
  }

  async function onDeal(e: FormEvent) {
    e.preventDefault();
    if (!badge.trim() || !detail.trim()) {
      toast.error("Please fill in both the offer badge and deal details");
      return;
    }
    setBusy(true);
    try {
      await saveDeal(mine!.id, { badge: badge.trim(), detail: detail.trim(), claimHint: "Show AirPal" });
      toast.success("Exclusive deal published to What's On & Explore");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish deal");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteVenue() {
    if (!mine) return;
    setDeleting(true);
    try {
      await deleteListing(mine.id);
      toast.success(`Removed venue "${mine.name}" from your partner account`);
      setShowDeleteModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove venue");
    } finally {
      setDeleting(false);
    }
  }

  const handle = mine.handle || bio?.handle;
  const preview = withWalk(
    listingToPlace({
      ...mine,
      name,
      category,
      placeCategory: mine.placeCategory,
      address: formatAddress(address),
      hours,
      shortWhy,
      description,
      deal: badge ? { badge, detail } : mine.deal,
      handle,
      heroImage: hero || mine.heroImage,
      geo: geo || mine.geo,
      phone,
    }),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))]">
      {/* Top Venue Switcher & Multi-Location Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-mute">Active Venue:</span>
          {myListings.length > 1 ? (
            <div className="relative">
              <select
                value={mine.id}
                onChange={(e) => setSelectedListingId(e.target.value)}
                aria-label="Select active venue"
                className="rounded-xl bg-paper py-1.5 pl-3 pr-8 text-xs font-bold text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.address.split(",")[0] || "Sydney"})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="font-bold text-xs text-ink">{mine.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/business/onboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-brand" />
            <span>Add Venue</span>
          </Link>
          <Link
            href="/business/promotions/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-brand" />
            <span>Create offer</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            title="Remove / Unlink this venue"
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remove Venue</span>
          </button>
        </div>
      </div>

      {/* Top Header Card with Cover & Fast Action Hub */}
      <header className="overflow-hidden rounded-[32px] bg-card ring-1 ring-line shadow-xs">
        <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-zinc-900">
          <Photo src={hero || mine.heroImage || "/media/harbour.jpg"} className="h-full w-full object-cover opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          <div className="absolute left-5 top-5 flex items-center gap-2">
            <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20">
              {NAMES.yourPlace} · Partner Hub
            </span>
            <span className="rounded-full bg-emerald-500/80 px-2.5 py-0.5 text-[11px] font-bold uppercase text-white backdrop-blur-md">
              {mine.status === "active" ? "Live on Map" : "Draft"}
            </span>
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">{mine.name}</h1>
              <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-brand" />
                {address.city || "Sydney"}, Australia · Category: <span className="capitalize font-semibold">{category}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BioHandleButton handle={handle} className="shadow-md" />
              <button
                type="button"
                onClick={() => nav(hrefForPlace(listingToPlace(mine)))}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink backdrop-blur-md hover:bg-white transition shadow-sm"
              >
                <Eye className="h-3.5 w-3.5 text-brand" />
                Guest View
              </button>
            </div>
          </div>
        </div>

        {/* Global Business Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-paper/50 px-5 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href="/helpdesk" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
              <Headphones className="h-3.5 w-3.5" />
              <span>Universal Help Desk</span>
            </Link>
            <Link href="/pulse" className="inline-flex items-center gap-1.5 font-semibold text-ink/80 hover:text-brand hover:underline">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              <span>Guest Pulse & Standees</span>
            </Link>
            <Link href="/business/promotions" className="inline-flex items-center gap-1.5 font-semibold text-ink/80 hover:text-brand hover:underline">
              <Gift className="h-3.5 w-3.5 text-amber-500" />
              <span>Promotions & Giveaways</span>
            </Link>
          </div>
          <Link href="/bio/edit" className="inline-flex items-center gap-1 font-semibold text-mute hover:text-ink">
            <span>Edit Link-in-Bio</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main 12-Column Responsive Cockpit */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Primary Management Subsystems (7-8 cols on desktop) */}
        <main className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Wave NFC Check-in & Host Station */}
          <div className="rounded-[28px] bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs">
            <WaveHostCard placeName={mine.name} placeId={mine.placeId} listingId={mine.id} handle={handle} />
          </div>

          {/* Navigation Hub & Tab Selector */}
          <BusinessNavHub
            activeTab={tab}
            onTabChange={setTab}
            listingActive={mine.status === "active"}
            dealLive={Boolean(mine.deal)}
            campaignCount={stats.campaigns}
            bookingCount={stats.rsvps}
            businessName={mine.name}
          />

          {/* TAB 1: VENUE PROFILE & DETAILS */}
          {tab === "place" && (
            <div className="space-y-6">
              {/* Google Place Quick Sync Card */}
              <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">Google Place Sync</h2>
                    <p className="text-xs text-mute">Instantly import hours, GPS coordinates, photos, and address</p>
                  </div>
                  <Globe2 className="h-4 w-4 text-brand" />
                </div>
                <GooglePlaceImportCard
                  importedPlaceId={mine.mapsPlaceId}
                  onImport={(place) => {
                    setName(place.name);
                    setHours(place.hours || hours);
                    setShortWhy(place.shortWhy || shortWhy);
                    setPhone(place.phone || phone);
                    setCategory(place.category);
                    if (place.geo) setGeo(place.geo);
                    if (place.photoNames[0]) setHero(place.photoNames[0]);
                    const parts = place.address.split(",").map((p) => p.trim());
                    setAddress({
                      ...emptyAddress("AU"),
                      line1: parts[0] || place.address,
                      city: place.city || parts[1] || "",
                    });
                    void savePlace({
                      name: place.name,
                      category: place.category,
                      address: place.address,
                      hours: place.hours || hours,
                      shortWhy: place.shortWhy || shortWhy,
                      description,
                      phone: place.phone || phone,
                      geo: place.geo,
                      handle: mine.handle,
                      heroImage: place.photoNames[0] || hero,
                      mapsPlaceId: place.placeId,
                      website: place.website,
                    }).then(() => toast.success("Imported and saved from Google Places"));
                    if (bio?.handle) {
                      void updateProfile({
                        handle: bio.handle,
                        name: place.name,
                        shortWhy: place.shortWhy || bio.shortWhy,
                        aboutText: description || bio.aboutText,
                        hours: place.hours || bio.hours,
                        phone: place.phone || bio.phone,
                        city: place.city || bio.city,
                        avatar: place.photoNames[1] || place.photoNames[0] || bio.avatar,
                        cover: place.photoNames[0] || bio.cover,
                        mapsPlaceId: place.placeId,
                        links: mergeBioLinks(bio.links, bioLinksFromGooglePlace(place)),
                      });
                    }
                  }}
                />
              </section>

              {/* Venue Form */}
              <form className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs space-y-5" onSubmit={onPlace}>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Venue Details & Media</h2>
                  <p className="text-xs text-mute">Showcase your property to neighbourhood visitors and locals</p>
                </div>

                {/* Hero Image */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                    Hero Cover Photo
                  </label>
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
                        description,
                        phone,
                        geo,
                        handle: mine.handle,
                        heroImage: src || "",
                      });
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Business / Venue Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. The Rocks Cafe"
                    className={fieldInput}
                    required
                  />
                </div>

                {/* Category Pills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                    Primary Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (category !== c.id) void triggerHapticSelection();
                          setCategory(c.id);
                        }}
                        className={cn(
                          "min-h-[44px] rounded-2xl px-3.5 text-xs font-semibold transition active:scale-95 shadow-2xs cursor-pointer",
                          category === c.id
                            ? "bg-brand text-white shadow-sm ring-2 ring-brand/30"
                            : "bg-paper text-ink ring-1 ring-line hover:bg-card",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location & GPS */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                        Physical Location & GPS
                      </label>
                      <p className="text-[11px] text-mute">Used for neighborhood search and walking distances</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outlined"
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
                              toast.success(`Pinned GPS: ${formatGps(found.geo.lat, found.geo.lng)}`);
                            } else toast.success(`Pinned GPS: ${formatGps(found.geo.lat, found.geo.lng)}`);
                          })
                          .catch((err) => toast.error(err instanceof Error ? err.message : "Location pin failed"))
                          .finally(() => setLocating(false));
                      }}
                      className="gap-1.5"
                    >
                      <MapPin className="h-3.5 w-3.5 text-brand" />
                      {locating ? "Locating…" : geo ? `GPS Pinned (${formatGps(geo.lat, geo.lng)})` : "Use My Location"}
                    </Button>
                  </div>
                  <AddressFields value={address} onChange={setAddress} />
                </div>

                {/* Hours & Freshness */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                    Trading Hours & Freshness
                  </label>
                  <TradingHoursField value={hours} onChange={setHours} inputClassName={fieldInput} />
                  <HostFreshnessBanner
                    kind="hours"
                    at={mine.hoursVerifiedAt || mine.updatedAt}
                    onConfirm={async () => {
                      await confirmHours();
                      toast.success("Hours marked verified and fresh for this week");
                    }}
                  />
                </div>

                {/* Pitch, Description & Phone */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                      Short Tagline / Why Visit
                    </label>
                    <input
                      value={shortWhy}
                      onChange={(e) => setShortWhy(e.target.value)}
                      placeholder="e.g. Award-winning waterfront dining in Circular Quay"
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                        Business Description / About Venue
                      </label>
                      <span className="text-[10px] text-mute">{description.length}/500</span>
                    </div>
                    <textarea
                      value={description}
                      maxLength={500}
                      rows={3}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell visitors about your venue's story, specialty dishes, ambiance, or services…"
                      className={fieldTextarea}
                    />
                    <p className="text-[11px] text-mute mt-1">
                      Detailed overview displayed on your public place page and digital bio profile.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                      Direct Inquiries Phone
                    </label>
                    <PhoneField value={phone} onChange={setPhone} />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 mt-4" disabled={busy} loading={busy}>
                  <Save className="h-4 w-4" />
                  Save Venue Changes
                </Button>
              </form>
            </div>
          )}

          {/* TAB 2: BOOKINGS & PAYOUTS */}
          {tab === "bookings" && (
            <div className="space-y-6">
              <PayoutSetupCard />
              <BusinessBookingsSection />
            </div>
          )}

          {/* TAB 3: DOOR & GUEST LIST */}
          {tab === "list" && (
            <div className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
              <GuestListPanel clubId={handle || mine.id} clubName={mine.name} />
            </div>
          )}

          {/* TAB 4: OFFERS & EXCLUSIVE DEALS */}
          {tab === "offer" && (
            <div className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-ink">Publish Neighbourhood Offer</h2>
                  <Tag className="h-4 w-4 text-brand" />
                </div>
                <p className="text-xs text-mute mt-0.5">
                  Exclusive perks appear prominently on the Explore map, What&apos;s On, and your verified page.
                </p>
              </div>

              {/* Preset Deal Templates */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                  Quick Preset Templates
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEAL_PRESETS.map((p) => (
                    <button
                      key={p.badge}
                      type="button"
                      onClick={() => {
                        setBadge(p.badge);
                        setDetail(p.detail);
                      }}
                      className="flex flex-col items-start rounded-2xl bg-paper p-3 text-left ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
                    >
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                        <Percent className="h-3 w-3" />
                        {p.badge}
                      </span>
                      <p className="text-[11px] text-mute mt-1.5 line-clamp-2">{p.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              <form className="space-y-4 border-t border-line/60 pt-4" onSubmit={onDeal}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Offer Badge / Headline
                  </label>
                  <input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. 15% OFF or Free Barista Coffee"
                    className={fieldInput}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Conditions & Redemption Details
                  </label>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="e.g. Show active AirPal screen at till. Valid Monday to Friday before 5pm."
                    rows={3}
                    className={fieldTextarea}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full gap-2" disabled={busy} loading={busy}>
                  <Tag className="h-4 w-4" />
                  Publish Live Offer
                </Button>
              </form>
            </div>
          )}
        </main>

        {/* Right Column: Live Guest Preview, Visibility Score & Subscription (4-5 cols on desktop) */}
        <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
          {/* Live Guest Preview Card */}
          <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Live Guest View</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Live on What&apos;s on
              </span>
            </div>
            <p className="text-xs text-mute mb-3">
              This is how your place card renders on guest discovery screens and nearby searches:
            </p>
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl ring-1 ring-line shadow-2xs">
              <PlaceCard place={preview} walk={preview.walk} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
              <span className="text-mute font-medium">Public URL:</span>
              <button
                type="button"
                onClick={() => nav(hrefForPlace(listingToPlace(mine)))}
                className="font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                Open Place Page <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </section>

          {/* Partner Visibility Checklist */}
          {!(business?.products?.length || business?.services?.length || business?.deals?.length) && (
            <section className="rounded-[28px] bg-card p-5 ring-1 ring-brand/20 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-ink">Boost Your Visibility</h3>
              </div>
              <p className="text-xs text-mute mt-1.5 leading-relaxed">
                Venues with products, bookable services, and active deals receive 3x more guest impressions.
              </p>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => nav("/business/setup")}
                className="mt-3.5 w-full justify-between"
              >
                <span>Complete 3-Step Setup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </section>
          )}

          {/* Subscription & Partner Tier */}
          <BusinessSubscriptionCard />

          {/* Quick Operations Links */}
          <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-xs space-y-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mute">Operations Hub</h3>
            <Link
              href="/helpdesk"
              className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-brand" />
                Universal Help Desk
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/pulse"
              className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-indigo-500" />
                Pulse Standee Kiosk
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/business/promotions"
              className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-purple-500" />
                Promotions & Offers
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/event/new"
              className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                Host an Event
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/host"
              className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Stay Workspace
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
          </section>
        </aside>
      </div>

      {/* Delete / Unlink Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-line shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-display mt-4 text-xl font-bold text-ink">Remove &ldquo;{mine.name}&rdquo;?</h3>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              This will unbind and remove this venue profile from your active partner account. If you imported or tested Shangri-La Sydney or another location by mistake, removing it lets you start fresh or register your own venue.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" disabled={deleting} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="outlined"
                disabled={deleting}
                loading={deleting}
                onClick={handleDeleteVenue}
                className="border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Confirm Removal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
