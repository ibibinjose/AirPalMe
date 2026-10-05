import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Compass,
  Footprints,
  MapPin,
  Navigation,
  RefreshCw,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import { useListings } from "@/contexts/ListingsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { discoverPlaces } from "@/lib/catalog";
import { zonedWeekdayIndex } from "@/lib/local-time";
import { NOW_MOODS, NOW_WHENS, pickSuggestion, type NowMood, type NowWhen } from "@/lib/now-suggest";
import { nowPlanHref } from "@/lib/now-plan";
import { mapsPlaceUrl } from "@/lib/maps";
import { bioPath } from "@shared/bio";
import { PLACE_CATEGORY_LABELS } from "@shared/nearby";
import { shareContent } from "@/lib/share";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Photo } from "@/components/ui/Photo";
import { LocationSheet } from "@/components/layout/LocationSheet";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type NowCompany = "solo" | "group";

const COMPANIES: Array<{ id: NowCompany; label: string; icon: string }> = [
  { id: "solo", label: "Solo", icon: "👤" },
  { id: "group", label: "With others", icon: "👥" },
];

const MOOD_ICONS: Record<NowMood, string> = {
  coffee: "☕",
  eat: "🍽️",
  see: "🏛️",
  shop: "🛍️",
  any: "✨",
};

const WHEN_ICONS: Record<NowWhen, string> = {
  now: "⚡",
  tonight: "🌙",
};

function ChipGroup<T extends string>({
  label,
  step,
  options,
  value,
  icons,
  onChange,
}: {
  label: string;
  step?: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  icons?: Record<T, string>;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="flex items-center gap-2 text-sm font-semibold text-ink">
        {step ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
            {step}
          </span>
        ) : null}
        <span>{label}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.id === value;
          const icon = icons ? icons[opt.id] : undefined;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                void triggerHapticSelection();
                onChange(opt.id);
              }}
              className={cn(
                "group relative inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium transition active:scale-[0.97] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                selected
                  ? "bg-brand text-white shadow-xs"
                  : "bg-card text-ink ring-1 ring-line/80 hover:bg-paper active:bg-paper/70",
              )}
            >
              {icon ? (
                <span aria-hidden="true" className={cn("text-sm", selected ? "opacity-100" : "opacity-75")}>
                  {icon}
                </span>
              ) : null}
              <span>{opt.label}</span>
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
  const [locationPicker, setLocationPicker] = useState(false);

  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const pool = useMemo(
    () => discoverPlaces(here, effectiveCity, usingGps ? "around" : "city"),
    [here, effectiveCity, usingGps, version],
  );

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

  const handleShowAnother = () => {
    void triggerHapticSelection();
    if (!suggestion) return;
    const nextExcluded = [...excluded, suggestion.place.id];
    const nextPick = pickSuggestion(pool, {
      mood,
      when,
      now,
      timeZone,
      weekday,
      excludeIds: nextExcluded,
    });
    if (nextPick) {
      setExcluded(nextExcluded);
    } else {
      // Smoothly cycle back to first candidate instead of dead empty
      setExcluded([]);
    }
  };

  const handleShareSuggestion = async () => {
    if (!suggestion) return;
    await shareContent({
      title: `${suggestion.place.name} on AirPal`,
      text: `${suggestion.place.name} · ${suggestion.place.shortWhy}`,
      url: window.location.href,
      dialogTitle: `Share ${suggestion.place.name}`,
      copiedMessage: "Link copied to clipboard",
    });
  };

  const placeImg = suggestion?.place.heroImage || suggestion?.place.photos?.[0] || "/media/harbour.jpg";
  const venueBioUrl = suggestion ? bioPath(suggestion.place.handle || suggestion.place.id) : undefined;
  const mapsUrl = suggestion ? mapsPlaceUrl(suggestion.place.geo, suggestion.place.name) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-6">
      <LocationSheet open={locationPicker} onClose={() => setLocationPicker(false)} />

      {/* Ambient Top Controls */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-mute transition hover:bg-card hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>Home</span>
        </Link>

        {/* Live device context pill — tap to change city */}
        <button
          type="button"
          onClick={() => {
            void triggerHapticSelection();
            setLocationPicker(true);
          }}
          className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-xs transition hover:bg-paper active:scale-95 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          title="Change location or precinct"
          aria-label={`Location: ${effectiveCity}. Tap to change.`}
        >
          <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden />
          <span className="font-semibold text-ink">{effectiveCity}</span>
          <span className="text-mute">·</span>
          <span className="text-mute">
            {day} {time}
          </span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/20">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          <span>Instant Hangout</span>
        </div>
        <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What now?</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-mute">
          Three quick questions. We&apos;ll pick one real nearby spot and assemble your plan.
        </p>
      </div>

      {/* 3-Question Composer Card */}
      <div className="mt-6 space-y-6 rounded-[32px] bg-card p-5 ring-1 ring-line/80 shadow-xs backdrop-blur-xl sm:p-7">
        <ChipGroup
          step="1"
          label="What are you in the mood for?"
          options={NOW_MOODS}
          value={mood}
          icons={MOOD_ICONS}
          onChange={selectMood}
        />

        <ChipGroup
          step="2"
          label="When?"
          options={NOW_WHENS}
          value={when}
          icons={WHEN_ICONS}
          onChange={selectWhen}
        />

        <div>
          <ChipGroup
            step="3"
            label="Who with?"
            options={COMPANIES}
            value={company}
            icons={{ solo: "👤", group: "👥" }}
            onChange={setCompany}
          />
          <p className="mt-2.5 text-xs text-mute">
            Invites and group chat arrive automatically with the plan thread.
          </p>
        </div>
      </div>

      {/* Assembled Suggestion or Honest State */}
      <div className="mt-6" aria-live="polite">
        {!remoteLoaded ? (
          <div className="rounded-[32px] bg-card px-6 py-12 text-center ring-1 ring-line/80 shadow-xs">
            <span
              className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent"
              aria-hidden
            />
            <p className="mt-3.5 text-[15px] font-medium text-mute">Finding something near you…</p>
          </div>
        ) : suggestion ? (
          <article className="overflow-hidden rounded-[32px] bg-card ring-1 ring-line/80 shadow-xs transition-all duration-300">
            {/* Place Hero Visual */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-mist sm:aspect-[21/9]">
              <Photo
                src={placeImg}
                alt={suggestion.place.name}
                priority
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                aria-hidden
              />

              {/* Status Badges Overlay */}
              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 sm:left-4 sm:top-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1",
                    suggestion.open === true && "bg-emerald-500/90 text-white ring-emerald-400/50",
                    suggestion.open === null && "bg-black/60 text-white ring-white/20",
                    suggestion.open === false && "bg-rose-500/90 text-white ring-rose-400/50",
                  )}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {openLabel(suggestion.open, when)}
                </span>

                <span className="inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/20">
                  {PLACE_CATEGORY_LABELS[suggestion.place.category] || suggestion.place.category}
                </span>
              </div>

              {/* Top-Right Badges: Walk time & Price */}
              <div className="absolute right-3 top-3 flex items-center gap-1.5 sm:right-4 sm:top-4">
                {suggestion.place.walk ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
                    <Footprints className="h-3.5 w-3.5" aria-hidden />
                    {suggestion.place.walk}
                  </span>
                ) : null}

                {suggestion.place.priceLevel ? (
                  <span className="inline-flex items-center rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
                    {suggestion.place.priceLevel}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Place Details Body */}
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {suggestion.place.name}
                  </h2>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/80">{suggestion.place.shortWhy}</p>
                </div>

                <button
                  type="button"
                  onClick={handleShareSuggestion}
                  className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper text-mute ring-1 ring-line/80 transition hover:bg-card hover:text-ink active:scale-95 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  aria-label="Share this suggestion"
                  title="Share suggestion"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {/* Why this rationale callout */}
              {suggestion.reasons.length > 0 ? (
                <div className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line/60">
                  <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
                  <span>Why this: {suggestion.reasons.join(" · ")}</span>
                </div>
              ) : null}

              {/* Live Deal / Perk Callout */}
              {suggestion.place.deal ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Tag className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-amber-900">{suggestion.place.deal.badge}</p>
                    <p className="mt-0.5 leading-relaxed text-amber-800">{suggestion.place.deal.detail}</p>
                  </div>
                </div>
              ) : null}

              {/* Hours & Address Meta */}
              <div className="mt-4 space-y-1.5 border-t border-line/60 pt-4 text-xs text-mute">
                {suggestion.place.hours ? (
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-mute" aria-hidden />
                    <span>Hours: {suggestion.place.hours}</span>
                  </p>
                ) : null}

                {suggestion.place.address ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-mute" aria-hidden />
                      <span className="truncate">{suggestion.place.address}</span>
                    </p>
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:underline"
                      >
                        <Navigation className="h-3 w-3" aria-hidden />
                        <span>Maps</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {venueBioUrl ? (
                  <div className="pt-1">
                    <Link
                      href={venueBioUrl}
                      className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                    >
                      <Compass className="h-3.5 w-3.5" aria-hidden />
                      <span>View venue profile</span>
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="min-h-[48px] flex-1 cursor-pointer rounded-full text-base font-semibold shadow-xs"
                  onClick={() => {
                    void triggerHapticSelection();
                    navigate(
                      nowPlanHref({
                        mood,
                        when,
                        placeName: suggestion.place.name,
                        address: suggestion.place.address,
                        city: effectiveCity,
                        date: today,
                        now,
                        geo: suggestion.place.geo,
                      }),
                    );
                  }}
                >
                  Make it a plan
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="min-h-[48px] cursor-pointer rounded-full text-base font-medium ring-1 ring-line/80 hover:bg-paper"
                  onClick={handleShowAnother}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Show another
                </Button>
              </div>
            </div>
          </article>
        ) : pool.length === 0 ? (
          <EmptyState
            kicker={effectiveCity}
            title="No places nearby yet"
            body={`AirPal is still mapping ${effectiveCity}. Try exploring the Guide for curated walks and stays, or change your city.`}
            action={() => setLocationPicker(true)}
            actionLabel="Change city"
            secondary={() => navigate("/guide")}
            secondaryLabel="Open Guide"
          />
        ) : (
          <EmptyState
            kicker="No match"
            title="Nothing for that mood"
            body={`No ${mood === "any" ? "places" : (NOW_MOODS.find((m) => m.id === mood)?.label.toLowerCase() ?? "places")} spots ${when === "now" ? "open right now" : "open tonight"} nearby.`}
            action={showAnything}
            actionLabel="Show anything"
            secondary={() => navigate("/guide")}
            secondaryLabel="Open Guide"
          />
        )}
      </div>
    </div>
  );
}

