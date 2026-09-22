import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
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
  "mt-1 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20";

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-4 space-y-0" aria-label="Onboarding progress">
      {ONBOARD_STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.id} className="flex items-start gap-3">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                  done
                    ? "bg-brand text-white"
                    : current
                      ? "bg-brand/15 text-brand"
                      : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < ONBOARD_STEPS.length - 1 && <span className="my-0.5 h-4 w-px bg-line" />}
            </span>
            <span className={cn("pb-3 pt-1 text-sm", current ? "font-semibold" : done ? "text-mute" : "text-mute")}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function BusinessOnboardPage() {
  const [, nav] = useLocation();
  const { user, authReady, requireUser } = useAuth();
  const { business, updateProfile } = useBio();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardDraft>(() => {
    const base = emptyDraft();
    const isFashion = typeof window !== "undefined" && window.location.search.includes("track=fashion");
    return isFashion ? { ...base, category: "shops", venue: { ...base.venue, mode: "unlisted" } } : base;
  });
  const [results, setResults] = useState<DirectoryVenue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous double-tap guard: `submitting` only disables the button after
  // a re-render, so a second tap can file a second business claim.
  const guardRef = useRef(createSubmitGuard());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [changeListing, setChangeListing] = useState(false);

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
        snap.docs.map((d) => ({
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
        });
        placeId = res.placeId;
        try {
          const listing = await upsertBusinessListingRemote({
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
          if (business?.handle) {
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
      nav("/business/setup");
      return;
    } catch (e) {
      guardRef.current.release();
      setSubmitError(e instanceof Error ? e.message : "Something went wrong filing your claim.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  const domainOk = googleOwnerVerified(draft, user?.email);
  const featuredOk = canPublishFeatured(draft, user?.email);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/join" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> {NAMES.addPlace}
      </Link>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{NAMES.partnerAccount}</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Register the business</h1>
      <p className="mt-1 text-sm text-mute">
        Same AirPal login. Search Google, pick the listing, go live. Guests then find this place on What&apos;s on and
        in search.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <Stepper step={step} />

        <div className="rounded-2xl border border-line bg-card p-5">
          {stepId === "venue" && (
            <section>
              <h2 className="font-display text-lg font-bold">What&apos;s the business called?</h2>
              <p className="mt-1 text-[13px] text-mute">
                Search Google. Pick your listing — name, photo, address, hours, and phone fill in.
              </p>
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
                <>
                  <p className="mt-4 text-[13px] font-semibold">Category</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BUSINESS_CATEGORIES.filter(
                      (c) => (c.id !== "parking" && c.id !== "fashion") || c.id === draft.category,
                    ).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => set("category", c.id)}
                        aria-pressed={draft.category === c.id}
                        className={cn(
                          "h-9 rounded-full px-3 text-sm",
                          draft.category === c.id ? "bg-brand text-white" : "bg-paper text-ink ring-1 ring-line",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] text-mute">
                    {BUSINESS_CATEGORIES.find((c) => c.id === draft.category)?.line}
                  </p>
                </>
              )}
            </section>
          )}

          {stepId === "owner" && (
            <section>
              <h2 className="font-display text-lg font-bold">You</h2>
              <p className="mt-1 text-[13px] text-mute">Who we can contact about this place.</p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[13px] font-semibold">Full name</span>
                  <input
                    value={draft.owner.name}
                    onChange={(e) => set("owner", { ...draft.owner, name: e.target.value })}
                    className={inputCls}
                    placeholder="Sam Chen"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[13px] font-semibold">Work email</span>
                    <input
                      type="email"
                      value={draft.owner.email}
                      onChange={(e) => set("owner", { ...draft.owner, email: e.target.value })}
                      className={inputCls}
                      placeholder="sam@venue.com.au"
                    />
                    <span className="mt-1 block text-[12px] text-mute">
                      {user?.email
                        ? `Signed in as ${user.email}. Featured uses that address vs the Google website — not a typed contact.`
                        : "Gmail is fine for a free listing. Featured needs the work email on the Google website, or an ABN."}
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold">Phone</span>
                    <input
                      type="tel"
                      value={draft.owner.phone}
                      onChange={(e) => set("owner", { ...draft.owner, phone: e.target.value })}
                      className={inputCls}
                      placeholder="0412 345 678"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[13px] font-semibold">Your role</span>
                    <select
                      value={draft.owner.role}
                      onChange={(e) => set("owner", { ...draft.owner, role: e.target.value })}
                      className={inputCls}
                    >
                      {["Owner", "Manager", "Marketing", "Staff"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold">ABN / Tax ID (optional)</span>
                    <input
                      value={draft.owner.abnOrTaxId}
                      onChange={(e) => set("owner", { ...draft.owner, abnOrTaxId: e.target.value })}
                      className={inputCls}
                      placeholder="51 824 753 556"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[13px] font-semibold">Welcome perk for AirPal guests (optional)</span>
                  <input
                    value={draft.owner.customPerk}
                    onChange={(e) => set("owner", { ...draft.owner, customPerk: e.target.value })}
                    className={inputCls}
                    placeholder="Free house drink with any main"
                  />
                </label>
              </div>
            </section>
          )}

          {stepId === "verify" && (
            <section>
              <h2 className="font-display text-lg font-bold">Verify {draft.venue.venueName || "the business"}</h2>
              <p className="mt-1 text-[13px] text-mute">
                {draft.googlePlaceId
                  ? "Check the imported Google details. A checkbox is a directory claim, not Google ownership."
                  : "Search the public Google listing so we don't retype it. A checkbox is a directory claim, not Google ownership."}
              </p>
              <div className="mt-3">
                {draft.googlePlaceId && !changeListing ? (
                  <div className="overflow-hidden rounded-2xl ring-1 ring-line bg-paper">
                    {draft.heroImage && <img src={draft.heroImage} alt="" className="h-28 w-full object-cover" />}
                    <div className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand">From Google</p>
                      <p className="font-display mt-1 text-lg font-bold">{draft.venue.venueName}</p>
                      {draft.address && <p className="mt-0.5 text-[13px] text-mute">{draft.address}</p>}
                      <p className="mt-1 truncate text-[12px] text-mute">
                        {[draft.phoneFromGoogle || draft.owner.phone, draft.website.replace(/^https?:\/\//, "")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <button
                        type="button"
                        className="mt-3 text-[13px] font-semibold text-brand"
                        onClick={() => setChangeListing(true)}
                      >
                        Change listing
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
              {draft.googlePlaceId && (
                <p
                  className={cn(
                    "mt-3 rounded-xl px-3 py-2 text-[13px] font-medium",
                    domainOk ? "bg-brand/5 text-brand" : "bg-paper text-mute ring-1 ring-line",
                  )}
                >
                  {domainOk
                    ? "Signed-in email matches the Google website. That is ownership for Featured."
                    : "Imported from Google. To prove ownership, sign in with the work email on that website — or add an ABN. The checkbox below is only a directory claim."}
                </p>
              )}
              <label className="mt-4 block">
                <span className="text-[13px] font-semibold">Address</span>
                <input
                  value={draft.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputCls}
                  placeholder="18 Lower Fort St, The Rocks NSW"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[13px] font-semibold">Website (optional)</span>
                <input
                  value={draft.website}
                  onChange={(e) => set("website", e.target.value)}
                  className={inputCls}
                  placeholder="https://glenmorehotel.com.au"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[13px] font-semibold">Short description (optional)</span>
                <textarea
                  value={draft.shortWhy}
                  onChange={(e) => set("shortWhy", e.target.value)}
                  rows={2}
                  className={inputCls}
                  placeholder="What should people know in one line?"
                />
              </label>
              {results.length > 0 && (
                <div className="mt-3">
                  <p className="text-[12px] font-semibold text-mute">Already on AirPal?</p>
                  <ul className="mt-1 divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {results.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => set("venue", { mode: "listed", venueId: v.id, venueName: v.name })}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                            draft.venue.venueId === v.id ? "bg-brand/5" : "hover:bg-paper",
                          )}
                        >
                          <Store size={15} className="shrink-0 text-gold" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{v.name}</span>
                            {v.address && <span className="block truncate text-xs text-mute">{v.address}</span>}
                          </span>
                          {draft.venue.venueId === v.id && <BadgeCheck size={16} className="shrink-0 text-brand" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {(
                  [
                    ["googleListingConfirmed", "I manage this listing (directory claim — not Google ownership)"],
                    ["authorityConfirmed", "This is my business and the details look right"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm",
                      draft.verify[key] ? "border-brand bg-brand/5" : "border-line",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={draft.verify[key]}
                      onChange={(e) => set("verify", { ...draft.verify, [key]: e.target.checked })}
                      className="mt-0.5 h-4 w-4 accent-[#1805db]"
                    />
                    <span className={draft.verify[key] ? "font-medium" : "text-mute"}>{label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-mute">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" />
                Products, services, and offers come after this. False claims are removed.
              </p>
            </section>
          )}

          {stepId === "review" && (
            <section>
              <h2 className="font-display text-lg font-bold">Check everything</h2>
              <p className="mt-1 text-[13px] text-mute">
                Go live, then add three things people can find. Featured needs a work-email match or an ABN.
              </p>
              <dl className="mt-3 space-y-2 rounded-xl bg-paper p-4 text-sm ring-1 ring-line">
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Place</dt>
                  <dd className="text-right font-semibold">
                    {draft.googlePlaceId
                      ? `${draft.venue.venueName} · Google`
                      : draft.venue.mode === "listed"
                        ? draft.venue.venueName
                        : `${draft.venue.venueName} (new)`}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Contact</dt>
                  <dd className="text-right font-semibold">
                    {draft.owner.name} · {draft.owner.role}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Email / Phone</dt>
                  <dd className="text-right font-semibold">
                    {draft.owner.email} · {draft.owner.phone}
                  </dd>
                </div>
                {draft.owner.abnOrTaxId.trim() && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">ABN / Tax ID</dt>
                    <dd className="text-right font-semibold">{draft.owner.abnOrTaxId.trim()}</dd>
                  </div>
                )}
                {draft.address && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Address</dt>
                    <dd className="text-right font-semibold">{draft.address}</dd>
                  </div>
                )}
                {draft.website && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Website</dt>
                    <dd className="text-right font-semibold">{draft.website.replace(/^https?:\/\//, "")}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Ownership</dt>
                  <dd className="text-right font-semibold">
                    {domainOk ? "Work email matches Google site" : "Directory claim"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[13px] font-semibold">Plan</p>
              <div className="mt-2 grid gap-2">
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
                        "rounded-xl border p-3 text-left",
                        selected ? "border-brand bg-brand/5" : "border-line",
                        locked && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[12px] text-mute">{p.price}</span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-mute">
                        {locked ? "Needs a work email on the Google website, or an ABN." : p.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={draft.acceptedTerms}
                  onChange={(e) => set("acceptedTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1805db]"
                />
                <span className="text-mute">
                  I accept the AirPal terms and confirm this business profile is truthful.
                </span>
              </label>
              {submitError && (
                <p className="mt-3 rounded-xl bg-paper p-3 text-[13px] text-mute ring-1 ring-line">{submitError}</p>
              )}
            </section>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={15} /> Back
            </Button>
            {step < ONBOARD_STEPS.length - 1 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Continue <ArrowRight size={15} />
              </Button>
            ) : (
              <Button disabled={!canNext || submitting} loading={submitting} onClick={() => void submit()}>
                <Building2 size={15} /> Go live
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
