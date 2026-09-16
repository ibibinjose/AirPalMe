import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Navigation,
  Building2,
  Search,
  Check,
  Globe2,
  X,
  Sparkles,
  MapPin,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLocalNow } from "@/hooks/useLocalNow";
import { CITY_OPTIONS, cityCenter, type CityOption } from "@/lib/cities";
import { shareCurrentLocation } from "@/lib/share";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

type RegionFilter = "all" | "australia" | "international";

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
      if (filter === "australia" && c.country !== "Australia" && c.country !== "New Zealand") {
        return false;
      }
      if (filter === "international" && (c.country === "Australia" || c.country === "New Zealand")) {
        return false;
      }

      // Search text query
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        c.label.toLowerCase().includes(q) ||
        c.region?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
      );
    });
  }, [search, filter]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isGpsActive = choice.mode === "gps" || (choice.mode === "auto" && source === "gps");
  const isStayActive = choice.mode === "stay";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-ink/65 backdrop-blur-xs animate-in fade-in duration-200 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
    >
      <div
        className="relative flex flex-col w-full max-w-lg max-h-[min(88vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] rounded-t-[32px] sm:rounded-[32px] bg-card shadow-2xl ring-1 ring-line overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Tab */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />

        {/* Header (Pinned) */}
        <div className="flex items-center justify-between border-b border-line/70 bg-gradient-to-r from-card via-paper to-card px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gold/15 text-gold">
              <MapPin size={16} />
            </div>
            <div>
              <h2 id="location-picker-title" className="font-display text-base font-bold text-ink leading-tight">
                Location &amp; Precinct
              </h2>
              <p className="text-[11px] text-mute">
                Currently exploring in <strong className="text-ink font-semibold">{city || "Sydney"}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-card text-mute hover:text-ink ring-1 ring-line transition hover:bg-paper cursor-pointer"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Share Current Location & Guide */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-paper via-card to-paper p-3.5 ring-1 ring-line">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-1.5">
                <Share2 size={13} className="text-gold" />
                <span className="text-xs font-bold text-ink">Share Location &amp; Guide</span>
              </div>
              <p className="mt-0.5 text-[11px] text-mute leading-snug">
                Send friends a link to explore <strong className="text-ink font-semibold">{city || "Sydney"}</strong> on AirPal
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void shareCurrentLocation(city);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-ink/90 active:scale-95 transition cursor-pointer"
              aria-label="Share current location and guide link"
            >
              <Share2 size={12} />
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
                "group relative flex items-start gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.98] cursor-pointer",
                isGpsActive
                  ? "bg-ink text-white ring-ink shadow-md"
                  : "bg-paper text-ink ring-line hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                  isGpsActive ? "bg-white/20 text-white" : "bg-brand/10 text-brand group-hover:scale-105",
                )}
              >
                <Navigation size={17} className={cn(isGpsActive && "animate-pulse")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">Use Live GPS</span>
                  {isGpsActive && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
                  )}
                </div>
                <p className={cn("text-[11px] mt-0.5 leading-snug", isGpsActive ? "text-white/80" : "text-mute")}>
                  Tracks what’s around you in real time
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
                "group relative flex items-start gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.98] cursor-pointer",
                isStayActive
                  ? "bg-ink text-white ring-ink shadow-md"
                  : "bg-paper text-ink ring-line hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                  isStayActive ? "bg-white/20 text-white" : "bg-amber-500/10 text-gold group-hover:scale-105",
                )}
              >
                <Building2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Stay / Precinct</span>
                <p className={cn("text-[11px] mt-0.5 leading-snug", isStayActive ? "text-white/80" : "text-mute")}>
                  Hotel pin or The Rocks precinct
                </p>
              </div>
              {isStayActive && <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />}
            </button>
          </div>

          {/* City Search and Quick Filter Section */}
          <div className="pt-2 border-t border-line/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                <Globe2 size={12} />
                <span>Jump to Destination</span>
              </span>
              <span className="text-[11px] text-mute">{filteredCities.length} destinations</span>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cities (e.g. Sydney, Melbourne, Gold Coast)..."
                className="h-10 w-full rounded-2xl bg-paper pl-9 pr-8 text-xs text-ink placeholder:text-mute border border-ink outline-none transition focus:bg-card focus:ring-brand focus:border-brand"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Region Tabs */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer",
                  filter === "all"
                    ? "bg-ink text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("australia")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer",
                  filter === "australia"
                    ? "bg-ink text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                )}
              >
                🇦🇺 Australia &amp; NZ
              </button>
              <button
                type="button"
                onClick={() => setFilter("international")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer",
                  filter === "international"
                    ? "bg-ink text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line",
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
                      "flex items-center justify-between rounded-xl px-3 py-2 text-left ring-1 transition active:scale-95 cursor-pointer",
                      isSelected
                        ? "bg-ink text-white ring-ink shadow-xs"
                        : "bg-paper text-ink ring-line hover:bg-card",
                    )}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{c.flag}</span>
                        <span className="truncate text-xs font-semibold">{c.label}</span>
                      </div>
                      {c.region && (
                        <span
                          className={cn(
                            "block truncate text-[10px]",
                            isSelected ? "text-white/70" : "text-mute",
                          )}
                        >
                          {c.region}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={13} className="text-emerald-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {filteredCities.length === 0 && (
              <div className="rounded-2xl bg-paper p-6 text-center ring-1 ring-line">
                <p className="text-xs font-semibold text-ink">No cities matching "{search}"</p>
                <button
                  type="button"
                  onClick={() => {
                    const center = cityCenter(search.trim());
                    chooseLocation({ mode: "city", city: search.trim(), lat: center.lat, lng: center.lng });
                    onClose();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-xs cursor-pointer active:scale-95"
                >
                  <Sparkles size={12} />
                  <span>Explore "{search.trim()}"</span>
                </button>
              </div>
            )}
          </div>

          {/* Social Presence & Circle Sharing */}
          <div className="pt-2 border-t border-line/60">
            <label className="flex items-start gap-3 rounded-2xl bg-paper/80 p-3.5 ring-1 ring-line/80 cursor-pointer hover:bg-paper transition">
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
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span className="text-xs font-bold text-ink">Share city with Circle</span>
                </div>
                <p className="text-[11px] text-mute mt-0.5 leading-snug">
                  Mutuals and followers see you're currently in <strong className="text-ink">{city || "Sydney"}</strong>. Exact GPS coordinates never leave your device.
                </p>
              </div>
            </label>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-mute text-[11px]">Looking for mutuals in {city}?</span>
              <button
                type="button"
                className="font-semibold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                onClick={() => {
                  onClose();
                  nav("/circle");
                }}
              >
                <span>Open Circle Feed</span>
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


