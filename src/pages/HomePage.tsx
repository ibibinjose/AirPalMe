import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, MapPin, Plane, Ticket, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlans } from "@/contexts/PlanContext";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { discoverPlaces } from "@/lib/catalog";
import { useListings } from "@/contexts/ListingsContext";
import { hrefForPlace } from "@/lib/bio-handle";
import { formatPlanDate } from "@shared/plan";
import { Photo } from "@/components/ui/Photo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { DoorChooser } from "@/components/home/DoorChooser";
import { loadDoor, saveDoor } from "@/lib/door";
import {
  AirPalSearchField,
  ArrowCta,
  AvatarStack,
  CardShell,
  CategoryTile,
  PillRow,
  SectionHeader,
  greetingForHour,
} from "@/components/design-system/companions";

type AroundFilter = "events" | "food" | "todo" | "community";

const AROUND: { id: AroundFilter; label: string; color: string }[] = [
  { id: "events", label: "Events", color: "#e86a33" },
  { id: "food", label: "Food", color: "#d99a17" },
  { id: "todo", label: "Things to do", color: "#2b7cd3" },
  { id: "community", label: "Community", color: "#2fa866" },
];

export function HomePage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { myPlans, publicPlans } = usePlans();
  const { calendarEvents } = useEvents();
  const { city, here, today, now } = useLocalNow();
  const { version } = useListings();
  const [around, setAround] = useState<AroundFilter>("events");
  const [door, setDoor] = useState(() => loadDoor());

  const firstName = useMemo(() => {
    const n = user?.displayName?.trim().split(/\s+/)[0];
    return n || "traveller";
  }, [user]);

  const greeting = useMemo(() => {
    try {
      return greetingForHour(new Date(now || Date.now()).getHours());
    } catch {
      return "Good morning";
    }
  }, [now ]);

  const nextTrip = useMemo(
    () =>
      myPlans
        .filter((p) => p.date >= today && p.status !== "completed")
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [myPlans, today],
  );

  const places = useMemo(
    () => discoverPlaces(here, city, "city").slice(0, 8),
    [here, city, version],
  );

  const tonightEvents = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [calendarEvents, today],
  );

  const forYou = useMemo(() => publicPlans.slice(0, 3), [publicPlans]);

  // First-run job, preserved from What's on: three doors, pick one.
  if (!door) {
    return (
      <DoorChooser
        onPick={(id) => {
          saveDoor(id);
          setDoor(id);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
      {/* Header — Sydney harbour backdrop, personal not a dashboard */}
      <header className="relative -mx-4 overflow-hidden rounded-b-[28px] md:-mx-6">
        <div className="absolute inset-0" aria-hidden="true">
          <Photo src="/media/harbour.jpg" priority className="h-full w-full object-cover" alt="" />
          <div className="hero-scrim absolute inset-0" />
        </div>
        <div className="relative px-4 pb-6 pt-10 md:px-6 md:pt-14">
          <p className="text-[13px] font-semibold text-white/85">
            {greeting}, {firstName}
          </p>
          <h1 className="font-display mt-1 text-[34px] font-bold leading-[1.02] tracking-tight text-white">
            What&apos;s on
          </h1>
          <p className="mt-1 text-[14px] font-medium text-white/80">{city}</p>
          <div className="mt-4">
            <AirPalSearchField placeholder="Where are you going?" />
          </div>
        </div>
      </header>

      {/* Continue your journey */}
      <section aria-label="Continue your journey" className="mt-6">
        <SectionHeader title="Continue your journey" actionLabel="See all" actionHref="/plan" />
        {nextTrip ? (
          <CardShell
            href={`/plan/${nextTrip.id}`}
            label={`View trip ${nextTrip.title}`}
            className="group mt-2 rounded-[28px]"
          >
            <div className="relative min-h-[240px]">
              <Photo
                src={nextTrip.heroImage || "/media/walk.jpg"}
                priority
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="hero-scrim absolute inset-0" />
              <div className="absolute left-4 top-4 right-4">
                <p className="font-display text-[22px] font-bold leading-tight text-white">
                  Trip to {nextTrip.destination || nextTrip.title}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-white/85">
                  {formatPlanDate(nextTrip.date, nextTrip.time)}
                  {(nextTrip.attendees?.length || nextTrip.stops?.length)
                    ? ` · ${[
                        nextTrip.attendees?.length
                          ? `${nextTrip.attendees.length} ${nextTrip.attendees.length === 1 ? "traveller" : "travellers"}`
                          : "",
                        nextTrip.stops?.length
                          ? `${nextTrip.stops.length} ${nextTrip.stops.length === 1 ? "stop" : "stops"}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}`
                    : ""}
                </p>
              </div>
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                <AvatarStack names={(nextTrip.attendees || []).map((a) => a.name)} />
                <ArrowCta />
              </div>
            </div>
          </CardShell>
        ) : (
          <div className="mt-2">
            <EmptyState
              kicker="Trips"
              title="No trip yet."
              body="A plan keeps the people, the place, and the time together."
              action={() => nav("/plan/new")}
              actionLabel="Plan a Trip"
            />
          </div>
        )}
      </section>

      {/* AirPal's four primary entry points — soft, sophisticated colour coding */}
      <nav aria-label="Quick actions" className="mt-6 grid grid-cols-4 gap-2.5">
        <CategoryTile icon={MapPin} label="Places" href="/explore" tint="#e3f0fd" fg="#2b7cd3" />
        <CategoryTile icon={Ticket} label="Events" href="/calendar" tint="#fdeadd" fg="#e86a33" />
        <CategoryTile icon={Plane} label="Plan" href="/plan" tint="#fdf0d3" fg="#d99a17" />
        <CategoryTile icon={Users} label="People" href="/mate" tint="#e2f5e5" fg="#2fa866" />
      </nav>

      {/* What's on near you */}
      <section aria-label="What's on near you" className="mt-8">
        <SectionHeader title="Nearby" actionLabel="See all" actionHref="/explore" />
        <div className="mt-3">
          <PillRow options={AROUND} value={around} onChange={setAround} label="What's on categories" />
        </div>
        {around === "community" ? (
          <CardShell href="/club" label="Open communities" className="mt-3 p-5">
            <p className="font-display text-[18px] font-semibold">Communities around movement</p>
            <p className="mt-1 text-[14px] text-mute">
              Foodies, travellers and locals planning things together — not another social network.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-brand">
              Explore communities <ArrowRight size={15} />
            </span>
          </CardShell>
        ) : around === "events" ? (
          tonightEvents.length > 0 ? (
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 no-scrollbar md:mx-0 md:px-0">
              {tonightEvents.map((e) => {
                const day = new Date(`${e.date}T00:00:00`);
                const dayNum = Number.isNaN(day.getTime()) ? "" : String(day.getDate());
                const month = Number.isNaN(day.getTime())
                  ? ""
                  : day.toLocaleString(undefined, { month: "short" });
                return (
                <CardShell key={e.id} href={e.gatePath || `/e/${e.id}`} label={e.title} className="w-64 shrink-0 snap-start">
                  <div className="relative aspect-square overflow-hidden bg-paper">
                    <Photo
                      src={e.heroImage || "/media/laneway.jpg"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="hero-scrim absolute inset-0" />
                    {dayNum && (
                      <span className="absolute left-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-2xl bg-card/95 px-2 py-1 text-center shadow-sm">
                        <span>
                          <span className="font-display block text-[16px] font-bold leading-none text-ink">
                            {dayNum}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-brand">
                            {month}
                          </span>
                        </span>
                      </span>
                    )}
                    <p className="absolute bottom-2 left-3 right-3 font-display text-[17px] font-bold leading-tight text-white">
                      {e.title}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-medium text-mute">
                      {e.timeLabel}
                      {e.venue ? ` · ${e.venue}` : e.city ? ` · ${e.city}` : ""}
                    </p>
                  </div>
                </CardShell>
                );
              })}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                title="Nothing on tonight."
                body="Check the full calendar for what's coming up near you."
                action={() => nav("/calendar")}
                actionLabel="Open calendar"
              />
            </div>
          )
        ) : places.length > 0 ? (
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 no-scrollbar md:mx-0 md:px-0">
            {places.map((p) => (
              <CardShell key={p.id} href={hrefForPlace(p)} label={p.name} className="w-64 shrink-0 snap-start">
                <div className="relative aspect-square overflow-hidden bg-paper">
                  <Photo
                    src={p.heroImage || p.photos?.[0] || "/media/harbour.jpg"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="hero-scrim absolute inset-0" />
                  <p className="absolute bottom-2 left-3 right-3 font-display text-[17px] font-bold leading-tight text-white">
                    {p.name}
                  </p>
                </div>
                <div className="p-3">
                  <p className="flex items-center gap-1 truncate text-[13px] text-mute">
                    <MapPin size={12} /> {p.shortWhy || city || "Nearby"}
                  </p>
                </div>
              </CardShell>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="Nothing nearby yet."
              body="Explore places, stays and experiences across the city."
              action={() => nav("/explore")}
              actionLabel="Explore"
            />
          </div>
        )}
      </section>

      {/* For You — intelligence without configuration */}
      <section aria-label="For you" className="mt-8">
        <SectionHeader title="For you" actionLabel="Explore" actionHref="/explore" />
        {forYou.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {forYou.map((p) => (
              <li key={p.id}>
                <CardShell href={`/plan/${p.id}`} label={p.title} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper">
                      <Photo
                        src={p.heroImage || "/media/walk.jpg"}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                        Because you&apos;re {p.city ? `near ${p.city}` : "exploring"}
                      </p>
                      <p className="font-display mt-0.5 truncate text-[17px] font-semibold">{p.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-mute">
                        {formatPlanDate(p.date, p.time)}
                        {p.destination ? ` · ${p.destination}` : ""}
                      </p>
                    </div>
                  </div>
                </CardShell>
              </li>
            ))}
          </ul>
        ) : (
          <CardShell className="mt-3 p-5">
            <p className="font-display text-[18px] font-semibold">Quiet for now.</p>
            <p className="mt-1 text-[14px] text-mute">
              As you plan and save, AirPal will surface things worth your time here.
            </p>
            <div className="mt-4">
              <Button size="sm" onClick={() => nav("/explore")}>
                Review suggestions
              </Button>
            </div>
          </CardShell>
        )}
      </section>

      {/* Moments preview — travel/context driven, not a selfie feed */}
      <section aria-label="Moments" className="mt-8">
        <SectionHeader title="Moments" actionLabel="Open Circle" actionHref="/circle" />
        <CardShell href="/me/memories" label="Open your moments" className="mt-3 overflow-hidden p-0">
          <div className="relative h-32">
            <Photo src="/media/campus.jpg" className="absolute inset-0 h-full w-full object-cover" />
            <div className="hero-scrim absolute inset-0" />
            <p className="absolute bottom-2.5 left-4 right-4 font-display text-[18px] font-bold leading-tight text-white">
              Weekends worth repeating
            </p>
          </div>
          <div className="p-5">
            <p className="text-[14px] leading-6 text-mute">
              Travel moments answer <span className="font-semibold text-ink">where, when, what, who</span> —
              a café worth the detour, a weekend worth repeating.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-brand">
              Share a Moment <ArrowRight size={15} />
            </span>
          </div>
        </CardShell>
      </section>
    </div>
  );
}
