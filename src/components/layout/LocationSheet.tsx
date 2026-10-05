import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Navigation,
  Building2,
  Check,
  Globe2,
  X,
  Sparkles,
  MapPin,
  Share2,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLocalNow } from "@/hooks/useLocalNow";
import { toast } from "sonner";
import { CITY_OPTIONS, SYDNEY_PRECINCTS, type CityOption } from "@/lib/cities";
import { geocodePlaceName } from "@/lib/osm-place-search";
import { shareCurrentLocation } from "@/lib/share";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { SearchBar } from "@/components/search/SearchBar";

type RegionFilter = "all" | "india" | "uae" | "europe" | "northamerica" | "australia" | "international";

const EUROPE_COUNTRIES = ["United Kingdom", "France", "Germany", "Spain", "Italy", "Netherlands", "Ireland"];

const NORTH_AMERICA_COUNTRIES = ["United States", "Canada"];

export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { city, choice, chooseLocation, shareLocation, setShareLocation, source } = useLocalNow();
  const { user } = useAuth();
  const [, nav] = useLocation();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RegionFilter>("all");

  useScrollLock(open);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredCities = useMemo(() => {
    return CITY_OPTIONS.filter((c: CityOption) => {
      // Region filter
      if (filter === "india" && c.country !== "India") return false;
      if (filter === "uae" && c.country !== "United Arab Emirates") return false;
      if (filter === "europe" && !EUROPE_COUNTRIES.includes(c.country || "")) return false;
      if (filter === "northamerica" && !NORTH_AMERICA_COUNTRIES.includes(c.country || "")) return false;
      if (filter === "australia" && c.country !== "Australia" && c.country !== "New Zealand") {
        return false;
      }
      if (
        filter === "international" &&
        (c.country === "Australia" ||
          c.country === "New Zealand" ||
          c.country === "India" ||
          c.country === "United Arab Emirates" ||
          EUROPE_COUNTRIES.includes(c.country || "") ||
          NORTH_AMERICA_COUNTRIES.includes(c.country || ""))
      ) {
        return false;
      }

      // Search text query
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        c.label.toLowerCase().includes(q) || c.region?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q)
      );
    });
  }, [search, filter]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isGpsActive = choice.mode === "gps" || (choice.mode === "auto" && source === "gps");
  const isStayActive = choice.mode === "stay";
  // Sydney precinct shortcuts only make sense for Sydney guests — GPS + city
  // search already cover Dubai, India, and everywhere else.
  const showSydneyPrecincts = !city || city === "Choose a city" || /sydney/i.test(city);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-ink/65 backdrop-blur-xs animate-in fade-in duration-200 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
    >
      <div
        className="relative flex flex-col w-full max-w-lg max-h-[min(88vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] rounded-t-[32px] sm:rounded-[32px] bg-card ring-1 ring-line shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Tab */}
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-ink/20 sm:hidden" />

        {/* Header (Pinned) */}
        <div className="flex items-center justify-between border-b-2 border-ink bg-card px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-slate-950 border border-line shadow-xs">
              <MapPin size={18} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 border border-line shadow-xs">
                <Sparkles size={11} />
                <span>Anywhere you are</span>
              </div>
              <h2 id="location-picker-title" className="font-display text-lg font-bold text-ink leading-tight mt-0.5">
                Location &amp; Precinct
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-paper text-ink hover:bg-card ring-1 ring-line transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Share Current Location & Guide */}
          <div className="flex items-center justify-between rounded-2xl ring-1 ring-line bg-paper p-3.5 shadow-xs">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-1.5">
                <Share2 size={14} className="text-brand" />
                <span className="text-xs font-bold text-ink">Share Location &amp; Guide</span>
              </div>
              <p className="mt-0.5 text-[11px] text-mute leading-snug">
                Send friends a link to explore{" "}
                <strong className="text-ink font-semibold">
                  {city && city !== "Choose a city" ? city : "your city"}
                </strong>{" "}
                on AirPal
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void shareCurrentLocation(city);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 transition cursor-pointer border border-line"
              aria-label="Share current location and guide link"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>

          {/* Primary Modes: GPS & Stay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* GPS Option */}
            <button
              type="button"
              onClick={() => {
                chooseLocation({ mode: "gps" });
                onClose();
              }}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl p-3.5 text-left border-2 transition active:scale-[0.98] cursor-pointer shadow-xs",
                isGpsActive ? "bg-brand text-white border-ink" : "bg-paper text-ink border-ink hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition border border-line",
                  isGpsActive
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-brand/10 text-brand group-hover:scale-105",
                )}
              >
                <Navigation size={17} className={cn(isGpsActive && "animate-pulse")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">Use current location</span>
                  {isGpsActive && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
                  )}
                </div>
                <p
                  className={cn(
                    "text-[11px] mt-0.5 leading-snug font-medium",
                    isGpsActive ? "text-white/80" : "text-mute",
                  )}
                >
                  {isGpsActive ? city || "Places around you" : "Use GPS — works in India, Australia, anywhere"}
                </p>
              </div>
              {isGpsActive && <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />}
            </button>

            {/* Stay / Precinct Option */}
            <button
              type="button"
              onClick={() => {
                chooseLocation({ mode: "stay" });
                onClose();
              }}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl p-3.5 text-left border-2 transition active:scale-[0.98] cursor-pointer shadow-xs",
                isStayActive ? "bg-brand text-white border-ink" : "bg-paper text-ink border-ink hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition border border-line",
                  isStayActive
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-amber-500/10 text-amber-900 dark:text-amber-300 group-hover:scale-105",
                )}
              >
                <Building2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Stay / Hotel Pin</span>
                <p
                  className={cn(
                    "text-[11px] mt-0.5 leading-snug font-medium",
                    isStayActive ? "text-white/80" : "text-mute",
                  )}
                >
                  Lock to your hotel or stay location
                </p>
              </div>
              {isStayActive && <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />}
            </button>
          </div>

          {/* Sydney Precincts Section — Sydney guests only */}
          {showSydneyPrecincts && (
            <div className="pt-2 border-t-2 border-ink/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Compass size={14} className="text-brand" />
                  <span>Sydney precincts</span>
                </span>
                <span className="text-[11px] font-bold text-mute">Sydney, NSW 🇦🇺</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SYDNEY_PRECINCTS.map((p) => {
                  const isSelected = choice.mode === "city" && choice.city.toLowerCase().includes(p.name.toLowerCase());
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        chooseLocation({ mode: "city", city: `${p.name}, Sydney`, lat: p.lat, lng: p.lng });
                        onClose();
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition active:scale-95 cursor-pointer shadow-xs",
                        isSelected ? "bg-brand text-white border-ink" : "bg-paper text-ink border-ink hover:bg-card",
                      )}
                    >
                      <span className="text-base shrink-0">{p.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{p.name}</p>
                        <p
                          className={cn("truncate text-[10px] font-medium", isSelected ? "text-white/70" : "text-mute")}
                        >
                          {p.tagline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* City Search and Quick Filter Section */}
          <div className="pt-3 border-t-2 border-ink/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Globe2 size={14} className="text-brand" />
                <span>All Destinations</span>
              </span>
              <span className="text-[11px] font-bold text-mute">{filteredCities.length} cities</span>
            </div>

            {/* Search Bar: Mobile, iOS and Android friendly */}
            <div className="mb-2.5">
              <SearchBar
                value={search}
                onChange={setSearch}
                sizeVariant="sm"
                variant="paper"
                placeholder="Search any city (Bengaluru, Kochi, London…)"
                aria-label="Search city"
              />
            </div>

            {/* Region Tabs */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "all" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("india")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "india" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🇮🇳 India
              </button>
              <button
                type="button"
                onClick={() => setFilter("uae")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "uae" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🇦🇪 UAE
              </button>
              <button
                type="button"
                onClick={() => setFilter("europe")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "europe" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🇪🇺 UK &amp; Europe
              </button>
              <button
                type="button"
                onClick={() => setFilter("northamerica")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "northamerica" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🇺🇸 US &amp; Canada
              </button>
              <button
                type="button"
                onClick={() => setFilter("australia")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "australia" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🇦🇺 Australia &amp; NZ
              </button>
              <button
                type="button"
                onClick={() => setFilter("international")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-bold transition active:scale-95 cursor-pointer border border-line",
                  filter === "international" ? "bg-brand text-white shadow-xs" : "bg-paper text-ink hover:bg-card",
                )}
              >
                🌐 International
              </button>
            </div>

            {/* Cities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredCities.map((c) => {
                const isSelected = choice.mode === "city" && choice.city.toLowerCase() === c.label.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      chooseLocation({ mode: "city", city: c.label, lat: c.lat, lng: c.lng });
                      onClose();
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-left border-2 transition active:scale-95 cursor-pointer shadow-xs",
                      isSelected ? "bg-brand text-white border-ink" : "bg-paper text-ink border-ink hover:bg-card",
                    )}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{c.flag}</span>
                        <span className="truncate text-xs font-bold">{c.label}</span>
                      </div>
                      {c.region && (
                        <span
                          className={cn(
                            "block truncate text-[10px] font-medium",
                            isSelected ? "text-white/70" : "text-mute",
                          )}
                        >
                          {c.region}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {filteredCities.length === 0 && (
              <div className="rounded-2xl ring-1 ring-line bg-paper p-6 text-center shadow-xs">
                <p className="text-xs font-bold text-ink">No cities matching "{search}"</p>
                <button
                  type="button"
                  onClick={() => {
                    const q = search.trim();
                    const known = CITY_OPTIONS.find(
                      (c) => c.label.toLowerCase() === q.toLowerCase() || c.id.toLowerCase() === q.toLowerCase(),
                    );
                    if (known) {
                      chooseLocation({ mode: "city", city: known.label, lat: known.lat, lng: known.lng });
                      onClose();
                      return;
                    }
                    void geocodePlaceName(q).then((hit) => {
                      if (!hit) {
                        toast.error("Couldn’t find that place. Try a suburb or city name.");
                        return;
                      }
                      chooseLocation({ mode: "city", city: hit.name, lat: hit.lat, lng: hit.lng });
                      onClose();
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95 border border-line"
                >
                  <Sparkles size={13} />
                  <span>Explore "{search.trim()}"</span>
                </button>
              </div>
            )}
          </div>

          {/* Social Presence & Circle Sharing */}
          <div className="pt-3 border-t-2 border-ink/10">
            <label className="flex items-start gap-3 rounded-2xl ring-1 ring-line bg-paper p-3.5 shadow-xs cursor-pointer hover:bg-card transition">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                checked={shareLocation}
                onChange={(e) => {
                  if (!user) {
                    nav("/start?next=/circle");
                    return;
                  }
                  setShareLocation(e.target.checked);
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="text-xs font-bold text-ink">Share city with Circle</span>
                </div>
                <p className="text-[11px] text-mute mt-0.5 leading-snug font-medium">
                  Mutuals and followers see you're currently in{" "}
                  <strong className="text-ink">{city && city !== "Choose a city" ? city : "your city"}</strong>. Exact
                  GPS never leaves your device.
                </p>
              </div>
            </label>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-mute text-[11px] font-medium">Deciding what to do in {city}?</span>
              <button
                type="button"
                className="font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                onClick={() => {
                  onClose();
                  nav("/now");
                }}
              >
                <span>What now?</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
