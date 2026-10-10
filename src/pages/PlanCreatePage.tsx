import { useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  Footprints,
  Globe,
  Lock,
  MapPin,
  Palmtree,
  PartyPopper,
  Search,
  Share2,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { createSubmitGuard } from "@/lib/submit-guard";
import { AuthGate } from "@/components/auth/AuthGate";
import { fieldInput } from "@/components/forms/ValidField";
import { PlanCoverPicker } from "@/components/plan/PlanCoverPicker";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useSocial } from "@/contexts/SocialContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { toZonedDateStr, zonedWeekdayIndex } from "@/lib/local-time";
import { listPeople } from "@/lib/people";
import { circleHandles } from "@/lib/circle";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { PLAN_TYPES, formatPlanDate, initialPlanDate, initialPlanTime, type PlanType } from "@shared/plan";
import { cn } from "@/lib/cn";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import type { Geo } from "@shared/nearby";
import { solveAirPalIntent } from "@/lib/brain";

interface TemplateItem {
  id: PlanType;
  label: string;
  tag: string;
  desc: string;
  Icon: typeof Coffee;
  bgGrad: string;
  iconBg: string;
  textColor: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "catchup",
    label: "Coffee & Catchup",
    tag: "Casual",
    desc: "Coffee, bakery run, brunch, or casual chats.",
    Icon: Coffee,
    bgGrad: "from-amber-500/10 via-amber-500/5 to-transparent hover:border-amber-500/40",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "lunch",
    label: "Lunch & Dining",
    tag: "Food & Eats",
    desc: "Midday feast, food markets, or quick foodie breaks.",
    Icon: UtensilsCrossed,
    bgGrad: "from-orange-500/10 via-orange-500/5 to-transparent hover:border-orange-500/40",
    iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "nightout",
    label: "Hangout & Night Out",
    tag: "Social & Drinks",
    desc: "Cocktails, sunset drinks, dinner, or weekend parties.",
    Icon: Users,
    bgGrad: "from-brand/10 via-brand/5 to-transparent hover:border-brand/40",
    iconBg: "bg-brand/15 text-accent",
    textColor: "text-accent",
  },
  {
    id: "walk",
    label: "Walk & Outdoors",
    tag: "Fresh Air",
    desc: "Scenic coastal walk, park stroll, or outdoor activity.",
    Icon: Footprints,
    bgGrad: "from-emerald-500/10 via-emerald-500/5 to-transparent hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "meeting",
    label: "Meeting & Co-Work",
    tag: "Productive",
    desc: "Work sync, brainstorm session, or side hustle sprint.",
    Icon: Briefcase,
    bgGrad: "from-blue-500/10 via-blue-500/5 to-transparent hover:border-blue-500/40",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "escape",
    label: "Road Trip & Escape",
    tag: "Adventure",
    desc: "Day trip, beach escape, or weekend road adventure.",
    Icon: Palmtree,
    bgGrad: "from-teal-500/10 via-teal-500/5 to-transparent hover:border-teal-500/40",
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    textColor: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "birthday",
    label: "Birthday & Celebration",
    tag: "Party & Milestone",
    desc: "Milestone birthdays, celebration dinners & toasts.",
    Icon: PartyPopper,
    bgGrad: "from-rose-500/10 via-rose-500/5 to-transparent hover:border-rose-500/40",
    iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    textColor: "text-rose-600 dark:text-rose-400",
  },
];

const TITLE_SUGGESTIONS: Record<string, string[]> = {
  catchup: ["☕ Morning Flat Whites", "🥑 Sunday Brunch & Coffee", "💬 Quick Catchup & Chat", "🥐 Bakery Run & Walk"],
  lunch: ["🍕 Casual Lunch & Chats", "🍣 Sushi Feast with Friends", "🍔 Midday Foodie Break", "🌮 Market Stalls & Eats"],
  nightout: ["🍸 Friday Sunset Drinks", "🍻 Weekend Hangout & Beats", "🍹 Cocktails & Chats", "🍕 Dinner & Night Out"],
  walk: ["🌊 Bondi to Bronte Walk", "🌿 Park Stroll & Flat Whites", "🏃 Sunset Walk & Stretch", "🐕 Weekend Dog Walk"],
  meeting: ["💻 Strategy & Brainstorm", "☕ Coffee & Work Sync", "🚀 Side Hustle Sprint", "📊 Project Catchup"],
  escape: ["🚗 South Coast Road Trip", "🏖️ Beach Afternoon & Sunset", "⛰️ Blue Mountains Day Trip", "🌴 Weekend Escape"],
  birthday: ["🎂 Birthday Celebration Drinks", "🎉 Milestone Birthday Dinner", "🥂 Sunset Birthday Toast", "🥳 Birthday Bash"],
};

const SYDNEY_PRESETS = [
  "The Rocks, Sydney",
  "Surry Hills, NSW",
  "Barangaroo, Sydney",
  "Bondi Beach, NSW",
  "Newtown, NSW",
  "Manly Beach, NSW",
  "CBD, Sydney",
];

const TIME_PRESETS = [
  { label: "Morning", time: "09:30" },
  { label: "Lunch", time: "12:30" },
  { label: "Arvo", time: "15:30" },
  { label: "Dinner", time: "18:30" },
  { label: "Night", time: "20:30" },
];

const STEPS = [
  { num: 1, label: "Plan", hint: "Type" },
  { num: 2, label: "Details", hint: "When & where" },
  { num: 3, label: "Who", hint: "Invites" },
] as const;

function addDays(base: string, days: number) {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(y!, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return toZonedDateStr(dt);
}

function mapCategoryToPlanType(cat: string, timeSlot: string): PlanType {
  if (cat === "coffee") return "catchup";
  if (cat === "food") return timeSlot === "morning" || timeSlot === "midday" ? "lunch" : "nightout";
  if (cat === "fitness" || cat === "nature") return "walk";
  if (cat === "nightlife") return "nightout";
  return "catchup";
}

function timeForSlot(slot: string): string {
  switch (slot) {
    case "morning":
      return "09:30";
    case "midday":
      return "12:30";
    case "afternoon":
      return "15:30";
    case "evening":
      return "18:30";
    case "night":
      return "20:30";
    default:
      return "18:00";
  }
}

export function PlanCreatePage() {
  const [, nav] = useLocation();
  const params = new URLSearchParams(useSearch());
  const { createPlan } = usePlans();
  const { user, authReady } = useAuth();
  const { today, city } = useLocalNow();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const people = listPeople();

  const rawIntent = params.get("intent") || params.get("prompt") || "";
  const solvedIntent = useMemo(() => {
    if (!rawIntent) return null;
    return solveAirPalIntent(rawIntent, { userLocationSuburb: city });
  }, [rawIntent, city]);

  const targetHandle = (params.get("with") || "").replace(/^@/, "") || undefined;
  const targetName = params.get("name") || undefined;
  const paramType = params.get("type") as PlanType | null;
  const bookingIdParam = params.get("bookingId") || undefined;
  const eventIdParam = params.get("eventId") || undefined;

  const initialType: PlanType =
    paramType && TEMPLATES.some((k) => k.id === paramType)
      ? paramType
      : solvedIntent
        ? mapCategoryToPlanType(solvedIntent.category, solvedIntent.timeSlot)
        : targetHandle
          ? "catchup"
          : "nightout";

  const [type, setType] = useState<PlanType>(initialType);
  const [title, setTitle] = useState(() => {
    if (params.get("title")) return params.get("title")!;
    if (solvedIntent?.title) return solvedIntent.title;
    if (targetHandle) {
      if (paramType === "meeting") return `Sync with ${targetName || `@${targetHandle}`}`;
      if (paramType === "nightout") return `Hangout with ${targetName || `@${targetHandle}`}`;
      return `Catch up with ${targetName || `@${targetHandle}`}`;
    }
    return "";
  });
  const [date, setDate] = useState(initialPlanDate(params.get("date"), today || toZonedDateStr(new Date())));
  const [time, setTime] = useState(() =>
    initialPlanTime(params.get("time"), solvedIntent ? timeForSlot(solvedIntent.timeSlot) : "18:00"),
  );
  const [place, setPlace] = useState(
    params.get("dest") || params.get("destination") || solvedIntent?.suburb || city || "The Rocks, Sydney",
  );
  const [placeGeo, setPlaceGeo] = useState<Geo | undefined>(() => {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  });
  const [isPublic, setIsPublic] = useState(false);
  const [hero, setHero] = useState<string | undefined>();
  const [invite, setInvite] = useState<Set<string>>(() => new Set(targetHandle ? [targetHandle] : []));
  const [peopleSearch, setPeopleSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Stepped flow: 0 (Plan Type) → 1 (Details: When & where) → 2 (Who: Invites).
  const [step, setStep] = useState<0 | 1 | 2>(
    targetHandle || solvedIntent || bookingIdParam || eventIdParam ? 1 : 0,
  );
  const guardRef = useRef(createSubmitGuard());

  const circle = useMemo(() => {
    const handles = circleHandles({
      following: followedHandles,
      followers: followerHandles,
      liked: likedHandles,
      likedBy: likedByHandles,
      met: new Set(people.map((p) => p.handle).filter((h): h is string => Boolean(h))),
    });
    const extra = targetHandle && !handles.includes(targetHandle) ? [targetHandle] : [];
    return [...extra, ...handles].map((h) => {
      const row = people.find((p) => p.handle === h);
      return { handle: h, name: h === targetHandle ? targetName || h : row?.name || h };
    });
  }, [followedHandles, followerHandles, likedHandles, likedByHandles, people, targetHandle, targetName]);

  const filteredCircle = useMemo(() => {
    if (!peopleSearch.trim()) return circle;
    const q = peopleSearch.toLowerCase().trim();
    return circle.filter((p) => p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q));
  }, [circle, peopleSearch]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    const qs = params.toString();
    return (
      <AuthGate
        next={qs ? `/plan/new?${qs}` : "/plan/new"}
        kicker="Plan"
        title="Plan with family and friends"
        lede="Sign in, pick a time and place, invite your Circle. Ticketed public nights are Create event."
      />
    );
  }

  function toggleInvite(handle: string) {
    void triggerHapticSelection();
    setInvite((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  function selectAllCircle() {
    void triggerHaptic("medium");
    setInvite(new Set(circle.map((p) => p.handle)));
  }

  function clearAllInvites() {
    void triggerHaptic("light");
    setInvite(new Set());
  }

  function pickType(id: PlanType) {
    void triggerHaptic("light");
    setType(id);
    if (
      !title.trim() ||
      title.startsWith("Catch up with") ||
      Object.values(PLAN_TYPES).some((t) => t.defaultTitle === title)
    ) {
      setTitle(targetHandle && id === "catchup" ? `Catch up with ${targetName || `@${targetHandle}`}` : "");
    }
    setStep(1);
  }

  async function create() {
    if (!guardRef.current.tryAcquire()) return;
    const name = title.trim() || PLAN_TYPES[type]?.defaultTitle || "Hangout";
    if (!date || (today && date < today)) {
      guardRef.current.release();
      toast.error("Pick a date from today on");
      return;
    }
    setBusy(true);
    void triggerHaptic("success");
    try {
      const created = createPlan({
        title: name,
        type,
        theme: type === "catchup" ? "emerald" : type === "meeting" ? "jetblack" : "gold",
        date,
        time,
        city: params.get("city") || city || "Sydney",
        destination: place.trim() || city || "Sydney",
        geo: placeGeo,
        heroImage: hero,
        isPublic,
        bookingId: bookingIdParam,
        eventId: eventIdParam,
        invited: circle
          .filter((p) => invite.has(p.handle))
          .map((p) => ({ id: `h-${p.handle}`, name: p.name, handle: p.handle })),
      });
      if (created?.id) {
        void triggerHaptic("success");
        nav(`/plan/${created.id}?share=true`);
      } else {
        guardRef.current.release();
        setBusy(false);
      }
    } catch (err) {
      void triggerHaptic("error");
      guardRef.current.release();
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Couldn’t create the plan");
    }
  }

  const stepMeta = [
    { title: "What are you planning?", sub: "Choose a plan template or activity" },
    { title: "Where & when?", sub: "Set your plan name, schedule & location" },
    { title: "Who's in?", sub: "Invite mates or generate your RSVP link" },
  ][step];

  const activeTemplate = TEMPLATES.find((t) => t.id === type) || TEMPLATES[0]!;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 pb-[max(8rem,calc(env(safe-area-inset-bottom,0px)+6rem))]">
      {/* Header & Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              if (step > 0) setStep((step - 1) as 0 | 1 | 2);
              else if (window.history.length > 1) window.history.back();
              else nav("/plan");
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line/80 shadow-2xs transition hover:bg-card hover:ring-brand/40 active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                Family & Friends
              </span>
              <span className="text-[10px] font-semibold text-mute">· Step {step + 1} of 3</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {stepMeta.title}
            </h1>
          </div>
        </div>

        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setStep(0);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line/70 transition hover:bg-card"
          >
            <activeTemplate.Icon size={14} className={activeTemplate.textColor} />
            <span>{activeTemplate.label}</span>
          </button>
        )}
      </div>

      <p className="mt-1 text-xs sm:text-sm text-mute leading-relaxed pl-13">
        {stepMeta.sub}
      </p>

      {/* Modern Interactive Liquid Glass Stepper */}
      <div className="mt-6 rounded-2xl bg-paper/60 p-2 border border-line/80 shadow-2xs">
        <ol className="flex items-center justify-between gap-2" aria-label="Creation Progress">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const isClickable = i <= step;

            return (
              <li key={s.label} className="flex flex-1" aria-current={current ? "step" : undefined}>
                <button
                  type="button"
                  disabled={!isClickable || i === step}
                  onClick={() => {
                    if (isClickable && i !== step) {
                      void triggerHaptic("light");
                      setStep(i as 0 | 1 | 2);
                    }
                  }}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-xl p-2 text-left transition-shadow duration-200",
                    current ? "bg-card shadow-xs ring-1 ring-brand/30" : "",
                    isClickable && i !== step ? "cursor-pointer hover:bg-card/70" : "cursor-default",
                    !isClickable && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-200",
                      done
                        ? "bg-emerald-500 text-white shadow-2xs"
                        : current
                          ? "bg-brand text-white shadow-sm ring-2 ring-brand/25"
                          : "bg-paper text-mute ring-1 ring-line/80",
                    )}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : s.num}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-xs font-bold",
                        current ? "text-accent" : done ? "text-ink" : "text-mute",
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="hidden truncate text-[10px] text-mute xs:block">{s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {targetHandle && step > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-brand/10 border border-brand/20 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white text-xs font-bold">
              @
            </span>
            <div>
              <p className="text-xs font-bold text-ink">
                Planning with {targetName || `@${targetHandle}`}
              </p>
              <p className="text-[11px] text-mute">Automatic invite will be attached</p>
            </div>
          </div>
          <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
            Connected
          </span>
        </div>
      )}

      {bookingIdParam && step > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold">
              <Ticket size={16} />
            </span>
            <div>
              <p className="text-xs font-bold text-ink">
                Planning around your AirPal Pass event
              </p>
              <p className="text-[11px] text-mute">Gate pass will be linked to this hangout thread</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            AirPal Pass
          </span>
        </div>
      )}

      {/* STEP 0: PLAN TEMPLATES */}
      {step === 0 && (
        <div className="mt-6 space-y-3 animate-in fade-in duration-200">
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickType(t.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-3xl border border-line/80 bg-gradient-to-br p-4 sm:p-5 text-left shadow-xs transition-shadow duration-200 hover:shadow-md active:scale-[0.99] cursor-pointer",
                    t.bgGrad,
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={cn(
                          "grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ring-black/5 shadow-2xs",
                          t.iconBg,
                        )}
                      >
                        <Icon size={24} strokeWidth={2.2} />
                      </span>
                      <span className="rounded-full bg-paper/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mute ring-1 ring-line/60">
                        {t.tag}
                      </span>
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-bold text-ink group-hover:text-accent transition-colors">
                      {t.label}
                    </h3>
                    <p className="mt-1 text-xs text-mute leading-relaxed">{t.desc}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-line/40 text-xs font-semibold text-accent">
                    <span>Start {t.label.split(" ")[0]}</span>
                    <ChevronRight
                      size={15}
                      className="opacity-60 transition-transform duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Highlighted Ticketed Public Event Card */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/event/new");
              }}
              className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-3xl border border-brand/35 bg-brand/10 p-5 text-left shadow-xs transition-shadow duration-200 hover:border-brand hover:shadow-md active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-md ring-4 ring-brand/20">
                  <Ticket size={24} className="rotate-[-10deg]" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-base sm:text-lg font-bold text-ink group-hover:text-accent transition-colors">
                      Ticketed Public Event
                    </span>
                    <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-2xs">
                      Sell Tickets
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-mute leading-relaxed">
                    Host a show, party, festival, market, or ticketed community gathering
                  </p>
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line text-accent transition-transform group-hover:translate-x-1 shadow-2xs">
                <ChevronRight size={18} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Solved Brain Intent Preview */}
      {solvedIntent && (
        <div className="mt-4 rounded-2xl bg-brand/5 p-4 ring-1 ring-brand/20 shadow-xs">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles size={16} className="shrink-0 motion-safe:animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">AirPal Brain Plan</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink">
            Tailored for {solvedIntent.suburb} ({solvedIntent.timeSlot})
          </p>
          <div className="mt-2 space-y-1.5">
            {solvedIntent.stops.map((stop, i) => (
              <div key={stop.id} className="flex items-start gap-2 text-xs text-mute">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                <span>
                  <strong className="text-ink">{stop.title}</strong> ({stop.suggestedDurationMins}m) — {stop.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: DETAILS (WHEN & WHERE) */}
      {step === 1 && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          {/* Plan Title & Suggestion Chips */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  1 · Plan Title
                </span>
                <span className="text-[11px] font-medium text-mute">Required</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={PLAN_TYPES[type]?.defaultTitle || "e.g. Friday drinks at The Rocks"}
                className={cn(fieldInput, "text-[16px] sm:text-base font-semibold py-3")}
              />
            </label>

            {/* Quick Title Suggestions */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-mute block mb-1.5">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(TITLE_SUGGESTIONS[type] || TITLE_SUGGESTIONS.catchup)!.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setTitle(sug);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium border transition active:scale-95",
                      title === sug
                        ? "bg-brand text-white border-brand font-semibold shadow-2xs"
                        : "bg-paper text-ink/80 border-line/80 hover:bg-card hover:border-brand/40",
                    )}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Schedule: When (Date & Time) */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Calendar size={14} />
                2 · Date & Time
              </span>
              <span className="text-[11px] font-semibold text-accent">
                {date ? formatPlanDate(date, time) : "Set Schedule"}
              </span>
            </div>

            {/* Quick Date Shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { label: "Today", value: today },
                { label: "Tomorrow", value: today ? addDays(today, 1) : "" },
                {
                  label: "This Friday",
                  value: today ? addDays(today, (5 - zonedWeekdayIndex(new Date()) + 7) % 7 || 7) : "",
                },
                {
                  label: "Saturday",
                  value: today ? addDays(today, (6 - zonedWeekdayIndex(new Date()) + 7) % 7 || 7) : "",
                },
                {
                  label: "Sunday",
                  value: today ? addDays(today, (7 - zonedWeekdayIndex(new Date()) + 7) % 7 || 7) : "",
                },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={!q.value}
                  onClick={() => {
                    if (q.value) {
                      void triggerHaptic("light");
                      setDate(q.value);
                    }
                  }}
                  className={cn(
                    "min-h-[44px] rounded-full px-3.5 text-xs font-semibold border transition active:scale-95 cursor-pointer",
                    date === q.value
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-paper text-ink/80 border-line/80 hover:bg-card hover:border-brand/40",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-mute mb-1">Calendar Date</label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldInput}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-mute mb-1">Meetup Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={fieldInput}
                />
              </div>
            </div>

            {/* Quick Time Slots */}
            <div className="mt-3 pt-3 border-t border-line/60">
              <span className="text-[11px] font-semibold text-mute block mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Quick Time Slots:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setTime(p.time);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs border transition active:scale-95",
                      time === p.time
                        ? "bg-brand text-white border-brand font-semibold shadow-2xs"
                        : "bg-paper text-ink/75 border-line/70 hover:bg-card",
                    )}
                  >
                    {p.label} ({p.time})
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Location: Where */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <MapPin size={14} />
                3 · Location & Venue
              </span>
              <span className="text-[11px] font-medium text-mute">Search or Pick</span>
            </div>

            <PlaceAddressField
              value={place}
              onChange={setPlace}
              onPick={(picked: PickedPlace) => {
                setPlace(picked.label);
                setPlaceGeo(picked.geo);
              }}
              placeholder={city || "Search Google Maps or Sydney venues"}
            />

            {/* Sydney Area Presets */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-mute block mb-1.5">
                Popular Sydney Neighborhoods:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SYDNEY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setPlace(preset);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs border transition active:scale-95",
                      place === preset
                        ? "bg-brand text-white border-brand font-semibold shadow-2xs"
                        : "bg-paper text-ink/75 border-line/70 hover:bg-card",
                    )}
                  >
                    {preset.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Cover artwork */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
            <PlanCoverPicker value={hero} onChange={setHero} />
          </section>

          {/* Details (optional): visibility lives here so the core flow stays minimal */}
          <section className="overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs">
            <button
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setShowDetails((v) => !v);
              }}
              aria-expanded={showDetails}
              className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 p-5 text-left active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wider text-accent">
                  Details · Optional
                </span>
                <span className="mt-0.5 block truncate text-xs text-mute">
                  {isPublic ? "Public discovery" : "Private · invite-only"}
                </span>
              </span>
              <ChevronDown
                size={18}
                className={cn("shrink-0 text-mute transition-transform", showDetails && "rotate-180")}
              />
            </button>
            {showDetails && (
              <div className="space-y-3 border-t border-line/60 p-5 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-accent block">
                  Privacy & Visibility
                </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setIsPublic(false);
                }}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-2xl p-3.5 border text-left transition active:scale-98 cursor-pointer",
                  !isPublic
                    ? "bg-brand/10 border-brand font-semibold shadow-xs ring-1 ring-brand/20"
                    : "bg-paper border-line/80 hover:bg-card text-mute",
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Lock size={14} className={!isPublic ? "text-accent" : "text-mute"} />
                  <span>Private / Invite-Only</span>
                </div>
                <p className="text-[11px] text-mute leading-tight">
                  Only people with the link or invited friends can see this plan.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setIsPublic(true);
                }}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-2xl p-3.5 border text-left transition active:scale-98 cursor-pointer",
                  isPublic
                    ? "bg-brand/10 border-brand font-semibold shadow-xs ring-1 ring-brand/20"
                    : "bg-paper border-line/80 hover:bg-card text-mute",
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Globe size={14} className={isPublic ? "text-accent" : "text-mute"} />
                  <span>Public Discovery</span>
                </div>
                <p className="text-[11px] text-mute leading-tight">
                  Discoverable on Sydney Explore and nearby hangouts.
                </p>
              </button>
            </div>
              </div>
            )}
          </section>

          {/* Next Button — sticky so the long details form keeps its way forward */}
          <div className="sticky bottom-24 z-10 rounded-2xl bg-card/95 p-2 ring-1 ring-line shadow-md backdrop-blur">
            <Button
              className="h-13 w-full gap-2 rounded-2xl text-sm font-bold shadow-md active:scale-98"
              onClick={() => {
                if (!date || (today && date < today)) {
                  toast.error("Pick a date from today on");
                  return;
                }
                void triggerHaptic("medium");
                setStep(2);
              }}
            >
              <span>Continue to Invites</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: WHO (INVITES & CONFIRMATION) */}
      {step === 2 && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          {/* Plan Preview Summary Card */}
          <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
            {hero && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper">
                <Photo src={hero} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-line/60">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                <activeTemplate.Icon size={14} className={activeTemplate.textColor} />
                {activeTemplate.label}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  isPublic ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 text-accent",
                )}
              >
                {isPublic ? "Public Plan" : "Private Plan"}
              </span>
            </div>

            <h3 className="mt-3 font-display text-xl font-bold text-ink">
              {title.trim() || PLAN_TYPES[type]?.defaultTitle || "Hangout"}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-medium text-mute">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} className="text-accent shrink-0" />
                {formatPlanDate(date, time)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-500 shrink-0" />
                {place || city || "Sydney"}
              </span>
            </div>
            </div>
          </div>

          {/* Circle & Friends Selection */}
          <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <Users size={14} />
                  Invite from Circle
                </p>
                <p className="text-[11px] text-mute">
                  Select friends to receive an instant push notification
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                {invite.size} selected
              </span>
            </div>

            {circle.length > 0 && (
              <>
                {/* Search / Filter Bar */}
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-paper px-3 py-2 border border-line/70">
                  <Search size={14} className="text-mute shrink-0" />
                  <input
                    type="text"
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Search circle by name or @handle…"
                    className="h-full flex-1 bg-transparent text-[16px] sm:text-xs text-ink outline-none placeholder:text-mute"
                  />
                  {peopleSearch && (
                    <button
                      type="button"
                      onClick={() => setPeopleSearch("")}
                      className="text-xs text-mute hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Select Buttons */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={selectAllCircle}
                    className="font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Select All ({circle.length})
                  </button>
                  {invite.size > 0 && (
                    <button
                      type="button"
                      onClick={clearAllInvites}
                      className="text-mute hover:text-ink cursor-pointer"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {/* Friend Selection List */}
                <div className="mt-2.5 max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {filteredCircle.map((p) => {
                    const selected = invite.has(p.handle);
                    return (
                      <button
                        key={p.handle}
                        type="button"
                        onClick={() => toggleInvite(p.handle)}
                        className={cn(
                          "flex min-h-[44px] w-full items-center justify-between rounded-2xl p-2.5 text-left border transition active:scale-[0.99] cursor-pointer",
                          selected
                            ? "bg-brand/10 border-brand font-semibold shadow-2xs"
                            : "bg-paper border-line/60 hover:bg-card",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-bold text-accent uppercase">
                            {p.name[0] || p.handle[0]}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-xs sm:text-[13px] text-ink font-semibold">
                              {p.name}
                            </span>
                            <span className="block truncate text-[11px] text-mute">@{p.handle}</span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
                            selected
                              ? "bg-brand border-brand text-white shadow-2xs"
                              : "border-line/80 bg-card text-transparent",
                          )}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {circle.length === 0 && (
              <div className="mt-3 rounded-2xl bg-paper/60 p-4 text-center border border-line/60">
                <p className="text-xs text-mute">
                  No friends in your Circle yet. Once created, you will get an instant shareable link and QR code!
                </p>
              </div>
            )}
          </section>

          {/* Instant Share Link Banner */}
          <div className="rounded-3xl border border-line/80 bg-paper/70 p-4 shadow-2xs flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
              <Share2 size={18} />
            </span>
            <div className="text-xs leading-relaxed text-ink/80">
              <span className="font-bold text-ink block mb-0.5">
                Instant RSVP Link & QR Code
              </span>
              Creating this plan generates a private link ready to copy and share directly to WhatsApp, Messages, or Instagram groups.
            </div>
          </div>

          {/* Primary Action Button */}
          <Button
            className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-lg shadow-brand/20 active:scale-98 cursor-pointer"
            disabled={busy}
            loading={busy}
            onClick={() => void create()}
          >
            <CalendarDays size={18} />
            <span>Create Plan & Get Invite Link</span>
          </Button>

          {/* Ticketed Public Event Shortcut */}
          <div className="pt-1">
            <button
              type="button"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/25 bg-brand/10 py-3 text-xs font-bold text-accent shadow-2xs transition-all hover:bg-brand/15 hover:border-brand/40 active:scale-[0.99] cursor-pointer"
              onClick={() => {
                void triggerHaptic("medium");
                nav("/event/new");
              }}
            >
              <Ticket size={16} className="rotate-[-10deg] text-accent" />
              <span>Organising a public event or selling tickets? Create Event →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
