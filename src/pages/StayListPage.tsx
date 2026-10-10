import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Hotel, MapPin, Wifi } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { getFirebaseDb } from "@/lib/firebase";
import { filterStayFinder, normalizeProperty, stayKindLabel, stayPriceLabel, stayProfilePath } from "@/lib/properties";
import type { PropertyInfo } from "@shared/airpal-data";
import { cn } from "@/lib/cn";
import { EcosystemSwitcher } from "@/components/brand/EcosystemSwitcher";

/**
 * Stay listings — an Airbnb-style discovery surface over live host
 * properties. AirPal lists; guests book direct with the property (outbound
 * booking links on each profile). No seed supply, no invented prices.
 */
export function StayListPage() {
  const [, nav] = useLocation();
  const { city } = useLocalNow();
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const [stays, setStays] = useState<PropertyInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setStays(null);
    setFailed(false);
    const db = getFirebaseDb();
    if (!db) {
      setStays([]);
      return;
    }
    void getDocs(collection(db, "properties"))
      .then((snap) => {
        if (cancelled) return;
        const rows = snap.docs.map((d) => normalizeProperty(d.id, d.data() as Record<string, unknown>));
        setStays(filterStayFinder(rows, effectiveCity));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveCity]);

  const kindsPresent = useMemo(() => {
    const kinds = new Map<string, string>();
    for (const stay of stays || []) {
      if (stay.kind && stayKindLabel(stay.kind) && !kinds.has(stay.kind)) {
        kinds.set(stay.kind, stayKindLabel(stay.kind));
      }
    }
    return Array.from(kinds.entries());
  }, [stays]);

  const visible = useMemo(() => (stays || []).filter((stay) => kind === "all" || stay.kind === kind), [stays, kind]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
        <EcosystemSwitcher currentPath="/stay" variant="header" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => nav("/concierge")}
            className="text-xs font-semibold"
          >
            Guest Check-In
          </Button>
          <Button
            size="sm"
            onClick={() => nav("/host")}
            className="text-xs font-semibold"
          >
            Host Dashboard
          </Button>
        </div>
      </div>

      <header className="py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">AirPal Pass · Stays &amp; Hospitality</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">Stays &amp; Hotel Check-In in {effectiveCity}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Live listings and digital compendiums from hosts — hotels, motels, hostels and boutique stays with instant QR check-in.
        </p>
      </header>

      {kindsPresent.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stay kind">
          <button
            type="button"
            onClick={() => setKind("all")}
            aria-pressed={kind === "all"}
            className={cn(
              "min-h-[44px] rounded-full px-4 text-[13px] font-bold ring-1 transition",
              kind === "all" ? "bg-ink text-paper ring-ink" : "bg-card text-mute ring-line",
            )}
          >
            All
          </button>
          {kindsPresent.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={cn(
                "min-h-[44px] rounded-full px-4 text-[13px] font-bold ring-1 transition",
                kind === value ? "bg-ink text-paper ring-ink" : "bg-card text-mute ring-line",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {stays === null && !failed ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading stays">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl bg-card ring-1 ring-line" />
            ))}
          </div>
        ) : failed || stays === null ? (
          <div className="rounded-3xl border border-dashed border-line p-10 text-center">
            <p className="font-display text-lg font-medium">Couldn&apos;t load stays right now</p>
            <p className="mt-1 text-sm text-mute">Check your connection and try again.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-10 text-center">
            <p className="font-display text-lg font-medium">No stays listed in {effectiveCity} yet</p>
            <p className="mt-1 text-sm text-mute">Are you a host? List your stay to appear here.</p>
            <Button size="sm" className="mt-4" onClick={() => nav("/business/onboard")}>
              List your stay
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((stay) => {
              const price = stayPriceLabel(stay);
              return (
                <article
                  key={stay.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-line shadow-xs transition hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => nav(stayProfilePath(stay))}
                    className="relative block aspect-video w-full overflow-hidden bg-paper text-left"
                    aria-label={`View ${stay.name}`}
                  >
                    <Photo
                      thumb
                      src={stay.heroImage || stay.galleryImages?.[0] || "/media/harbour.jpg"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      alt={stay.name}
                    />
                    <div className="hero-scrim absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/90 px-3 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-md">
                      <Hotel size={13} /> {stayKindLabel(stay.kind) || stay.city || "Stay"}
                    </span>
                    {price && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                        {price}
                      </span>
                    )}
                    <span className="absolute bottom-3 left-3 right-3 block">
                      <span className="font-display block text-lg font-bold leading-tight text-white">{stay.name}</span>
                      {stay.tagline && (
                        <span className="mt-0.5 block truncate text-xs font-medium text-white/80">{stay.tagline}</span>
                      )}
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-2 p-4">
                    <span className="flex min-w-0 items-center gap-1 text-xs text-mute">
                      <MapPin size={12} className="shrink-0 text-accent" />
                      <span className="truncate">{stay.address || stay.city}</span>
                    </span>
                    <Link
                      href={stayProfilePath(stay)}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      View stay <ArrowRight size={13} />
                    </Link>
                  </div>
                  {stay.wifi?.speed ? (
                    <div className="mx-4 mb-4 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Wifi size={13} />
                      <span>{stay.wifi.speed}</span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <section aria-label="List your stay" className="mt-10 rounded-[28px] bg-neutral-900 p-6 text-white sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">For hosts</p>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight sm:text-2xl">
          List your stay. Bookings stay yours.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
          AirPal is a listing platform, not a booking platform: guests find you here and book direct on your site. Add
          Stay &amp; Guide to every room as an additional service — the all-in-one guest companion, from one QR code.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/business/onboard"
            className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-white/90 active:scale-[0.98]"
          >
            List your stay
          </Link>
          <Link
            href="/concierge"
            className="inline-flex h-11 items-center rounded-full px-6 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/10 active:scale-[0.98]"
          >
            See Stay & Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
