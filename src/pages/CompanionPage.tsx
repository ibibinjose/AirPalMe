import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { ImageField } from "@/components/media/ImageField";
import { useCompanion } from "@/contexts/CompanionContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  COMPANION_ACTIVITIES,
  COMPANION_AGE_RANGES,
  COMPANION_AVAILABILITY,
  COMPANION_PRICING_LABEL,
  COMPANION_ROLES,
  companionStatusCopy,
  validateCompanionApplication,
  type CompanionPricing,
  type CompanionRole,
} from "@shared/companion";
import { CITY_OPTIONS } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { enterEase, landing, landingItem } from "@/lib/motion";

const ROLE_ICONS = {
  friend: HeartHandshake,
  teammate: Users,
  companion: Sparkles,
} as const;

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-paper text-mute ring-line",
  submitted: "bg-brand/10 text-brand ring-brand/30",
  under_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
  declined: "bg-zinc-500/10 text-mute ring-line",
  more_info: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/30",
};

const STEPS = [
  { id: 1, label: "You" },
  { id: 2, label: "Roles" },
  { id: 3, label: "Safety" },
] as const;

const STEP_FIELDS: Record<1 | 2 | 3, string[]> = {
  1: ["fullName", "email", "city", "introduction", "policeClearanceNumber", "policeClearanceDoc"],
  2: ["roles", "motivation", "preferredRate"],
  3: ["applicantAgreementAccepted", "communityGuidelinesAccepted", "adultConfirmed"],
};

const HERO_IMG = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80";

const stepEase = { duration: 0.32, ease: enterEase };

function Chip({
  selected,
  onToggle,
  children,
  label,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-[42px] touch-manipulation items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition duration-200 active:scale-[0.97] ring-1",
        selected
          ? "bg-ink text-white ring-ink shadow-sm"
          : "bg-paper/80 text-mute ring-line hover:text-ink hover:ring-ink/25",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">{label}</label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-2xl bg-paper/70 px-4 text-[16px] md:text-[15px] ring-1 ring-line/90 outline-none transition duration-200 placeholder:text-mute/70 focus:bg-card focus:ring-2 focus:ring-brand/45 text-ink";

const areaCls =
  "w-full rounded-2xl border-2 border-ink bg-paper/70 p-4 text-[16px] md:text-[15px] outline-none transition duration-200 placeholder:text-mute/70 focus:border-brand focus:bg-card focus:ring-2 focus:ring-brand/45 text-ink leading-relaxed";

export function CompanionPage() {
  const [, nav] = useLocation();
  const { user, promptSignIn } = useAuth();
  const { application, startApplication, save, submit } = useCompanion();
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const showForm = started || (application && (application.status === "draft" || application.status === "more_info"));
  const submitted = application && !["draft", "more_info"].includes(application.status);

  useEffect(() => {
    if (!showForm && !submitted) void track("companion_cta_viewed", {});
  }, [showForm, submitted]);

  const statusCopy = useMemo(() => (application ? companionStatusCopy(application.status) : null), [application]);

  const completeness = useMemo(() => {
    if (!application) return { done: 0, total: 1, pct: 0 };
    const checks = [
      application.fullName.trim().length >= 2,
      application.email.includes("@"),
      application.city.trim().length >= 2,
      application.roles.length > 0,
      application.introduction.trim().length >= 20,
      application.motivation.trim().length >= 10,
      application.applicantAgreementAccepted,
      application.communityGuidelinesAccepted,
      application.adultConfirmed === true,
      application.policeClearanceNumber.trim().length >= 4,
      (application.policeClearanceDoc || "").trim().length > 0,
    ];
    if (application.pricingPreference === "paid") checks.push((application.preferredRate || "").trim().length > 0);
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [application]);

  const set = (patch: Parameters<typeof save>[0]) => save(patch);

  const toggleInList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  function errorsForStep(n: 1 | 2 | 3) {
    if (!application) return [];
    const all = validateCompanionApplication(application);
    const fields = new Set(STEP_FIELDS[n]);
    return all.filter((er) => fields.has(er.field));
  }

  function goNext() {
    const stepErrs = errorsForStep(step);
    if (stepErrs.length) {
      setFormErrors(stepErrs.map((er) => er.message));
      setFieldErrors(Object.fromEntries(stepErrs.map((er) => [er.field, er.message])));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setFormErrors([]);
    setFieldErrors({});
    setStep((n) => (n < 3 ? ((n + 1) as 1 | 2 | 3) : n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = submit();
    if (res.errors) {
      setFormErrors(res.errors.map((er) => er.message));
      setFieldErrors(Object.fromEntries(res.errors.map((er) => [er.field, er.message])));
      const first = res.errors[0]?.field;
      if (first && STEP_FIELDS[1].includes(first)) setStep(1);
      else if (first && STEP_FIELDS[2].includes(first)) setStep(2);
      else setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setFormErrors([]);
      setFieldErrors({});
      setStarted(false);
      void track("companion_application_submitted", { roles: application?.roles.join(",") || "" });
    }
  };

  const goBack = () => {
    if (showForm && step > 1) {
      setStep((n) => (n > 1 ? ((n - 1) as 1 | 2 | 3) : n));
      return;
    }
    if (window.history.length > 1) window.history.back();
    else nav("/");
  };

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-40 h-64 w-64 rounded-full bg-gold/15 blur-3xl"
      />

      <div className={cn("relative mx-auto px-4 pb-28", showForm || submitted ? "max-w-2xl py-5 md:py-8" : "max-w-5xl py-5 md:py-8")}>
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card/80 text-ink ring-1 ring-line shadow-sm backdrop-blur transition hover:bg-card"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">AirPal Companion</p>
            <h1 className="font-display truncate text-xl font-semibold tracking-tight text-ink md:text-2xl">
              {showForm ? "Your application" : submitted ? "Application status" : "Become an AirPal"}
            </h1>
          </div>
        </header>

        {showForm && application && (
          <div className="sticky top-2 z-30 mt-5 overflow-hidden rounded-[22px] bg-card/80 p-2.5 ring-1 ring-line shadow-sm backdrop-blur-xl">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-line/70">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={false}
                animate={{ width: `${completeness.pct}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.4, ease: enterEase }}
              />
            </div>
            <ol className="grid grid-cols-3 gap-1">
              {STEPS.map((s) => {
                const on = step === s.id;
                const done = step > s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (s.id < step || errorsForStep(step).length === 0) setStep(s.id);
                      }}
                      className={cn(
                        "flex w-full items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-semibold transition duration-200",
                        on ? "bg-ink text-white shadow-sm" : done ? "bg-brand/10 text-brand" : "text-mute hover:text-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full text-[10px]",
                          on ? "bg-white/15" : done ? "bg-brand text-white" : "bg-paper ring-1 ring-line",
                        )}
                      >
                        {done ? <Check size={11} /> : s.id}
                      </span>
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-1.5 text-center text-[11px] tabular-nums text-mute">
              {completeness.done}/{completeness.total} complete
            </p>
          </div>
        )}

        {formErrors.length > 0 && (
          <div
            role="alert"
            className="mt-5 rounded-2xl bg-red-500/10 p-4 text-[13px] text-red-600 ring-1 ring-red-500/25 dark:text-red-400"
          >
            <p className="font-semibold">Please fix the following</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {formErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {!showForm && !submitted && (
          <Landing
            onJoin={() => {
              startApplication();
              setStarted(true);
              setStep(1);
              void track("companion_application_started", {});
              window.scrollTo({ top: 0 });
            }}
          />
        )}

        {submitted && application && statusCopy && (
          <StatusCard
            status={application.status}
            title={
              application.status === "submitted" || application.status === "under_review"
                ? "You're on the AirPal Companion waitlist"
                : statusCopy.title
            }
            body={
              application.status === "submitted" || application.status === "under_review"
                ? "Thanks — the AirPal team reviews every application by hand. We’ll email you when the status changes."
                : statusCopy.body
            }
            onUpdate={
              application.status === "more_info"
                ? () => {
                    startApplication();
                    setStarted(true);
                    setStep(1);
                  }
                : undefined
            }
            onMe={() => nav("/me")}
          />
        )}

        {showForm && application && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {!user && (
              <button
                type="button"
                onClick={() => promptSignIn("Sign in so we can reach you if you change devices.")}
                className="flex w-full items-start gap-3 rounded-[22px] bg-card/80 p-4 text-left ring-1 ring-line shadow-sm backdrop-blur transition hover:ring-brand/30"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">Optional: sign in first</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-mute">
                    Apply on this device now, or sign in to finish later on another phone.
                  </span>
                </span>
              </button>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={reduce ? { duration: 0 } : stepEase}
              >
                {step === 1 && (
                  <section className="space-y-5 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-7">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">About you</h2>
                      <p className="mt-1 text-[13px] text-mute">A few minutes. We save as you type.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" error={fieldErrors.fullName}>
                        <input
                          type="text"
                          value={application.fullName}
                          onChange={(e) => set({ fullName: e.target.value })}
                          placeholder="Alex Mate"
                          autoComplete="name"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Email" error={fieldErrors.email}>
                        <input
                          type="email"
                          value={application.email}
                          onChange={(e) => set({ email: e.target.value })}
                          placeholder="alex@mates.io"
                          autoComplete="email"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Phone">
                        <input
                          type="tel"
                          value={application.phone}
                          onChange={(e) => set({ phone: e.target.value })}
                          placeholder="+61 400 123 123"
                          autoComplete="tel"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Age range">
                        <select
                          value={application.ageRange}
                          onChange={(e) => set({ ageRange: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Select…</option>
                          {COMPANION_AGE_RANGES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="City" error={fieldErrors.city}>
                        <input
                          type="text"
                          list="companion-cities"
                          value={application.city}
                          onChange={(e) => set({ city: e.target.value })}
                          placeholder="e.g. Sydney"
                          className={inputCls}
                        />
                        <datalist id="companion-cities">
                          {CITY_OPTIONS.map((c) => (
                            <option key={c.id} value={c.label} />
                          ))}
                        </datalist>
                      </Field>
                      <Field label="Suburb">
                        <input
                          type="text"
                          value={application.suburb}
                          onChange={(e) => set({ suburb: e.target.value })}
                          placeholder="Surry Hills"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink/70">Profile photo</p>
                      <ImageField
                        kind="avatar"
                        value={application.photo}
                        onChange={(url) => {
                          set({ photo: url });
                        }}
                      />
                    </div>
                    <div className="space-y-3 rounded-[22px] bg-paper/80 p-4 ring-1 ring-line">
                      <div>
                        <p className="text-sm font-semibold text-ink">Police clearance certificate</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-mute">
                          Required. Only reviewers see this — never on your public profile.
                        </p>
                      </div>
                      <Field label="Certificate / reference number" error={fieldErrors.policeClearanceNumber}>
                        <input
                          type="text"
                          value={application.policeClearanceNumber}
                          onChange={(e) => set({ policeClearanceNumber: e.target.value })}
                          placeholder="e.g. NSW-123456"
                          className={inputCls}
                        />
                      </Field>
                      <div>
                        <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink/70">
                          Photo or scan of the certificate
                        </p>
                        <ImageField
                          kind="hero"
                          value={application.policeClearanceDoc}
                          onChange={(url) => {
                            set({ policeClearanceDoc: url });
                          }}
                        />
                        {fieldErrors.policeClearanceDoc && (
                          <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">
                            {fieldErrors.policeClearanceDoc}
                          </p>
                        )}
                      </div>
                    </div>
                    <Field
                      label="Short introduction"
                      hint={`${application.introduction.trim().length}/20 characters minimum`}
                      error={fieldErrors.introduction}
                    >
                      <textarea
                        rows={3}
                        value={application.introduction}
                        onChange={(e) => set({ introduction: e.target.value })}
                        placeholder="A few lines about you — what you enjoy, how you like to spend time with people…"
                        className={areaCls}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Languages (comma separated)">
                        <input
                          type="text"
                          value={application.languages.join(", ")}
                          onChange={(e) =>
                            set({
                              languages: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="English, Mandarin"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Interests (comma separated)">
                        <input
                          type="text"
                          value={application.interests.join(", ")}
                          onChange={(e) =>
                            set({
                              interests: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Coffee, hiking, live music"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Hobbies (comma separated)">
                        <input
                          type="text"
                          value={application.hobbies.join(", ")}
                          onChange={(e) =>
                            set({
                              hobbies: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Photography, running"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Preferred service area">
                        <input
                          type="text"
                          value={application.serviceArea}
                          onChange={(e) => set({ serviceArea: e.target.value })}
                          placeholder="Inner Sydney"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <Field label="What do you enjoy doing with other people?">
                      <textarea
                        rows={2}
                        value={application.enjoysWithOthers}
                        onChange={(e) => set({ enjoysWithOthers: e.target.value })}
                        placeholder="Exploring new neighbourhoods, long chats over coffee…"
                        className={areaCls}
                      />
                    </Field>
                  </section>
                )}

                {step === 2 && (
                  <section className="space-y-5 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-7">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Roles & availability</h2>
                      <p className="mt-1 text-[13px] text-mute">Pick every role you’d actually show up for.</p>
                    </div>
                    {fieldErrors.roles && (
                      <p className="text-[12px] text-red-600 dark:text-red-400">{fieldErrors.roles}</p>
                    )}
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {COMPANION_ROLES.map((role) => {
                        const on = application.roles.includes(role.id);
                        const RoleIcon = ROLE_ICONS[role.id];
                        return (
                          <button
                            key={role.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set({ roles: toggleInList(application.roles, role.id) as CompanionRole[] })}
                            className={cn(
                              "rounded-[22px] p-4 text-left ring-1 transition duration-200 active:scale-[0.98]",
                              on
                                ? "bg-ink text-white ring-ink shadow-md"
                                : "bg-paper/70 ring-line hover:ring-ink/25 hover:shadow-sm",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-10 w-10 place-items-center rounded-2xl ring-1",
                                on ? "bg-white/15 text-white ring-white/20" : "bg-brand/10 text-brand ring-brand/20",
                              )}
                            >
                              <RoleIcon size={18} />
                            </span>
                            <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
                              {on && <Check size={14} />}
                              {role.label}
                            </span>
                            <span className={cn("mt-1 block text-[12px] leading-snug", on ? "text-white/70" : "text-mute")}>
                              {role.blurb}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">Activities you offer</h3>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {COMPANION_ACTIVITIES.map((a) => (
                          <Chip
                            key={a}
                            label={a}
                            selected={application.activities.includes(a)}
                            onToggle={() => set({ activities: toggleInList(application.activities, a) })}
                          >
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">Availability</h3>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {COMPANION_AVAILABILITY.map((a) => (
                          <Chip
                            key={a}
                            label={a}
                            selected={application.availability.includes(a)}
                            onToggle={() => set({ availability: toggleInList(application.availability, a) })}
                          >
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">Pricing</h3>
                      <div className="mt-2.5 grid grid-cols-3 gap-2">
                        {(Object.keys(COMPANION_PRICING_LABEL) as CompanionPricing[]).map((p) => {
                          const on = application.pricingPreference === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              aria-pressed={on}
                              onClick={() => set({ pricingPreference: p })}
                              className={cn(
                                "rounded-2xl px-3 py-3.5 text-[12px] font-semibold ring-1 transition duration-200 active:scale-[0.97]",
                                on ? "bg-ink text-white ring-ink shadow-sm" : "bg-paper/70 text-mute ring-line hover:text-ink",
                              )}
                            >
                              {COMPANION_PRICING_LABEL[p]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {application.pricingPreference === "paid" && (
                      <Field label="Preferred hourly / session rate" error={fieldErrors.preferredRate}>
                        <input
                          type="text"
                          value={application.preferredRate || ""}
                          onChange={(e) => set({ preferredRate: e.target.value })}
                          placeholder="$40/hr"
                          className={inputCls}
                        />
                      </Field>
                    )}

                    <Field
                      label="Why would you like to become an AirPal?"
                      hint={`${application.motivation.trim().length}/10 characters minimum`}
                      error={fieldErrors.motivation}
                    >
                      <textarea
                        rows={3}
                        value={application.motivation}
                        onChange={(e) => set({ motivation: e.target.value })}
                        placeholder="A few honest lines…"
                        className={areaCls}
                      />
                    </Field>
                  </section>
                )}

                {step === 3 && (
                  <section className="space-y-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-7">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Applicant agreement</h2>
                      <p className="mt-2 text-[13px] leading-relaxed text-mute">
                        AirPal is about human connection and shared experiences — never healthcare, therapy, nursing,
                        counselling or professional personal care. By applying you agree to the community guidelines,
                        safety expectations, respectful behaviour, appropriate boundaries, and no harassment,
                        discrimination, sexual services, or misleading professional or medical claims. You confirm you
                        hold a valid police clearance certificate and consent to the AirPal team verifying it.
                      </p>
                    </div>
                    {(
                      [
                        ["adultConfirmed", "I confirm I am 18 years or older."],
                        [
                          "applicantAgreementAccepted",
                          "I understand that submitting this application does not automatically make me an approved AirPal.",
                        ],
                        ["communityGuidelinesAccepted", "I agree to the community guidelines and safety expectations."],
                      ] as const
                    ).map(([key, label]) => {
                      const on = Boolean(application[key]);
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-[22px] p-4 text-[13px] leading-relaxed text-ink ring-1 transition duration-200",
                            on ? "bg-brand/10 ring-brand/30" : "bg-paper/70 ring-line hover:ring-ink/20",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1",
                              on ? "bg-brand text-white ring-brand" : "bg-card ring-line",
                            )}
                          >
                            {on ? <Check size={12} /> : null}
                          </span>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => set({ [key]: e.target.checked } as Parameters<typeof set>[0])}
                            className="sr-only"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              {step > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep((n) => (n > 1 ? ((n - 1) as 1 | 2 | 3) : n))}
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" size="lg" className="flex-1 justify-between" onClick={goNext}>
                  <span>Continue</span>
                  <ArrowRight size={18} />
                </Button>
              ) : (
                <Button type="submit" size="lg" className="flex-1 justify-between">
                  <span>Submit application</span>
                  <ArrowRight size={18} />
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Landing({ onJoin }: { onJoin: () => void }) {
  const [, nav] = useLocation();
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="mt-6"
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={reduce ? undefined : landing}
    >
      <motion.section
        variants={landingItem}
        className="relative overflow-hidden rounded-[32px] bg-ink text-white shadow-lg"
      >
        <Photo src={HERO_IMG} className="absolute inset-0 h-full w-full object-cover opacity-45" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
        <div className="relative flex min-h-[420px] flex-col justify-end p-6 md:min-h-[480px] md:p-10">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <HeartHandshake size={13} />
            Waitlist open
          </span>
          <h2 className="font-display mt-4 max-w-xl text-[2rem] font-semibold leading-[1.12] tracking-tight md:text-5xl">
            Meet people. Share the city. Help someone feel less alone.
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/80 md:text-base">
            AirPals are trusted locals who spend time with visitors and neighbours — coffee, walks, working together, or
            a night out. Every application is reviewed by a person.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="light" size="lg" onClick={onJoin} className="gap-1.5 shadow-md">
              <Users size={16} />
              Apply to become an AirPal
            </Button>
            <Button variant="onDark" size="lg" onClick={() => nav("/guide")} className="gap-1.5">
              <Sparkles size={16} />
              See how guests use AirPal
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.div variants={landingItem} className="mt-4 grid grid-cols-3 gap-2">
        {[
          { icon: ShieldCheck, label: "Police check", sub: "Required" },
          { icon: BadgeCheck, label: "18+ only", sub: "Adults" },
          { icon: Clock3, label: "Manual review", sub: "By a person" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1.5 rounded-[22px] bg-card/80 px-2 py-4 text-center ring-1 ring-line shadow-sm backdrop-blur"
          >
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/15">
              <item.icon size={16} />
            </span>
            <span className="text-[12px] font-semibold text-ink">{item.label}</span>
            <span className="hidden text-[11px] text-mute sm:block">{item.sub}</span>
          </div>
        ))}
      </motion.div>

      <motion.div variants={landingItem} className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Three ways to show up</p>
        <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink md:text-3xl">Pick the roles that fit you</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {COMPANION_ROLES.map((role) => {
            const RoleIcon = ROLE_ICONS[role.id];
            return (
              <article
                key={role.id}
                className="group rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 transition duration-300 group-hover:bg-brand group-hover:text-white">
                  <RoleIcon size={22} />
                </span>
                <h4 className="font-display mt-4 text-lg font-semibold text-ink">{role.label}</h4>
                <p className="mt-1 text-[13px] leading-snug text-mute">{role.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {role.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-[13px] text-ink/80">
                      <Check size={13} className="shrink-0 text-brand" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={landingItem} className="mt-8 overflow-hidden rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">How it works</p>
        <h3 className="font-display mt-1 text-2xl font-semibold tracking-tight text-ink">From apply to approved</h3>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { title: "Apply", body: "Tell us about you, your roles and activities. We save as you go." },
            { title: "Manual review", body: "A person on the AirPal team reads every application." },
            { title: "Get approved", body: "Approved AirPals get the badge and can complete a public profile." },
          ].map((s, i) => (
            <li key={s.title} className="relative">
              <span className="font-display text-3xl font-semibold text-brand/80">{i + 1}</span>
              <p className="mt-1 text-base font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}

function StatusCard({
  status,
  title,
  body,
  onUpdate,
  onMe,
}: {
  status: string;
  title: string;
  body: string;
  onUpdate?: () => void;
  onMe: () => void;
}) {
  const timeline =
    status === "submitted" || status === "under_review"
      ? [
          { done: true, label: "Application received" },
          { done: status === "under_review", label: "Team review" },
          { done: false, label: "You’re notified" },
        ]
      : null;

  return (
    <div className="mt-6 overflow-hidden rounded-[28px] bg-card/90 p-7 text-center ring-1 ring-line shadow-sm">
      {status === "approved" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
          <BadgeCheck size={15} />
          AirPal Approved
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ring-1",
            STATUS_STYLE[status],
          )}
        >
          {title}
        </span>
      )}
      <h2 className="font-display mt-5 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-mute">{body}</p>
      {timeline && (
        <ol className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
          {timeline.map((row) => (
            <li key={row.label} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full ring-1",
                  row.done ? "bg-brand text-white ring-brand" : "bg-paper text-mute ring-line",
                )}
              >
                {row.done ? <Check size={13} /> : <Clock3 size={13} />}
              </span>
              <span className={row.done ? "font-medium text-ink" : "text-mute"}>{row.label}</span>
            </li>
          ))}
        </ol>
      )}
      {onUpdate && (
        <Button className="mt-6" onClick={onUpdate}>
          Update application
        </Button>
      )}
      <div>
        <Button variant="ghost" className="mt-3" onClick={onMe}>
          Go to My AirPal
        </Button>
      </div>
    </div>
  );
}
