import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { BadgeCheck, Loader2, Search, X } from "lucide-react";
import type { GooglePlaceImport } from "@shared/google-place";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useLocalNow } from "@/hooks/useLocalNow";
import {
  canImportGooglePlaces,
  fetchPlace,
  googlePhotoUrl,
  googleSearchErrorMessage,
  newPlacesSessionToken,
  resolveGooglePlacePhotos,
  searchPlaces,
  type GooglePlaceSuggestion,
} from "@/lib/google-place-import";

export function GooglePlaceImportCard({
  onImport,
  importedPlaceId,
  initialQuery = "",
  variant = "card",
  onQueryChange,
}: {
  onImport: (place: GooglePlaceImport) => void;
  importedPlaceId?: string;
  initialQuery?: string;
  /** `field` is the business-name search on Register. `card` is the later import panel. */
  variant?: "card" | "field";
  onQueryChange?: (query: string) => void;
}) {
  const { here } = useLocalNow();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [session, setSession] = useState(() => newPlacesSessionToken());
  const [hits, setHits] = useState<GooglePlaceSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<GooglePlaceImport | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoImport = variant === "field";
  const fromGoogle = canImportGooglePlaces();

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2 || (preview && needle === preview.name.trim())) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      void searchPlaces(needle, session, here)
        .then((rows) => {
          setHits(rows);
          setActive(0);
        })
        .catch((e) => setError(googleSearchErrorMessage(e)))
        .finally(() => setSearching(false));
    }, 380);
    return () => window.clearTimeout(t);
  }, [query, session, preview, here.lat, here.lng]);

  function setNeedle(next: string) {
    setQuery(next);
    if (preview && next.trim() !== preview.name.trim()) setPreview(null);
    onQueryChange?.(next);
  }

  function clear() {
    setHits([]);
    setPreview(null);
    setError(null);
    setNeedle("");
  }

  async function commit(place: GooglePlaceImport) {
    setImporting(true);
    try {
      const readyPlace = await resolveGooglePlacePhotos(place).catch(() => place);
      setPreview(readyPlace);
      setQuery(readyPlace.name);
      setHits([]);
      setSession(newPlacesSessionToken());
      onImport(readyPlace);
    } finally {
      setImporting(false);
    }
  }

  async function pick(placeId: string) {
    setLoadingId(placeId);
    setError(null);
    try {
      const place = await fetchPlace(placeId, session);
      setHits([]);
      setPreview(place);
      if (autoImport) await commit(place);
    } catch (e) {
      setError(
        googleSearchErrorMessage(e).includes("search listings")
          ? "Couldn’t load that listing."
          : googleSearchErrorMessage(e),
      );
    } finally {
      setLoadingId(null);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      void pick(hits[active]!.placeId);
    } else if (e.key === "Escape") {
      setHits([]);
    }
  }

  function photoSrc(name: string | undefined, maxPx: number) {
    if (!name) return "";
    if (/^https?:\/\//i.test(name)) return name;
    return googlePhotoUrl(name, maxPx);
  }
  const logo = photoSrc(preview?.photoNames[0], 256);
  const cover = photoSrc(preview?.photoNames[0], 900);
  const already = Boolean(importedPlaceId && preview && importedPlaceId === preview.placeId);
  const open = hits.length > 0;

  const searchField = (
    <label className={cn("relative block", variant === "card" && "mt-3")}>
      {variant === "field" ? (
        <span className="text-[13px] font-semibold">Business name</span>
      ) : (
        <span className="sr-only">{fromGoogle ? "Search Google listings" : "Search listings"}</span>
      )}
      <span className={cn("relative block", variant === "field" && "mt-1")}>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          value={query}
          onChange={(e) => setNeedle(e.target.value)}
          onKeyDown={onKey}
          placeholder="The Glenmore Hotel, The Rocks…"
          autoComplete="off"
          autoFocus={variant === "field"}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && hits[active] ? `${listId}-${hits[active]!.placeId}` : undefined}
          className="w-full rounded-xl border border-line bg-card py-2.5 pl-9 pr-10 text-sm outline-none placeholder:text-mute focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-mute hover:bg-paper"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </span>
    </label>
  );

  const results = (
    <>
      {searching && (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-mute">
          <Loader2 size={14} className="animate-spin" /> Searching nearby…
        </p>
      )}
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      {hits.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="mt-2 divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line bg-card"
        >
          {hits.map((hit, i) => (
            <li key={hit.placeId} role="presentation">
              <button
                type="button"
                id={`${listId}-${hit.placeId}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => void pick(hit.placeId)}
                disabled={loadingId === hit.placeId}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                  i === active ? "bg-brand/10" : "hover:bg-paper",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{hit.title}</span>
                  {hit.subtitle && <span className="block truncate text-xs text-mute">{hit.subtitle}</span>}
                </span>
                {loadingId === hit.placeId && <Loader2 size={14} className="animate-spin text-mute" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const previewCard = preview ? (
    <div className={cn("overflow-hidden rounded-2xl ring-1 ring-line bg-card", variant === "field" ? "mt-2" : "mt-3")}>
      {cover && <img src={cover} alt="" className="h-28 w-full object-cover" />}
      <div className="flex gap-3 p-3">
        {logo && <img src={logo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-line" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{preview.name}</p>
          <p className="truncate text-xs text-mute">{preview.address}</p>
          <p className="mt-1 truncate text-xs text-mute">
            {[preview.phone, preview.website.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ")}
          </p>
        </div>
        {already && <BadgeCheck size={18} className="shrink-0 text-brand" />}
      </div>
      <div className="border-t border-line px-3 py-2 text-[12px] text-mute">
        {preview.hours ? preview.hours.split("; ").slice(0, 2).join(" · ") : "Hours not listed"}
        {preview.menuUrl ? " · Menu link found" : ""}
      </div>
      {variant === "card" && (
        <div className="p-3 pt-0">
          <Button className="w-full" disabled={already || importing} onClick={() => void commit(preview)}>
            <BadgeCheck size={16} className={cn(already && "text-white")} />
            {already ? "Imported" : importing ? "Importing…" : "Use this listing"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-mute">
            {fromGoogle
              ? "Copies the public Google listing. Not Google ownership."
              : "Copies the public listing. Confirm you manage it on the next step."}
          </p>
        </div>
      )}
      {variant === "field" && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
          <p className="text-[12px] text-mute">
            {fromGoogle ? "Copied from Google." : "Address, hours, and phone copied when listed."}
          </p>
          <button type="button" className="text-[12px] font-semibold text-brand" onClick={clear}>
            Change
          </button>
        </div>
      )}
    </div>
  ) : null;

  if (variant === "field") {
    return (
      <div>
        {searchField}
        {results}
        {previewCard}
      </div>
    );
  }

  return (
    <div className="rounded-2xl ring-1 ring-line bg-paper p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
        {fromGoogle ? "From Google" : "Public listing"}
      </p>
      <h3 className="font-display mt-1 text-lg font-bold">Import or sync the listing</h3>
      <p className="mt-1 text-[13px] text-mute">
        {fromGoogle
          ? `Search the public Google listing. We copy photo, address, phone, website, and hours${preview?.menuUrl ? ", and a menu link" : ""}. This is not Google ownership — it fills the directory.`
          : `Search the public listing. We copy address, phone, website, and hours${preview?.menuUrl ? ", and a menu link" : ""}. This fills the directory — it is not ownership.`}
      </p>
      {searchField}
      {results}
      {previewCard}
    </div>
  );
}
