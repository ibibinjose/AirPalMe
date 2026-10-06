import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Globe2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { claimFreeVenuePresenceRemote, submitPartnerClaimRemote, upsertBusinessListingRemote } from "@/lib/functions";
import { cn } from "@/lib/cn";
import { createSubmitGuard } from "@/lib/submit-guard";
import {
  BUSINESS_PLANS,
  ONBOARD_STEPS,
  applyGooglePlace,
  canPublishFeatured,
  emptyDraft,
  googleOwnerVerified,
  nameStepValid,
  ownerStepValid,
  resolvedPlan,
  reviewReady,
  venueStepValid,
  verifyStepValid,
  type OnboardDraft,
  type OnboardStepId,
} from "@shared/business-onboarding";
import { BUSINESS_CATEGORIES, isBusinessCategory, placeCategoryFor } from "@shared/business";
import { DEMO_BUSINESS, DEMO_LISTING_ID, isDemoModeSearch } from "@shared/demo-business";
import { isDemoContent } from "@shared/content-meta";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { NAMES } from "@shared/names";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { useBio } from "@/contexts/BioContext";
import { stashBusinessShowcase } from "@/lib/business-showcase";

interface DirectoryVenue {
  id: string;
  name: string;
  address: string;
}

const inputCls =
  "mt-1.5 w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20 transition";

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-row md:flex-col justify-between md:justify-start gap-2 md:gap-1" aria-label="Onboarding progress">
      {ONBOARD_STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.id} className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3 flex-1">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-2xl text-xs font-bold transition shadow-2xs",
                  done
                    ? "bg-brand text-white shadow-sm"
                    : current
                      ? "bg-brand/15 text-accent ring-2 ring-brand/30"
                      : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < ONBOARD_STEPS.length - 1 && <span className="hidden md:block my-1 h-5 w-px bg-line/80" />}
            </span>
            <div className="text-center md:text-left pb-1 pt-1">
              <span className={cn("block text-xs md:text-sm transition", current ? "font-bold text-ink" : done ? "font-semibold text-ink/70" : "text-mute")}>
                {s.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function BusinessOnboardPage() {
  const [, nav] = useLocation();
  const { user, authReady, requireUser, isAdmin } = useAuth();
  const { setSelectedListingId } = useListings();
  const { business, updateProfile } = useBio();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardDraft>(() => {
    const base = emptyDraft();
    const isFashion = typeof window !== "undefined" && window.location.search.includes("track=fashion");
    return isFashion ? { ...base, category: "shops", venue: { ...base.venue, mode: "unlisted" } } : base;
  });
  const [results, setResults] = useState<DirectoryVenue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const guardRef = useRef(createSubmitGuard());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [changeListing, setChangeListing] = useState(false);
  const demoMode = Boolean(isAdmin) && isDemoModeSearch(useSearch());
  const demoPrefilled = useRef(false);

  useEffect(() => {
    if (!demoMode || demoPrefilled.current) return;
    demoPrefilled.current = true;
    setDraft((d) => ({
      ...d,
      venue: { ...d.venue, mode: "unlisted", venueName: DEMO_BUSINESS.name },
      address: DEMO_BUSINESS.address,
      category: "stay",
      shortWhy: DEMO_BUSINESS.shortWhy,
      hours: DEMO_BUSINESS.hours,
      geo: { ...DEMO_BUSINESS.geo },
      owner: {
        ...d.owner,
        name: user?.displayName || d.owner.name,
        email: user?.email || d.owner.email,
        phone: DEMO_BUSINESS.phone,
      },
    }));
  }, [demoMode, user]);

  const stepId: OnboardStepId = ONBOARD_STEPS[step]!.id;

  async function runLookup(needle: string) {
    const db = getFirebaseDb();
    if (!db || needle.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const q = query(
        collection(db, "partnerVenues"),
        orderBy("name"),
        startAt(needle.trim()),
        endAt(needle.trim() + "\uf8ff"),
        limit(10),
      );
      const snap = await getDocs(q);
      setResults(
        snap.docs
          .filter((d) => !isDemoContent({ demo: d.data()?.demo }))
          .map((d) => ({
            id: d.id,
            name: String(d.data()?.name || d.id),
            address: String(d.data()?.address || ""),
          })),
      );
    } catch {
      setResults([]);
    }
  }

  useEffect(() => {
    if (stepId !== "verify") return;
    const t = setTimeout(() => void runLookup(draft.venue.venueName), 250);
    return () => clearTimeout(t);
  }, [stepId, draft.venue.venueName]);

  useEffect(() => {
    if (!user) return;
    setDraft((d) => ({
      ...d,
      owner: {
        ...d.owner,
        name: d.owner.name || user.displayName || "",
        email: d.owner.email || user.email || "",
        phone: d.owner.phone || user.phone || "",
      },
    }));
  }, [user]);

  const canNext = useMemo(() => {
    if (stepId === "venue") return nameStepValid(draft);
    if (stepId === "verify") return venueStepValid(draft) && verifyStepValid(draft);
    if (stepId === "owner") return ownerStepValid(draft);
    return reviewReady(draft);
  }, [stepId, draft]);

  function set<K extends keyof OnboardDraft>(key: K, value: OnboardDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    setSubmitError(null);
    if (!requireUser("Sign in to onboard your business to AirPal.me.")) return;
    if (!isFirebaseConfigured) {
      setSubmitError("Connect Firebase keys first — claims are filed through the live backend.");
      return;
    }
    if (!guardRef.current.tryAcquire()) return;
    setSubmitting(true);
    const plan = resolvedPlan(draft, user?.email);
    const shortWhy = draft.shortWhy.trim() || `${draft.venue.venueName.trim()} on AirPal.`;
    try {
      let listingId = "";
      let placeId = "";
      if (draft.venue.mode === "listed") {
        await submitPartnerClaimRemote({
          venueId: draft.venue.venueId,
          name: draft.owner.name.trim(),
          email: draft.owner.email.trim(),
          phone: draft.owner.phone.trim(),
          role: draft.owner.role.trim() || "Owner",
          customPerk: draft.owner.customPerk.trim() || undefined,
          abnOrTaxId: draft.owner.abnOrTaxId.trim() || undefined,
          plan,
        });
      } else {
        const res = await claimFreeVenuePresenceRemote({
          venueName: draft.venue.venueName.trim(),
          address: draft.address.trim(),
          category: placeCategoryFor(draft.category),
          shortWhy,
          hours: draft.hours.trim() || undefined,
          phone: draft.owner.phone.trim() || undefined,
          guestPerk: draft.owner.customPerk.trim() || undefined,
          lat: draft.geo?.lat,
          lng: draft.geo?.lng,
          mapsPlaceId: draft.googlePlaceId || undefined,
          website: draft.website || undefined,
          heroImage: draft.heroImage || undefined,
          plan,
          abnOrTaxId: draft.owner.abnOrTaxId.trim() || undefined,
          demo: demoMode,
        });
        placeId = res.placeId;
        try {
          const listing = await upsertBusinessListingRemote({
            listingId: demoMode ? DEMO_LISTING_ID : undefined,
            demo: demoMode,
            name: draft.venue.venueName.trim(),
            category: draft.category,
            address: draft.address.trim(),
            hours: draft.hours.trim() || undefined,
            shortWhy,
            phone: draft.owner.phone.trim() || undefined,
            lat: draft.geo?.lat,
            lng: draft.geo?.lng,
            heroImage: draft.heroImage || undefined,
            mapsPlaceId: draft.googlePlaceId || undefined,
            website: draft.website || undefined,
            plan,
            abnOrTaxId: draft.owner.abnOrTaxId.trim() || undefined,
          });
          listingId = listing.listingId;
          placeId = listing.placeId;
          if (listingId) setSelectedListingId(listingId);
          // Demo runs never touch the admin's real business bio.
          if (business?.handle && !demoMode) {
            const imported = bioLinksFromGooglePlace({
              placeId: draft.googlePlaceId,
              name: draft.venue.venueName,
              address: draft.address,
              city: business.city,
              geo: draft.geo,
              phone: draft.owner.phone,
              website: draft.website,
              googleMapsUri: draft.googleMapsUri,
              hours: draft.hours,
              shortWhy,
              category: isBusinessCategory(draft.category) ? draft.category : "eat",
              photoNames: draft.heroImage ? [draft.heroImage] : [],
              menuUrl: draft.menuUrl,
              socials: [],
            });
            await updateProfile({
              handle: business.handle,
              name: draft.venue.venueName.trim(),
              shortWhy,
              hours: draft.hours,
              phone: draft.owner.phone.trim(),
              avatar: draft.logoUrl || business.avatar,
              cover: draft.heroImage || business.cover,
              mapsPlaceId: draft.googlePlaceId || business.mapsPlaceId,
              listingId: listing.listingId,
              placeId: listing.placeId,
              links: mergeBioLinks(business.links, imported),
            });
          }
        } catch {
          /* marker/claim already filed */
        }
      }
      stashBusinessShowcase({
        listingId: listingId || undefined,
        placeId: placeId || undefined,
        name: draft.venue.venueName.trim(),
        category: draft.category,
        shortWhy,
        hours: draft.hours,
        phone: draft.owner.phone.trim(),
        website: draft.website,
        mapsPlaceId: draft.googlePlaceId,
        heroImage: draft.heroImage,
        logoUrl: draft.logoUrl,
      });
      nav("/business");
      return;
    } catch (e) {
      guardRef.current.release();
      setSubmitError(e instanceof Error ? e.message : "Something went wrong filing your claim.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm text-mute font-medium">Checking authorization…</p>
      </div>
    );
  }

  const domainOk = googleOwnerVerified(draft, user?.email);
  const featuredOk = canPublishFeatured(draft, user?.email);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <Link href="/business" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Business Studio
      </Link>

      <div className="mt-3 rounded-[32px] bg-card p-6 sm:p-8 ring-1 ring-line shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line/60 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{NAMES.partnerAccount}</span>
            <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Register a Business Venue
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-mute">
              Import directly from Google Places, verify your contact details, and go live on AirPal.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Step {step + 1} of 4
          </span>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr] items-start">
          <Stepper step={step} />

          <div className="rounded-3xl bg-paper p-5 sm:p-6 ring-1 ring-line/70">
            {stepId === "venue" && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">What is the venue or business called?</h2>
                  <p className="text-xs text-mute mt-0.5">
                    Search Google Places. Pick your location to auto-populate photos, street address, trading hours, and phone.
                  </p>
                </div>
                <div className="mt-3">
                  <GooglePlaceImportCard
                    variant="field"
                    importedPlaceId={draft.googlePlaceId}
                    initialQuery={draft.venue.venueName}
                    onQueryChange={(q) =>
                      setDraft((d) => ({
                        ...d,
                        venue: { mode: "unlisted", venueId: "", venueName: q },
                        googlePlaceId: d.googlePlaceId && q.trim() === d.venue.venueName.trim() ? d.googlePlaceId : "",
                      }))
                    }
                    onImport={(place) => setDraft((d) => applyGooglePlace(d, place))}
                  />
                </div>
                {(draft.venue.venueName.trim().length >= 2 || draft.googlePlaceId) && (
                  <div className="border-t border-line/60 pt-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                      Primary Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_CATEGORIES.filter(
                        (c) => (c.id !== "parking" && c.id !== "fashion") || c.id === draft.category,
                      ).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => set("category", c.id)}
                          aria-pressed={draft.category === c.id}
                          className={cn(
                            "min-h-[44px] rounded-2xl px-3.5 text-xs font-semibold transition shadow-2xs",
                            draft.category === c.id
                              ? "bg-brand text-white shadow-sm ring-2 ring-brand/30"
                              : "bg-card text-ink ring-1 ring-line hover:bg-paper",
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-mute">
                      {BUSINESS_CATEGORIES.find((c) => c.id === draft.category)?.line}
                    </p>
                  </div>
                )}
              </section>
            )}

            {stepId === "owner" && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Owner & Contact Details</h2>
                  <p className="text-xs text-mute mt-0.5">Primary liaison for reservations, payouts, and partner communications.</p>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-mute">Full Name</span>
                    <input
                      value={draft.owner.name}
                      onChange={(e) => set("owner", { ...draft.owner, name: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Sarah Jenkins"
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-mute">Business Email</span>
                      <input
                        type="email"
                        value={draft.owner.email}
                        onChange={(e) => set("owner", { ...draft.owner, email: e.target.value })}
                        className={inputCls}
                        placeholder="sarah@venue.com.au"
                        required
                      />
                      <span className="mt-1 block text-[11px] text-mute">
                        {user?.email
                          ? `Signed in as ${user.email}.`
                          : "Used for reservation confirmations and alerts."}
                      </span>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-mute">Direct Phone</span>
                      <input
                        type="tel"
                        value={draft.owner.phone}
                        onChange={(e) => set("owner", { ...draft.owner, phone: e.target.value })}
                        className={inputCls}
                        placeholder="0412 345 678"
                        required
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-mute">Role / Title</span>
                      <select
                        value={draft.owner.role}
                        onChange={(e) => set("owner", { ...draft.owner, role: e.target.value })}
                        className={inputCls}
                      >
                        {["Owner", "General Manager", "Head Chef / Host", "Marketing Director", "Staff Lead"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wider text-mute">ABN / Business Tax ID (Optional)</span>
                      <input
                        value={draft.owner.abnOrTaxId}
                        onChange={(e) => set("owner", { ...draft.owner, abnOrTaxId: e.target.value })}
                        className={inputCls}
                        placeholder="51 824 753 556"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wider text-mute">AirPal Welcome Perk (Optional)</span>
                    <input
                      value={draft.owner.customPerk}
                      onChange={(e) => set("owner", { ...draft.owner, customPerk: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Free glass of sparkling wine with any main course"
                    />
                  </label>
                </div>
              </section>
            )}

            {stepId === "verify" && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Verify Location Details</h2>
                  <p className="text-xs text-mute mt-0.5">
                    Confirm street address, website, and operating presence for {draft.venue.venueName || "your business"}.
                  </p>
                </div>
                <div>
                  {draft.googlePlaceId && !changeListing ? (
                    <div className="overflow-hidden rounded-2xl ring-1 ring-line bg-card">
                      {draft.heroImage && <img src={draft.heroImage} alt="" className="h-32 w-full object-cover" />}
                      <div className="p-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                          <Globe2 className="h-3 w-3" /> Imported from Google
                        </span>
                        <p className="font-display mt-2 text-lg font-bold text-ink">{draft.venue.venueName}</p>
                        {draft.address && <p className="mt-0.5 text-xs text-mute">{draft.address}</p>}
                        <button
                          type="button"
                          className="mt-3 text-xs font-semibold text-accent hover:underline"
                          onClick={() => setChangeListing(true)}
                        >
                          Change Google Listing
                        </button>
                      </div>
                    </div>
                  ) : (
                    <GooglePlaceImportCard
                      importedPlaceId={draft.googlePlaceId}
                      initialQuery={draft.venue.venueName}
                      onImport={(place) => {
                        setChangeListing(false);
                        setDraft((d) => applyGooglePlace(d, place));
                      }}
                    />
                  )}
                </div>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-mute">Street Address</span>
                  <input
                    value={draft.address}
                    onChange={(e) => set("address", e.target.value)}
                    className={inputCls}
                    placeholder="18 Lower Fort St, The Rocks NSW 2000"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-mute">Website URL (Optional)</span>
                  <input
                    value={draft.website}
                    onChange={(e) => set("website", e.target.value)}
                    className={inputCls}
                    placeholder="https://venue.com.au"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-mute">Short Description (Optional)</span>
                  <textarea
                    value={draft.shortWhy}
                    onChange={(e) => set("shortWhy", e.target.value)}
                    rows={2}
                    className={inputCls}
                    placeholder="What makes your venue special for guests?"
                  />
                </label>

                {results.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-mute">Matching Directory Venues</p>
                    <ul className="mt-1.5 divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-card">
                      {results.map((v) => (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => set("venue", { mode: "listed", venueId: v.id, venueName: v.name })}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs transition",
                              draft.venue.venueId === v.id ? "bg-brand/10 text-accent font-semibold" : "hover:bg-paper",
                            )}
                          >
                            <Store className="h-4 w-4 shrink-0 text-accent" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-ink">{v.name}</span>
                              {v.address && <span className="block truncate text-[11px] text-mute">{v.address}</span>}
                            </span>
                            {draft.venue.venueId === v.id && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2 border-t border-line/60 pt-4">
                  {(
                    [
                      ["googleListingConfirmed", "I manage this venue listing and authorize publication on AirPal"],
                      ["authorityConfirmed", "This is my legitimate business and trading hours are accurate"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-xs sm:text-sm transition",
                        draft.verify[key] ? "border-brand bg-brand/5 ring-1 ring-brand/20" : "border-line bg-card",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={draft.verify[key]}
                        onChange={(e) => set("verify", { ...draft.verify, [key]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded accent-[#1805db]"
                      />
                      <span className={draft.verify[key] ? "font-semibold text-ink" : "text-mute"}>{label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {stepId === "review" && (
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Review & Go Live</h2>
                  <p className="text-xs text-mute mt-0.5">
                    Your venue will be published instantly on the Explore discovery map and What&apos;s On.
                  </p>
                </div>
                <dl className="space-y-2 rounded-2xl bg-card p-4 text-xs sm:text-sm ring-1 ring-line">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Venue Name</dt>
                    <dd className="text-right font-semibold text-ink">{draft.venue.venueName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Category</dt>
                    <dd className="text-right font-semibold text-ink capitalize">{draft.category}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Primary Contact</dt>
                    <dd className="text-right font-semibold text-ink">
                      {draft.owner.name} ({draft.owner.role})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Contact Phone</dt>
                    <dd className="text-right font-semibold text-ink">{draft.owner.phone}</dd>
                  </div>
                  {draft.address && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-mute">Address</dt>
                      <dd className="text-right font-semibold text-ink">{draft.address}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-line/60 pt-2">
                    <dt className="text-mute flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Verification Status
                    </dt>
                    <dd className="text-right font-semibold text-ink">
                      {domainOk ? "Email matches Google domain" : "Directory Owner Claim"}
                    </dd>
                  </div>
                </dl>

                {/* Plan Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                    Select Partner Tier
                  </label>
                  <div className="grid gap-2">
                    {BUSINESS_PLANS.map((p) => {
                      const locked = p.id !== "presence" && !featuredOk;
                      const selected = draft.plan === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={locked}
                          onClick={() => set("plan", p.id)}
                          className={cn(
                            "rounded-2xl border p-3.5 text-left transition shadow-2xs",
                            selected ? "border-brand bg-brand/5 ring-1 ring-brand/30" : "border-line bg-card hover:bg-paper",
                            locked && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-bold text-xs text-ink">{p.name}</span>
                            <span className="text-[11px] font-mono text-mute">{p.price}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-mute">
                            {locked ? "Requires matching domain or verified ABN." : p.blurb}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-mute border-t border-line/60 pt-3">
                  <input
                    type="checkbox"
                    checked={draft.acceptedTerms}
                    onChange={(e) => set("acceptedTerms", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#1805db]"
                  />
                  <span>
                    I accept the AirPal Partner Terms and confirm this business listing is accurate and authorized.
                  </span>
                </label>

                {submitError && (
                  <p className="rounded-2xl bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                    {submitError}
                  </p>
                )}
              </section>
            )}

            {/* Stepper Controls */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
              <Button variant="ghost" size="sm" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
              {step < ONBOARD_STEPS.length - 1 ? (
                <Button size="sm" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="gap-1.5">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" disabled={!canNext || submitting} loading={submitting} onClick={() => void submit()} className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Go Live on AirPal
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
