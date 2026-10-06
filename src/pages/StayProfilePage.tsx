import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, BedDouble, ExternalLink, Hotel, MapPin, Phone, Sparkles, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { discoverPlaces, originFor } from "@/lib/catalog";
import { hrefForPlace } from "@/lib/bio-handle";
import { fetchPropertyByHandle, stayKindLabel, stayPriceLabel } from "@/lib/properties";
import { setShareMeta } from "@/lib/share-meta";
import type { PropertyInfo } from "@shared/airpal-data";

/**
 * Public stay profile: an Airbnb-style listing page for one property.
 * Listing only — booking happens on the property's own site via their
 * outbound link. Demo, suspended, and unnamed docs render not-found.
 */
export function StayProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [found, setFound] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProperty(null);
    setFound(null);
    void fetchPropertyByHandle(handle || "").then((prop) => {
      if (cancelled) return;
      const listable = prop.name.trim() !== "" && prop.demo !== true && prop.status !== "suspended";
      setProperty(listable ? prop : null);
      setFound(listable);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    if (!property) return;
    setShareMeta({
      title: `${property.name} · Stay on AirPal.Me`,
      description: property.tagline || `${stayKindLabel(property.kind) || "Stay"} in ${property.city || "Australia"}`,
      image: property.heroImage || property.galleryImages?.[0],
      url: `/stay/@${handle}`,
    });
  }, [property, handle]);

  const around = useMemo(() => {
    if (!property) return [];
    const from = property.geo || property.coordinates;
    if (from) return discoverPlaces(from, undefined, "around").slice(0, 8);
    if (property.city) return discoverPlaces(originFor(), property.city, "city").slice(0, 8);
    return [];
  }, [property]);

  if (found === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Stay</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">
          No stay found{handle ? ` for @${handle}` : ""}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-mute">
          This listing doesn&apos;t exist or isn&apos;t public. Browse live stays instead.
        </p>
        <Link href="/stay" className="mt-5 inline-block">
          <Button>Browse stays</Button>
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading stay">
        <div className="h-64 animate-pulse rounded-[28px] bg-card ring-1 ring-line sm:h-80" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded-full bg-card ring-1 ring-line" />
        <div className="mt-2 h-5 w-1/3 animate-pulse rounded-full bg-card ring-1 ring-line" />
      </div>
    );
  }

  const price = stayPriceLabel(property);
  const gallery = [property.heroImage, ...(property.galleryImages || [])].filter(Boolean) as string[];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${property.name} ${property.address || property.city}`.trim(),
  )}`;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <Link
        href="/stay"
        className="inline-flex min-h-[44px] items-center gap-1.5 pt-4 text-sm font-semibold text-mute hover:text-ink"
      >
        <ArrowLeft size={15} /> All stays
      </Link>

      {gallery.length > 0 && (
        <div className={`mt-2 grid gap-2 ${gallery.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
          <Photo
            src={gallery[0]!}
            alt={property.name}
            className={`w-full rounded-[28px] object-cover ${gallery.length > 1 ? "col-span-3 h-64 sm:h-80" : "h-64 sm:h-80"}`}
          />
          {gallery.slice(1, 4).map((src) => (
            <Photo thumb key={src} src={src} alt={property.name} className="h-28 w-full rounded-3xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-brand ring-1 ring-brand/20">
              <Hotel size={13} /> {stayKindLabel(property.kind) || "Stay"}
            </span>
            {price && <span className="rounded-full bg-paper px-3 py-1 text-ink ring-1 ring-line">{price}</span>}
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{property.name}</h1>
          {property.tagline && <p className="mt-1 text-[15px] text-mute">{property.tagline}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-mute">
            <MapPin size={14} className="shrink-0 text-brand" />
            <span className="truncate">{property.address || property.city}</span>
          </p>
        </div>

        <div className="shrink-0 rounded-[28px] bg-card p-4 ring-1 ring-line lg:w-72">
          {property.bookingUrl ? (
            <>
              <a
                href={property.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.98]"
              >
                {property.bookingLabel || "Book direct"} <ExternalLink size={15} />
              </a>
              <p className="mt-2 text-center text-xs text-mute">
                Booking happens on the property&apos;s site — AirPal only lists.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-ink">Contact the property to book</p>
              <div className="mt-2 flex flex-col gap-2">
                {property.phone && (
                  <a
                    href={`tel:${property.phone.replace(/\s+/g, "")}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white"
                  >
                    <Phone size={15} /> {property.phone}
                  </a>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line"
                >
                  Get directions
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {(property.checkIn || property.checkOut || property.cancellationPolicy) && (
        <dl className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {property.checkIn && (
            <div className="rounded-3xl bg-card p-4 ring-1 ring-line">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-mute">Check-in</dt>
              <dd className="mt-0.5 text-sm font-bold text-ink">{property.checkIn}</dd>
            </div>
          )}
          {property.checkOut && (
            <div className="rounded-3xl bg-card p-4 ring-1 ring-line">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-mute">Check-out</dt>
              <dd className="mt-0.5 text-sm font-bold text-ink">{property.checkOut}</dd>
            </div>
          )}
          {property.cancellationPolicy && (
            <div className="rounded-3xl bg-card p-4 ring-1 ring-line">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-mute">Cancellation</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{property.cancellationPolicy}</dd>
            </div>
          )}
        </dl>
      )}

      {property.facilities.length > 0 && (
        <section aria-label="Facilities" className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink">Facilities</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {property.facilities.map((facility) => (
              <li
                key={facility.id || facility.name}
                className="rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-semibold text-ink ring-1 ring-line"
              >
                {facility.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {property.roomTypes && property.roomTypes.length > 0 && (
        <section aria-label="Rooms" className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink">Rooms</h2>
          <ul className="mt-2 space-y-2">
            {property.roomTypes.map((room) => (
              <li
                key={room.id}
                className="flex items-center justify-between gap-3 rounded-3xl bg-card p-4 ring-1 ring-line"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <BedDouble size={17} className="shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{room.name}</span>
                    <span className="block truncate text-xs text-mute">
                      {[room.bedConfig, room.capacity ? `Sleeps ${room.capacity}` : ""].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                {typeof room.startingPrice === "number" && room.startingPrice > 0 && (
                  <span className="shrink-0 text-sm font-bold text-ink">from ${room.startingPrice}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mute">Room availability and booking happen on the property&apos;s site.</p>
        </section>
      )}

      {property.wifi?.speed && (
        <p className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <Wifi size={13} /> {property.wifi.speed}
        </p>
      )}

      {around.length > 0 && (
        <section aria-label="What's around" className="mt-8">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            {property.geo || property.coordinates ? `Around ${property.name}` : `More in ${property.city}`}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {around.map((place) => (
              <Link
                key={place.id}
                href={hrefForPlace(place)}
                className="rounded-3xl bg-card p-4 ring-1 ring-line transition hover:ring-brand/30"
              >
                <p className="truncate text-sm font-bold text-ink">{place.name}</p>
                <p className="mt-0.5 truncate text-xs capitalize text-mute">{place.category}</p>
                {place.walk && <p className="mt-1 text-xs font-semibold text-brand">{place.walk}</p>}
                {place.deal && (
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-ink">
                    <Sparkles size={11} /> {place.deal.badge}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Stay & Guide add-on" className="mt-8 rounded-[28px] bg-paper p-6 ring-1 ring-line">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Additional service</p>
        <h2 className="font-display mt-1 text-lg font-bold text-ink">Plus Stay & Guide in every room</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/80">
          Every room includes the QR Stay & Guide, all in one — Wi-Fi, dining, housekeeping and local tips with no
          download.
        </p>
        <Link
          href="/concierge"
          className="mt-3 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
        >
          See Stay & Guide
        </Link>
      </section>
    </div>
  );
}
