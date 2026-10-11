import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldInput } from "@/components/forms/ValidField";
import { useLocalNow } from "@/hooks/useLocalNow";
import type { Geo } from "@shared/nearby";
import { mapsPlaceUrl, mapsSearchUrl } from "@/lib/maps";
import {
  fetchPlace,
  googleSearchErrorMessage,
  newPlacesSessionToken,
  searchAddressPlaces,
  type GooglePlaceSuggestion,
} from "@/lib/google-place-import";

export type PickedPlace = {
  label: string;
  name: string;
  address: string;
  city?: string;
  geo?: Geo;
  placeId?: string;
};

export function PlaceAddressLink({ label, geo, className }: { label: string; geo?: Geo; className?: string }) {
  if (!label.trim()) return null;
  const href = geo ? mapsPlaceUrl(geo, label) : mapsSearchUrl(label);
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("truncate hover:underline", className)}>
      {label}
    </a>
  );
}

export function formatPickedPlace(place: { name: string; address?: string }): string {
  const name = place.name.trim();
  const address = (place.address || "").trim();
  if (name && address && !address.toLowerCase().startsWith(name.toLowerCase())) return `${name}, ${address}`;
  return address || name;
}

export function PlaceAddressField({
  value,
  onChange,
  onPick,
  label = "Where",
  placeholder = "Search a place or address",
  required,
}: {
  value: string;
  onChange: (text: string) => void;
  onPick?: (place: PickedPlace) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const { here } = useLocalNow();
  const listId = useId();
  const containerRef = useRef<HTMLLabelElement>(null);
  const selectedRef = useRef(false);

  const [session, setSession] = useState(() => newPlacesSessionToken());
  const [hits, setHits] = useState<GooglePlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

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
      void searchAddressPlaces(needle, session, here)
        .then((rows) => {
          if (!selectedRef.current) {
            setHits(rows);
            setIsOpen(rows.length > 0);
            setActive(0);
          }
        })
        .catch((e) => setError(googleSearchErrorMessage(e)))
        .finally(() => setSearching(false));
    }, 320);
    return () => window.clearTimeout(t);
  }, [value, session, here.lat, here.lng]);

  async function choose(hit: GooglePlaceSuggestion) {
    selectedRef.current = true;
    setHits([]);
    setIsOpen(false);
    setSearching(true);
    try {
      const place = await fetchPlace(hit.placeId, session);
      const label = formatPickedPlace(place);
      selectedRef.current = true;
      onChange(label);
      onPick?.({
        label,
        name: place.name,
        address: place.address,
        city: place.city,
        geo: place.geo,
        placeId: place.placeId,
      });
      setPickedId(place.placeId);
      setSession(newPlacesSessionToken());
    } catch (e) {
      const label = [hit.title, hit.subtitle].filter(Boolean).join(", ");
      selectedRef.current = true;
      onChange(label);
      onPick?.({ label, name: hit.title, address: hit.subtitle, placeId: hit.placeId });
      setError(googleSearchErrorMessage(e));
    } finally {
      setSearching(false);
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
    <label ref={containerRef} className="block relative">
      {label && <span className="text-[13px] font-semibold text-mute">{label}</span>}
      <div className={cn("relative", label && "mt-1")}>
        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-mute" />
        <input
          value={value}
          required={required}
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
            setPickedId(null);
            onChange(e.target.value);
          }}
          onKeyDown={onKey}
          className={`${fieldInput} pl-10 pr-10`}
        />
        {searching ? (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-mute" />
        ) : value ? (
          <button
            type="button"
            aria-label="Clear place"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-mute"
            onClick={() => {
              selectedRef.current = true;
              setHits([]);
              setIsOpen(false);
              setPickedId(null);
              onChange("");
              onPick?.({ label: "", name: "", address: "" });
            }}
          >
            <X size={14} />
          </button>
        ) : null}
        {isOpen && hits.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-card py-1 ring-1 ring-line shadow-lg"
          >
            {hits.map((hit, i) => (
              <li key={hit.placeId} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col px-3 py-2.5 text-left",
                    i === active ? "bg-brand/10" : "hover:bg-paper",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void choose(hit);
                  }}
                >
                  <span className="text-sm font-semibold text-ink">{hit.title}</span>
                  {hit.subtitle && <span className="text-[12px] text-mute">{hit.subtitle}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <span className="mt-1 block text-[12px] text-mute">{error}</span>}
      {pickedId && !error && <span className="mt-1 block text-[12px] text-mute">Address from Google Maps</span>}
    </label>
  );
}
