import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, RefreshCw } from "lucide-react";
import { useListings } from "@/contexts/ListingsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { discoverPlaces } from "@/lib/catalog";
import { zonedWeekdayIndex } from "@/lib/local-time";
import { NOW_MOODS, NOW_WHENS, pickSuggestion, type NowMood, type NowWhen } from "@/lib/now-suggest";
import { nowPlanHref } from "@/lib/now-plan";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

type NowCompany = "solo" | "group";

const COMPANIES: Array<{ id: NowCompany; label: string }> = [
  { id: "solo", label: "Solo" },
  { id: "group", label: "With others" },
];

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.id)}
              className={cn(
                "min-h-[44px] cursor-pointer rounded-full px-4 text-[15px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                selected ? "bg-brand text-white" : "bg-card text-ink ring-1 ring-line",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function openLabel(open: boolean | null, when: NowWhen): string {
  if (open === true) return when === "now" ? "Open now" : "Open tonight";
  if (open === false) return "Closed now";
  return "Hours unknown";
}

export function NowPage() {
  const { here, city, now, today, time, day, timeZone, usingGps } = useLocalNow();
  const { version, remoteLoaded } = useListings();
  const [, navigate] = useLocation();
  const [mood, setMood] = useState<NowMood>("any");
  const [when, setWhen] = useState<NowWhen>("now");
  const [company, setCompany] = useState<NowCompany>("solo");
  const [excluded, setExcluded] = useState<string[]>([]);

  const pool = useMemo(() => discoverPlaces(here, city, usingGps ? "around" : "city"), [here, city, usingGps, version]);

  const weekday = zonedWeekdayIndex(now, timeZone);
  const suggestion = useMemo(
    () => pickSuggestion(pool, { mood, when, now, timeZone, weekday, excludeIds: excluded }),
    [pool, mood, when, now, timeZone, weekday, excluded],
  );

  const selectMood = (id: NowMood) => {
    setMood(id);
    setExcluded([]);
  };
  const selectWhen = (id: NowWhen) => {
    setWhen(id);
    setExcluded([]);
  };
  const showAnything = () => {
    setMood("any");
    setExcluded([]);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-mute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">What now?</h1>
      <p className="mt-1 text-[15px] text-mute">
        {day} · {time} · {city}
      </p>

      <div className="mt-5 space-y-5 rounded-[28px] bg-card p-5 ring-1 ring-line">
        <ChipGroup label="What are you in the mood for?" options={NOW_MOODS} value={mood} onChange={selectMood} />
        <ChipGroup label="When?" options={NOW_WHENS} value={when} onChange={selectWhen} />
        <div>
          <ChipGroup label="Who with?" options={COMPANIES} value={company} onChange={setCompany} />
          <p className="mt-2 text-xs text-mute">Invites arrive with the plan thread.</p>
        </div>
      </div>

      <div className="mt-4" aria-live="polite">
        {!remoteLoaded ? (
          <div className="rounded-[28px] bg-card px-5 py-8 text-center ring-1 ring-line">
            <span
              className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"
              aria-hidden
            />
            <p className="mt-3 text-[15px] text-mute">Finding something near you…</p>
          </div>
        ) : suggestion ? (
          <article className="rounded-[28px] bg-card p-5 ring-1 ring-line sm:p-6">
            <p
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                suggestion.open === true && "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30",
                suggestion.open === null && "bg-black/[0.04] text-mute ring-line",
                suggestion.open === false && "bg-rose-500/10 text-rose-700 ring-rose-500/30",
              )}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {openLabel(suggestion.open, when)}
            </p>
            <h2 className="font-display mt-2 text-balance text-2xl font-bold tracking-tight text-ink">
              {suggestion.place.name}
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-mute">{suggestion.place.shortWhy}</p>
            {suggestion.reasons.length > 0 ? (
              <p className="mt-2 text-sm font-medium text-ink">Why this: {suggestion.reasons.join(" · ")}</p>
            ) : null}
            {suggestion.place.hours ? <p className="mt-1 text-sm text-mute">Hours: {suggestion.place.hours}</p> : null}
            {suggestion.place.address ? <p className="mt-1 text-sm text-mute">{suggestion.place.address}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  navigate(
                    nowPlanHref({
                      mood,
                      when,
                      placeName: suggestion.place.name,
                      address: suggestion.place.address,
                      city,
                      date: today,
                      now,
                      geo: suggestion.place.geo,
                    }),
                  )
                }
              >
                Make it a plan
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button variant="ghost" onClick={() => setExcluded((prev) => [...prev, suggestion.place.id])}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Show another
              </Button>
            </div>
          </article>
        ) : pool.length === 0 ? (
          <EmptyState
            kicker={city}
            title="No places nearby yet"
            body="AirPal is still mapping this area. Try Explore for stays and guides."
            action={() => navigate("/explore")}
            actionLabel="Open Explore"
          />
        ) : (
          <EmptyState
            kicker="No match"
            title="Nothing for that mood"
            body={`No ${mood === "any" ? "places" : (NOW_MOODS.find((m) => m.id === mood)?.label.toLowerCase() ?? "places")} spots ${when === "now" ? "open right now" : "open tonight"} nearby.`}
            action={showAnything}
            actionLabel="Show anything"
            secondary={() => navigate("/explore")}
            secondaryLabel="Open Explore"
          />
        )}
      </div>
    </div>
  );
}
