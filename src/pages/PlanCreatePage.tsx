import { useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Coffee,
  Footprints,
  Ticket,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { createSubmitGuard } from "@/lib/submit-guard";
import { AuthGate } from "@/components/auth/AuthGate";
import { fieldInput } from "@/components/forms/ValidField";
import { ImageField } from "@/components/media/ImageField";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useSocial } from "@/contexts/SocialContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { toZonedDateStr, zonedWeekdayIndex } from "@/lib/local-time";
import { listPeople } from "@/lib/people";
import { circleHandles } from "@/lib/circle";
import { triggerHaptic } from "@/lib/native";
import { PLAN_TYPES, type PlanType } from "@shared/plan";
import { cn } from "@/lib/cn";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import type { Geo } from "@shared/nearby";

const KINDS: Array<{ id: PlanType; label: string }> = [
  { id: "catchup", label: "Catch up" },
  { id: "meeting", label: "Meeting" },
  { id: "lunch", label: "Lunch" },
  { id: "nightout", label: "Hangout" },
  { id: "walk", label: "Walk" },
];

/** Podz-style template cards: one tappable card per plan kind. */
const TEMPLATES: Array<{ id: PlanType; label: string; desc: string; Icon: typeof Coffee }> = [
  { id: "catchup", label: "Catch up", desc: "Coffee, dinner, or just because.", Icon: Coffee },
  { id: "nightout", label: "Hangout", desc: "A night out with your people.", Icon: Users },
  { id: "lunch", label: "Lunch", desc: "Midday break, together.", Icon: UtensilsCrossed },
  { id: "walk", label: "Walk", desc: "Fresh air and good company.", Icon: Footprints },
  { id: "meeting", label: "Meeting", desc: "Work sync or side project.", Icon: Briefcase },
];

const STEPS = ["Plan", "Details", "Who"] as const;

function addDays(base: string, days: number) {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(y!, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return toZonedDateStr(dt);
}

export function PlanCreatePage() {
  const [, nav] = useLocation();
  const params = new URLSearchParams(useSearch());
  const { createPlan } = usePlans();
  const { user, authReady } = useAuth();
  const { today, city } = useLocalNow();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const people = listPeople();

  const targetHandle = (params.get("with") || "").replace(/^@/, "") || undefined;
  const targetName = params.get("name") || undefined;
  const paramType = params.get("type") as PlanType | null;
  const initialType: PlanType =
    paramType && KINDS.some((k) => k.id === paramType) ? paramType : targetHandle ? "catchup" : "nightout";

  const [type, setType] = useState<PlanType>(initialType);
  const [title, setTitle] = useState(() => {
    if (params.get("title")) return params.get("title")!;
    if (targetHandle) {
      if (paramType === "meeting") return `Sync with ${targetName || `@${targetHandle}`}`;
      if (paramType === "nightout") return `Hangout with ${targetName || `@${targetHandle}`}`;
      return `Catch up with ${targetName || `@${targetHandle}`}`;
    }
    return "";
  });
  const [date, setDate] = useState(today || toZonedDateStr(new Date()));
  const [time, setTime] = useState("18:00");
  const [place, setPlace] = useState(params.get("dest") || params.get("destination") || city || "The Rocks, Sydney");
  const [placeGeo, setPlaceGeo] = useState<Geo | undefined>();
  const [isPublic, setIsPublic] = useState(false);
  const [hero, setHero] = useState<string | undefined>();
  const [invite, setInvite] = useState<Set<string>>(() => new Set(targetHandle ? [targetHandle] : []));
  const [busy, setBusy] = useState(false);
  // Stepped Podz-style flow: template → details → who. A prefilled invite
  // (?with=) skips straight to details.
  const [step, setStep] = useState<0 | 1 | 2>(targetHandle ? 1 : 0);
  // Synchronous double-tap guard: state-based `busy` only disables the
  // button after a re-render, so two rapid taps could create two plans.
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
    setInvite((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
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
        invited: circle
          .filter((p) => invite.has(p.handle))
          .map((p) => ({ id: `h-${p.handle}`, name: p.name, handle: p.handle })),
      });
      if (created?.id) nav(`/plan/${created.id}?share=true`);
      else {
        guardRef.current.release();
        setBusy(false);
      }
    } catch (err) {
      guardRef.current.release();
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Couldn’t create the plan");
    }
  }

  const stepTitles = ["What are you planning?", "Where & when?", "Who's in?"] as const;

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-28">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (step > 0) setStep((step - 1) as 0 | 1 | 2);
            else if (window.history.length > 1) window.history.back();
            else nav("/plan");
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[13px] font-semibold text-mute">Family & friends</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">{stepTitles[step]}</h1>
        </div>
      </div>

      {/* Podz-style stepper: Plan → Details → Who */}
      <ol className="mt-4 flex items-center gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 last:flex-none">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  done || current ? "bg-brand text-white" : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={cn("text-[12px] font-semibold", current ? "text-ink" : "text-mute")}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {targetHandle && step > 0 && (
        <p className="mt-4 rounded-[16px] bg-paper px-4 py-3 text-[15px]">
          With <span className="font-semibold">{targetName || `@${targetHandle}`}</span>
        </p>
      )}

      {step === 0 && (
        <div className="mt-6 space-y-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t.id)}
              className="flex w-full items-center gap-3 rounded-[28px] bg-card p-4 text-left ring-1 ring-line shadow-xs transition hover:ring-brand/40 active:scale-[0.99]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                <t.Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-ink">{t.label}</span>
                <span className="block truncate text-[13px] text-mute">{t.desc}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-mute" />
            </button>
          ))}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 pt-2 text-[15px] font-medium text-mute"
            onClick={() => nav("/event/new")}
          >
            <Ticket size={14} /> Ticketed public event
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-7">
          <section aria-label="Title">
          <label className="block">
            <span className="text-[13px] font-semibold text-mute">What</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={PLAN_TYPES[type]?.defaultTitle || "Friday drinks"}
              className={`${fieldInput} mt-1`}
            />
          </label>
          </section>

        <section aria-label="Step 2: when and where">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">2 · When & where</p>
          <div className="mt-2">
            <span className="text-[13px] font-semibold text-mute">When</span>
          <div className="mt-1.5 flex gap-1.5">
            {[
              { label: "Today", value: today },
              { label: "Tomorrow", value: today ? addDays(today, 1) : "" },
              { label: "Friday", value: today ? addDays(today, (5 - zonedWeekdayIndex(new Date()) + 7) % 7 || 7) : "" },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={!q.value}
                onClick={() => q.value && setDate(q.value)}
                className={cn(
                  "h-8 rounded-full px-3 text-[12px] font-semibold",
                  date === q.value ? "bg-brand text-white" : "bg-paper text-ink",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={fieldInput}
            />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldInput} />
          </div>
        </div>

        <PlaceAddressField
          value={place}
          onChange={setPlace}
          onPick={(picked: PickedPlace) => {
            setPlace(picked.label);
            setPlaceGeo(picked.geo);
          }}
          placeholder={city || "Search Google Maps"}
        />
        </section>

        <ImageField kind="square" folder="listings" label="Photo (optional — change anytime)" value={hero} onChange={setHero} />

        <label className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-5 w-5 accent-[#1805db]"
          />
          <span className="text-[15px]">Anyone nearby can join</span>
        </label>

        <Button className="h-12 w-full" onClick={() => setStep(2)}>
          Continue
        </Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-7">
        {circle.length > 0 && (
          <section aria-label="Step 3: who">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Who&apos;s in? <span className="font-medium normal-case text-mute">— optional, add later anytime</span></p>
            <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-mute">
              <Users size={14} /> Invite
            </p>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {circle.slice(0, 16).map((p) => {
                const on = invite.has(p.handle);
                return (
                  <li key={p.handle}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleInvite(p.handle)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-[15px]",
                        on ? "bg-brand/10 font-semibold" : "bg-paper",
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[12px] text-mute">@{p.handle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <Button className="h-12 w-full" disabled={busy} loading={busy} onClick={() => void create()}>
          <CalendarDays size={16} /> Create plan
        </Button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 text-[15px] font-medium text-mute"
          onClick={() => nav("/event/new")}
        >
          <Ticket size={14} /> Ticketed public event
        </button>
        </div>
      )}
    </div>
  );
}
