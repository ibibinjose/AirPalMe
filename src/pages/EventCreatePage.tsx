import { useEffect, useState, type FormEvent } from "react";
import { currencyForCity } from "@/lib/cities";
import { useLocation, useSearch } from "wouter";
import { Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { ImageField } from "@/components/media/ImageField";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { toZonedDateStr } from "@/lib/local-time";
import { shareContent } from "@/lib/share";
import { planInviteCodeUrl } from "@shared/plan";
import { cn } from "@/lib/cn";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import { toPublicUrl } from "@/lib/public-origin";
import type { Geo } from "@shared/nearby";

const KINDS = [
  { id: "event", label: "Event", hint: "A night, market, or gathering" },
  { id: "experience", label: "Experience", hint: "A class, tour, or hosted session" },
] as const;

export function EventCreatePage() {
  const [, nav] = useLocation();
  const params = new URLSearchParams(useSearch());
  const { user, authReady } = useAuth();
  const { createPlan } = usePlans();
  const { today, city } = useLocalNow();

  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>(
    params.get("kind") === "experience" ? "experience" : "event",
  );
  const [title, setTitle] = useState("");
  const [hero, setHero] = useState<string | undefined>();
  const [date, setDate] = useState(today || toZonedDateStr(new Date()));
  const [time, setTime] = useState("18:00");
  const [place, setPlace] = useState("");
  const [placeGeo, setPlaceGeo] = useState<Geo | undefined>();
  const [paid, setPaid] = useState(true);
  const [price, setPrice] = useState("25");
  const [capacity, setCapacity] = useState("40");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (city && city !== "Choose a city" && city !== "Current location") {
      setPlace((p) => p || city);
    }
  }, [city]);

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }
  if (!user) {
    return (
      <AuthGate
        next="/event/new"
        kicker="Event"
        title="Create an event"
        lede="Public nights and ticketed shows. Planning with family? That’s Create plan."
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (name.length < 3) {
      toast.error("Give it a name");
      return;
    }
    if (!date || date < (today || date)) {
      toast.error("Pick a date from today on");
      return;
    }
    const priceAud = paid ? Number(price.replace(/[^0-9.]/g, "")) : 0;
    const cap = paid ? Math.floor(Number(capacity.replace(/[^0-9]/g, ""))) : 0;
    if (paid && (!Number.isFinite(priceAud) || priceAud <= 0)) {
      toast.error("Enter a ticket price, or switch to Free");
      return;
    }
    if (paid && (!Number.isFinite(cap) || cap < 1 || cap > 2000)) {
      toast.error("How many tickets can you sell?");
      return;
    }
    setBusy(true);
    try {
      const isExperience = kind === "experience" || paid;
      const plan = createPlan({
        title: name,
        type: kind === "experience" ? "custom" : "nightout",
        theme: "gold",
        date,
        time,
        city: (place.trim() || city || "").replace(/^Choose a city$/i, "") || "Current location",
        destination: place.trim() || city || "Nearby",
        geo: placeGeo,
        heroImage: hero,
        notes: notes.trim() || undefined,
        isPublic,
        isExperience,
        experienceCategory: kind === "experience" ? "workshop" : "social",
        pricingModel: paid ? "fixed" : "free",
        pricePerPerson: paid ? priceAud : 0,
        currency: currencyForCity(place || city),
        capacity: paid ? cap : undefined,
      });
      const url = planInviteCodeUrl(plan.inviteCode, toPublicUrl("/").replace(/\/$/, ""));
      await shareContent({
        title: name,
        text: paid ? `${name} — $${priceAud} · ${date}` : `${name} — free · ${date}`,
        url,
        copiedMessage: "Invite link copied",
      });
      nav(`/plan/${plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t create it");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-28">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Ticketed</p>
      <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">Create an event</h1>
      <p className="mt-1 text-sm text-mute">
        A public night, market, or paid show. Family hangouts stay on Create plan.
      </p>

      <form className="mt-5 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left",
                kind === k.id ? "border-brand bg-brand text-white" : "border-line bg-card",
              )}
            >
              <span className="block text-sm font-bold">{k.label}</span>
              <span className={cn("mt-0.5 block text-[11px]", kind === k.id ? "text-white/80" : "text-mute")}>
                {k.hint}
              </span>
            </button>
          ))}
        </div>

        <ImageField kind="square" folder="listings" value={hero} onChange={setHero} />

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute">Name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "experience" ? "Harbour pasta class" : "Friday at The Glenmore"}
            className={fieldInput}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Date</span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={fieldInput}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-mute">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldInput} />
          </label>
        </div>

        <PlaceAddressField
          value={place}
          onChange={setPlace}
          onPick={(picked: PickedPlace) => {
            setPlace(picked.label);
            setPlaceGeo(picked.geo);
          }}
          placeholder={city && city !== "Choose a city" ? city : "Search Google Maps"}
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mute">Tickets</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={!paid}
              onClick={() => setPaid(false)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-sm font-bold",
                !paid ? "border-brand bg-brand text-white" : "border-line bg-card",
              )}
            >
              Free
            </button>
            <button
              type="button"
              aria-pressed={paid}
              onClick={() => setPaid(true)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-sm font-bold",
                paid ? "border-brand bg-brand text-white" : "border-line bg-card",
              )}
            >
              Paid
            </button>
          </div>
          {paid && (
            <label className="mt-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                Price per person ({currencyForCity(place || city)})
              </span>
              <div className="relative">
                <Ticket size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${fieldInput} pl-9`}
                  placeholder="25"
                />
              </div>
              <p className="mt-1 text-[12px] text-mute">
                Guests pay by card on AirPal. Your share is sent after you mark tickets delivered.
              </p>
            </label>
          )}
          {paid && (
            <label className="mt-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-mute">Tickets for sale</span>
              <div className="relative">
                <Users size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  inputMode="numeric"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className={`${fieldInput} pl-9`}
                  placeholder="40"
                />
              </div>
            </label>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute">About (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={fieldTextarea}
            placeholder="What to bring, who it’s for…"
          />
        </label>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#1805db]"
          />
          <span>Show in Explore so people nearby can join</span>
        </label>

        <Button type="submit" className="h-12 w-full" disabled={busy} loading={busy}>
          <Ticket size={16} />
          {paid ? "Create ticketed event" : "Create public event"}
        </Button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 text-sm font-medium text-mute"
          onClick={() => nav("/plan/new")}
        >
          <Users size={14} /> Plan with family and friends
        </button>
      </form>
    </div>
  );
}
