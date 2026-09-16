import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { claimFreeVenuePresenceRemote, submitPartnerClaimRemote } from "@/lib/functions";
import { cn } from "@/lib/cn";
import {
  BUSINESS_PLANS,
  ONBOARD_STEPS,
  emptyDraft,
  ownerStepValid,
  reviewReady,
  venueStepValid,
  verifyStepValid,
  type BusinessPlanId,
  type OnboardDraft,
  type OnboardStepId,
} from "@shared/business-onboarding";
import { BUSINESS_CATEGORIES } from "@shared/business";

interface DirectoryVenue {
  id: string;
  name: string;
  address: string;
}

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none placeholder:text-mute focus:border-brand";

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
                  done ? "bg-brand text-white" : current ? "bg-ink text-white" : "bg-paper text-mute ring-1 ring-line",
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
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardDraft>(emptyDraft);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DirectoryVenue[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ claimId: string; markerPath?: string } | null>(null);

  const stepId: OnboardStepId = ONBOARD_STEPS[step]!.id;

  async function runLookup(needle: string) {
    const db = getFirebaseDb();
    if (!db || needle.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setLookupFailed(false);
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
      setLookupFailed(true);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (stepId !== "venue") return;
    const t = setTimeout(() => void runLookup(search), 250);
    return () => clearTimeout(t);
  }, [search, stepId]);

  const canNext = useMemo(() => {
    if (stepId === "venue") return venueStepValid(draft);
    if (stepId === "owner") return ownerStepValid(draft);
    if (stepId === "verify") return verifyStepValid(draft);
    if (stepId === "plan") return true;
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
    setSubmitting(true);
    try {
      if (draft.venue.mode === "listed") {
        const res = await submitPartnerClaimRemote({
          venueId: draft.venue.venueId,
          name: draft.owner.name.trim(),
          email: draft.owner.email.trim(),
          phone: draft.owner.phone.trim(),
          role: draft.owner.role.trim() || "Owner",
          customPerk: draft.owner.customPerk.trim() || undefined,
          abnOrTaxId: draft.owner.abnOrTaxId.trim() || undefined,
          plan: draft.plan,
        });
        setDone({ claimId: res.claimId });
      } else {
        const res = await claimFreeVenuePresenceRemote({
          venueName: draft.venue.venueName.trim(),
          address: draft.address.trim(),
          category: draft.category,
          shortWhy: draft.shortWhy.trim(),
          hours: draft.hours.trim() || undefined,
          phone: draft.owner.phone.trim() || undefined,
          guestPerk: draft.owner.customPerk.trim() || undefined,
        });
        setDone({ claimId: res.venueId, markerPath: res.markerPath });
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong filing your claim.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold tracking-tight">You&apos;re on the list</h1>
        <p className="mt-2 text-sm leading-6 text-mute">
          {draft.venue.mode === "listed"
            ? `Claim ${done.claimId} is pending review. We verify every owner before flipping the Verified badge — usually within 2 business days.`
            : `Your venue is live as a free presence. Our team will apply your ${BUSINESS_PLANS.find((p) => p.id === draft.plan)?.name} plan on review.`}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {done.markerPath && (
            <Button onClick={() => nav(done.markerPath!)}>View your venue</Button>
          )}
          <Button variant="ghost" onClick={() => nav("/business")}>
            Back to Business
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/partners" className="flex items-center gap-1 text-[13px] font-medium text-mute">
        <ArrowLeft size={14} /> Partners
      </Link>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Business onboarding</p>
      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">Bring your venue to AirPal.me</h1>
      <p className="mt-1 text-sm text-mute">
        {user ? `Signed in as ${user.email || "your account"}.` : "You can fill this in now — sign-in is only needed at sign-off."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <Stepper step={step} />

        <div className="rounded-2xl border border-line bg-card p-5">
          {stepId === "venue" && (
            <section>
              <h2 className="font-display text-lg font-bold">Find Your Venue</h2>
              <p className="mt-1 text-[13px] text-mute">Start typing — if we already list you, claim it in one tap.</p>
              <label className="mt-3 block">
                <span className="sr-only">Search the AirPal directory</span>
                <span className="relative block">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Harbour View Hotel…"
                    className="w-full rounded-xl border border-ink bg-paper py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-brand"
                  />
                </span>
              </label>
              {searching && <p className="mt-2 text-[13px] text-mute">Searching the directory…</p>}
              {lookupFailed && (
                <p className="mt-2 text-[13px] text-mute">Directory is offline — describe your venue below instead.</p>
              )}
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {results.map((v) => (
                    <li key={v.id}>
                      <button
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
              )}
              <div className="mt-4 rounded-xl bg-paper p-3 ring-1 ring-line">
                <button
                  onClick={() =>
                    set("venue", {
                      mode: draft.venue.mode === "unlisted" ? "listed" : "unlisted",
                      venueId: "",
                      venueName: draft.venue.venueName,
                    })
                  }
                  className="text-[13px] font-semibold text-brand"
                >
                  {draft.venue.mode === "unlisted" ? "← Back to directory search" : "My venue isn't listed →"}
                </button>
                {draft.venue.mode === "unlisted" && (
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-[13px] font-semibold">Venue name</span>
                      <input
                        value={draft.venue.venueName}
                        onChange={(e) => set("venue", { ...draft.venue, venueName: e.target.value })}
                        className={inputCls}
                        placeholder="Harbour View Hotel"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-semibold">Street address</span>
                      <input
                        value={draft.address}
                        onChange={(e) => set("address", e.target.value)}
                        className={inputCls}
                        placeholder="18 Lower Fort St, Sydney"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-semibold">Category</span>
                      <select
                        value={draft.category}
                        onChange={(e) => set("category", e.target.value)}
                        className={inputCls}
                      >
                        {BUSINESS_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.place}>
                            {c.label} — {c.line}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-semibold">Why should guests come? (min 10 characters)</span>
                      <textarea
                        value={draft.shortWhy}
                        onChange={(e) => set("shortWhy", e.target.value)}
                        rows={2}
                        className={inputCls}
                        placeholder="Rooftop over the harbour, live sets on weekends…"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[13px] font-semibold">Hours (optional)</span>
                      <input
                        value={draft.hours}
                        onChange={(e) => set("hours", e.target.value)}
                        className={inputCls}
                        placeholder="Thu–Sun, 12pm–late"
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          )}

          {stepId === "owner" && (
            <section>
              <h2 className="font-display text-lg font-bold">Owner Details</h2>
              <p className="mt-1 text-[13px] text-mute">Who may we contact about this venue?</p>
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
              <h2 className="font-display text-lg font-bold">Verify Claim</h2>
              <p className="mt-1 text-[13px] text-mute">
                We check every claim by hand before the Verified badge goes live. Give us at least one proof signal.
              </p>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ["workEmailMatches", "My email matches the business (e.g. sam@venue.com.au)"],
                    ["abnProvided", "I provided an ABN / Tax ID above"],
                    ["authorityConfirmed", "I confirm I am authorised to claim this venue"],
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
                Claims stay pending until AirPal reviews them. False claims are removed and blocked.
              </p>
            </section>
          )}

          {stepId === "plan" && (
            <section>
              <h2 className="font-display text-lg font-bold">Choose Plan</h2>
              <p className="mt-1 text-[13px] text-mute">Start free, upgrade when the guests roll in. Prices confirmed at activation.</p>
              <div className="mt-3 space-y-2">
                {BUSINESS_PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => set("plan", p.id as BusinessPlanId)}
                    aria-pressed={draft.plan === p.id}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left",
                      draft.plan === p.id ? "border-brand bg-brand/5" : "border-line hover:border-mute",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-base font-bold">{p.name}</span>
                      <span className="text-sm font-semibold text-brand">{p.price}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-mute">{p.blurb}</span>
                    <ul className="mt-2 space-y-1">
                      {p.perks.map((perk) => (
                        <li key={perk} className="text-[13px] text-mute">
                          · {perk}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </section>
          )}

          {stepId === "review" && (
            <section>
              <h2 className="font-display text-lg font-bold">Review &amp; Sign-Off</h2>
              <p className="mt-1 text-[13px] text-mute">Check everything, accept the terms, file the claim.</p>
              <dl className="mt-3 space-y-2 rounded-xl bg-paper p-4 text-sm ring-1 ring-line">
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Venue</dt>
                  <dd className="text-right font-semibold">
                    {draft.venue.mode === "listed" ? draft.venue.venueName : `${draft.venue.venueName} (new)`}
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
                {draft.owner.customPerk.trim() && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Guest perk</dt>
                    <dd className="text-right font-semibold">{draft.owner.customPerk.trim()}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Plan</dt>
                  <dd className="text-right font-semibold">
                    {BUSINESS_PLANS.find((p) => p.id === draft.plan)?.name} ·{" "}
                    {BUSINESS_PLANS.find((p) => p.id === draft.plan)?.price}
                  </dd>
                </div>
              </dl>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={draft.acceptedTerms}
                  onChange={(e) => set("acceptedTerms", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1805db]"
                />
                <span className="text-mute">
                  I accept the AirPal Partner Terms and confirm this claim is truthful. I understand paid plans are
                  confirmed with our team before billing.
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
                <Building2 size={15} /> File my claim
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
