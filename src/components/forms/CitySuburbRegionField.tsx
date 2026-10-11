import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin, Navigation, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useLocalNow } from "@/hooks/useLocalNow";
import { locateBusiness } from "@/lib/locate";
import { formatGps } from "@shared/geo-address";
import {
  fetchPlace,
  googleSearchErrorMessage,
  newPlacesSessionToken,
  searchCityRegions,
  type GooglePlaceSuggestion,
} from "@/lib/google-place-import";
import { formatCitySuburbRegion, cleanStateName, POPULAR_CITY_PRESETS } from "@/lib/city-region";

export interface CitySuburbRegionFieldProps {
  value: string;
  onChange: (city: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showPresets?: boolean;
}

const DEFAULT_INPUT_CLASS =
  "w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-xs transition";

export function CitySuburbRegionField({
  value,
  onChange,
  label = "City / Suburb & Region",
  placeholder = "e.g. Sydney, NSW or Bondi Beach, NSW",
  className,
  inputClassName = DEFAULT_INPUT_CLASS,
  showPresets = true,
}: CitySuburbRegionFieldProps) {
  const { here } = useLocalNow();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(false);

  const [session, setSession] = useState(() => newPlacesSessionToken());
  const [hits, setHits] = useState<GooglePlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSource, setVerifiedSource] = useState<"google" | "gps" | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHits([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      setHits([]);
      setIsOpen(false);
      return;
    }

    const needle = value.trim();
    if (needle.length < 2) {
      setHits([]);
      setIsOpen(false);
      return;
    }

    const t = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      void searchCityRegions(needle, session, here)
        .then((rows) => {
          if (!selectedRef.current) {
            setHits(rows);
            setIsOpen(rows.length > 0);
            setActive(0);
          }
        })
        .catch((e) => setError(googleSearchErrorMessage(e)))
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(t);
  }, [value, session, here.lat, here.lng]);

  async function choose(hit: GooglePlaceSuggestion) {
    selectedRef.current = true;
    setHits([]);
    setIsOpen(false);
    setSearching(true);
    try {
      const place = await fetchPlace(hit.placeId, session);
      const formatted = formatCitySuburbRegion(place.name || hit.title, place.address || hit.subtitle);
      selectedRef.current = true;
      onChange(formatted);
      setVerifiedSource("google");
      setSession(newPlacesSessionToken());
    } catch {
      const formatted = formatCitySuburbRegion(hit.title, hit.subtitle);
      selectedRef.current = true;
      onChange(formatted);
      setVerifiedSource("google");
    } finally {
      setSearching(false);
      setHits([]);
      setIsOpen(false);
    }
  }

  async function handleUseGps() {
    selectedRef.current = true;
    setHits([]);
    setIsOpen(false);
    setLocating(true);
    setError(null);
    try {
      const found = await locateBusiness();
      if (found.fields) {
        const city = found.fields.city || "";
        const state = found.fields.state || "";
        const country = found.fields.countryCode || "";

        let label = "";
        if (city && state) {
          label = `${city}, ${cleanStateName(state)}`;
        } else if (city) {
          label = country && country !== "AU" ? `${city}, ${country}` : city;
        }

        if (label) {
          selectedRef.current = true;
          onChange(label);
          setVerifiedSource("gps");
          toast.success(`Located at ${label} (${formatGps(found.geo.lat, found.geo.lng)})`);
        } else {
          toast.success(`Pinned ${formatGps(found.geo.lat, found.geo.lng)}`);
        }
      } else {
        toast.success(`Pinned ${formatGps(found.geo.lat, found.geo.lng)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Location failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLocating(false);
      setHits([]);
      setIsOpen(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!hits.length || !isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const hit = hits[active];
      if (hit) {
        e.preventDefault();
        void choose(hit);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHits([]);
    }
  }

  return (
    <div ref={containerRef} className={cn("space-y-2 relative", className)}>
      {/* Header with GPS button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mute">
          <MapPin size={13} className="text-accent" />
          <span>{label}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleUseGps()}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 hover:bg-brand/15 px-2.5 py-1 text-xs font-semibold text-accent transition active:scale-95 border border-brand/20 shadow-xs disabled:opacity-60"
        >
          {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          <span>{locating ? "Locating…" : "Current Location"}</span>
        </button>
      </div>

      {/* Input with Map Pin Icon and Autocomplete Dropdown */}
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent z-[1]" />
        <input
          value={value}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen && hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          onFocus={() => {
            if (hits.length > 0) setIsOpen(true);
          }}
          onChange={(e) => {
            selectedRef.current = false;
            setVerifiedSource(null);
            onChange(e.target.value);
          }}
          onKeyDown={onKey}
          className={cn(inputClassName, "pl-9 pr-10")}
        />

        {searching ? (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-mute" />
        ) : value ? (
          <button
            type="button"
            aria-label="Clear location"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-mute hover:text-ink transition"
            onClick={() => {
              selectedRef.current = true;
              setHits([]);
              setIsOpen(false);
              setVerifiedSource(null);
              onChange("");
            }}
          >
            <X size={14} />
          </button>
        ) : null}

        {/* Autocomplete Dropdown Suggestions */}
        {isOpen && hits.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-2xl bg-card py-1 ring-1 ring-line shadow-xl scroll-container"
          >
            {hits.map((hit, i) => (
              <li key={hit.placeId} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition",
                    i === active ? "bg-brand/10 text-accent" : "hover:bg-surface/60 text-ink",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void choose(hit);
                  }}
                >
                  <MapPin size={15} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold block leading-tight">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="text-[12px] text-mute block leading-tight mt-0.5">{hit.subtitle}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Verified Status / Feedback */}
      {verifiedSource === "google" && !error && (
        <span className="text-[11px] font-medium text-accent flex items-center gap-1">
          <Check size={12} /> Matched via Google Maps
        </span>
      )}
      {verifiedSource === "gps" && !error && (
        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
          <Check size={12} /> Detected from device GPS
        </span>
      )}
      {error && <span className="text-[12px] text-mute">{error}</span>}

      {/* Popular Suburb & City Presets */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute flex items-center gap-1 mr-0.5">
            <Sparkles size={10} className="text-accent" /> Hubs:
          </span>
          {POPULAR_CITY_PRESETS.slice(0, 6).map((p) => {
            const isSelected = value.trim().toLowerCase() === p.label.toLowerCase();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  selectedRef.current = true;
                  setHits([]);
                  setIsOpen(false);
                  onChange(p.label);
                  setVerifiedSource("google");
                }}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-medium transition active:scale-95 border",
                  isSelected
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "bg-surface hover:bg-surface-hover text-mute hover:text-ink border-line/60",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
