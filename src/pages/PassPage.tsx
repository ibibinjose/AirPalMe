import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Gift,
  MapPin,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { recordToCalendarBase, cityMatches } from "@/lib/remote-events";
import { EcosystemSwitcher } from "@/components/brand/EcosystemSwitcher";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/Photo";
import { mediaSrcSet } from "@/lib/media-srcset";
import { type Promotion } from "@shared/promotions";
import { promoArtFor } from "@/lib/promotions";
import type { Booking } from "@shared/booking";

type PassCategory = "all" | "cultural" | "music" | "deals" | "nightlife" | "community";

const PASS_CATEGORIES: { id: PassCategory; label: string; icon: string }[] = [
  { id: "all", label: "All Access", icon: "🎟️" },
  { id: "cultural", label: "Indian & Cultural", icon: "🪔" },
  { id: "music", label: "Concerts & Gigs", icon: "🎵" },
  { id: "deals", label: "Dining Deals", icon: "🎁" },
  { id: "nightlife", label: "Nightlife & Clubs", icon: "🍸" },
  { id: "community", label: "Community & Expos", icon: "✨" },
];

export function PassPage() {
  const { user } = useAuth();
  const { calendarEvents, events } = useEvents();
  const { city, today } = useLocalNow();
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const [activeCategory, setActiveCategory] = useState<PassCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [myTickets, setMyTickets] = useState<Booking[]>([]);

  // Load user's active tickets/passes
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !user?.uid) {
      setMyTickets([]);
      return;
    }
    let cancelled = false;
    void getDocs(
      query(collection(db, "bookings"), where("customerUid", "==", user.uid), orderBy("createdAt", "desc")),
    )
      .then((snap) => {
        if (!cancelled) setMyTickets(snap.docs.map((d) => d.data() as Booking));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Load live promotions/deals
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    let cancelled = false;
    void getDocs(
      query(
        collection(db, "promotions"),
        where("kind", "==", "promotion"),
        where("status", "in", ["live", "approved"]),
      ),
    )
      .then((snap) => {
        if (!cancelled) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }));
          list.sort((a, b) => (a.endAt || "").localeCompare(b.endAt || ""));
          setPromotions(list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered upcoming events list
  const filteredEvents = useMemo(() => {
    const seen = new Set<string>();
    const all = [];

    for (const e of calendarEvents) {
      if (e.date < today) continue;
      if (!cityMatches(e.city, effectiveCity)) continue;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      all.push({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.timeLabel,
        venue: e.venue || e.city || "Sydney",
        category: e.category || "community",
        image: e.heroImage || "/media/live-music.jpg",
        priceLabel: e.ticketPrice || (e.ticketPriceCents ? `$${Math.round(e.ticketPriceCents / 100)}` : "Free Pass"),
        isFree: !e.ticketPriceCents || (e.ticketPrice ? e.ticketPrice.toLowerCase().includes("free") : false),
      });
    }

    for (const r of events) {
      if (r.status !== "live") continue;
      const base = recordToCalendarBase(r);
      if (base.date < today) continue;
      if (!cityMatches(base.city, effectiveCity)) continue;
      if (seen.has(base.id)) continue;
      seen.add(base.id);
      all.push({
        id: base.id,
        title: base.title,
        date: base.date,
        time: base.timeLabel,
        venue: base.venue || base.city || "Sydney",
        category: base.category || "community",
        image: base.heroImage || "/media/live-music.jpg",
        priceLabel: base.ticketPrice || (base.ticketPriceCents ? `$${Math.round(base.ticketPriceCents / 100)}` : "Free Pass"),
        isFree: !base.ticketPriceCents || (base.ticketPrice ? base.ticketPrice.toLowerCase().includes("free") : false),
      });
    }

    // Apply category filter
    return all.filter((item) => {
      const titleLower = item.title.toLowerCase();
      const catLower = item.category.toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      if (q && !titleLower.includes(q) && !item.venue.toLowerCase().includes(q)) {
        return false;
      }

      if (activeCategory === "cultural") {
        return (
          catLower.includes("cultural") ||
          catLower.includes("community") ||
          titleLower.includes("diwali") ||
          titleLower.includes("dandiya") ||
          titleLower.includes("bollywood") ||
          titleLower.includes("holi") ||
          titleLower.includes("india") ||
          titleLower.includes("garba") ||
          titleLower.includes("bhangra") ||
          titleLower.includes("desi")
        );
      }
      if (activeCategory === "music") {
        return catLower.includes("music") || catLower.includes("concert") || titleLower.includes("live") || titleLower.includes("band");
      }
      if (activeCategory === "nightlife") {
        return catLower.includes("club") || catLower.includes("bar") || titleLower.includes("night") || titleLower.includes("party");
      }
      if (activeCategory === "community") {
        return catLower.includes("community") || catLower.includes("market") || catLower.includes("expo");
      }
      return true;
    });
  }, [calendarEvents, events, today, activeCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 md:px-6">
      {/* Top Switcher Bar */}
      <div className="pt-4 flex items-center justify-between gap-3">
        <EcosystemSwitcher currentPath="/pass" variant="header" />
        <Link
          href="/me/tickets"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-bold text-ink ring-1 ring-line shadow-xs hover:bg-paper transition"
        >
          <QrCode size={14} className="text-accent" />
          <span>My Passes ({myTickets.length})</span>
        </Link>
      </div>

      {/* Hero Pass Section */}
      <header className="relative mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950 text-white shadow-lg">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />

        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex flex-wrap items-center gap-3">
            <img
              src="/brand/airpal-pass-logo-white.png"
              alt="AirPal Pass"
              className="h-8 sm:h-10 w-auto object-contain drop-shadow-md"
            />
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30 backdrop-blur-md">
              <Ticket size={13} />
              <span>{effectiveCity} · Experiences</span>
            </div>
          </div>

          <h1 className="font-display mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-[1.1]">
            Your pass to experiences.
          </h1>
          <p className="mt-2 text-base sm:text-lg font-medium text-white/80 max-w-xl">
            Discover what's happening. Get access. Save money.
          </p>

          {/* Quick Search Input */}
          <div className="mt-6 max-w-xl">
            <div className="relative flex items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md focus-within:ring-amber-400">
              <Search size={18} className="absolute left-4 text-white/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concerts, Bollywood nights, food deals, festivals…"
                className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder-white/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Pass Action Highlights */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/events"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-neutral-950 shadow-md transition hover:brightness-110 active:scale-95"
            >
              <Flame size={16} />
              Browse What's On
            </Link>
            <Link
              href="/deals"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition hover:bg-white/25 active:scale-95"
            >
              <Gift size={16} />
              Member Deals
            </Link>
            <Link
              href="/scan"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/20 transition hover:bg-white/20 active:scale-95"
            >
              <QrCode size={15} />
              Door Scanner
            </Link>
          </div>
        </div>
      </header>

      {/* Category Pills Strip */}
      <nav aria-label="Experience Categories" className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {PASS_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setActiveCategory(cat.id);
              }}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer active:scale-95",
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 ring-1 ring-neutral-900 shadow-sm"
                  : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Pass Wallet Bar (For Signed-In Members) */}
      <section aria-label="Passbook Wallet" className="mt-6">
        <div className="rounded-3xl bg-gradient-to-r from-card via-card to-paper p-5 ring-1 ring-line shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                <Ticket size={24} />
              </div>
              <div>
                <p className="font-display text-base font-bold text-ink">
                  {user ? "Your AirPal Passbook is Live" : "One Account · Universal Pass"}
                </p>
                <p className="text-xs text-mute mt-0.5">
                  {user
                    ? `You currently hold ${myTickets.length} active event pass${myTickets.length === 1 ? "" : "es"}.`
                    : "Sign in with your AirPal account to store scannable tickets and unlock member perks."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/me/tickets"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
              >
                <QrCode size={14} />
                Open Wallet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Events & Festivals Feed */}
      <section aria-label="Upcoming Events" className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {activeCategory === "cultural"
                ? "Indian & Cultural Festivals"
                : activeCategory === "music"
                  ? "Live Concerts & Gigs"
                  : "Featured Events & Experiences"}
            </h2>
            <p className="text-xs text-mute mt-0.5">Real events happening in {effectiveCity} · Guaranteed entry</p>
          </div>
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center text-xs font-bold text-accent hover:underline"
          >
            See Calendar →
          </Link>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-card p-10 text-center ring-1 ring-line shadow-xs">
            <Ticket size={32} className="mx-auto text-mute" />
            <p className="font-display text-base font-bold text-ink mt-2">No events match this filter</p>
            <p className="text-xs text-mute mt-1">Try selecting "All Access" or explore upcoming calendar dates.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 py-2 text-xs font-bold text-white"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.slice(0, 9).map((event) => (
              <div
                key={event.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-card ring-1 ring-line/80 shadow-xs transition hover:shadow-md hover:ring-brand/30"
              >
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper">
                    <Photo
                      src={event.image}
                      srcSet={mediaSrcSet(event.image)}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      alt={event.title}
                    />
                    <div className="absolute left-3 top-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                        <CalendarDays size={12} className="text-amber-400" />
                        {event.date} {event.time ? `· ${event.time}` : ""}
                      </span>
                    </div>
                    <div className="absolute right-3 top-3">
                      <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-neutral-950 shadow-xs">
                        {event.priceLabel}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="font-display text-base font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">
                      {event.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-mute line-clamp-1">
                      <MapPin size={13} className="shrink-0 text-accent" />
                      <span>{event.venue}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <Link
                    href={`/e/${event.id}`}
                    className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand/90 active:scale-95"
                  >
                    <Ticket size={13} />
                    <span>Get Pass</span>
                  </Link>
                  <Link
                    href={`/plan/new?title=${encodeURIComponent(event.title)}&date=${event.date}`}
                    title="Add to my AirPal.Me Day Plan"
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-paper px-3 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
                  >
                    <Sparkles size={13} className="text-accent" />
                    <span className="hidden sm:inline">Add to Plan</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Exclusive Dining & Local Deals Section */}
      <section aria-label="Passholder Deals" className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Passholder Perks</span>
            <h2 className="font-display text-xl font-bold text-ink mt-0.5">Dining Deals &amp; Freebies</h2>
          </div>
          <Link href="/deals" className="inline-flex min-h-[44px] items-center text-xs font-bold text-accent hover:underline">
            All Deals →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(promotions.length > 0 ? promotions : [
            {
              id: "demo-coffee",
              title: "Free Morning Coffee with Breakfast",
              businessName: "The Rocks Cafe",
              discountText: "100% Off",
              badge: "Perk",
              image: "/media/dining.jpg",
            },
            {
              id: "demo-2for1",
              title: "2-for-1 Signature Cocktails",
              businessName: "Harbour View Lounge",
              discountText: "2-for-1",
              badge: "Evening",
              image: "/media/drinks.jpg",
            },
            {
              id: "demo-dessert",
              title: "Complimentary Dessert with Mains",
              businessName: "Bennelong Bistro",
              discountText: "Free Sweet",
              badge: "Dining",
              image: "/media/food.jpg",
            },
          ]).slice(0, 3).map((deal, idx) => (
            <Link
              key={deal.id || idx}
              href={deal.id.startsWith("demo") ? "/deals" : `/deals/${deal.id}`}
              className="group flex items-center justify-between gap-3 rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-xs hover:shadow-md hover:ring-brand/30 transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper">
                  <Photo
                    src={"image" in deal && deal.image ? deal.image : promoArtFor(deal.id)}
                    className="h-full w-full object-cover"
                    alt={deal.title}
                  />
                </div>
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {"discountText" in deal && deal.discountText ? deal.discountText : "Exclusive Perk"}
                  </span>
                  <p className="font-display text-sm font-bold text-ink mt-0.5 truncate group-hover:text-accent transition-colors">
                    {deal.title}
                  </p>
                  <p className="text-[11px] text-mute truncate mt-0.5">
                    {"businessName" in deal ? deal.businessName : "Sydney Local Partner"}
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-mute group-hover:text-ink shrink-0 mr-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* For Organisers & Hosts */}
      <section aria-label="Event Organisers" className="mt-10">
        <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 md:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <ShieldCheck size={14} /> For Organisers &amp; Venues
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold mt-1 text-white">
                Host an Event or Publish a Pass
              </h3>
              <p className="text-xs sm:text-sm text-white/75 mt-1.5">
                List cultural festivals, music gigs, or community expos. Use our instant QR door scanner for check-in with zero extra hardware.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/event"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-neutral-950 shadow-xs hover:bg-neutral-100 transition active:scale-95"
              >
                <Plus size={14} />
                Host Event
              </Link>
              <Link
                href="/scan"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/30 hover:bg-white/25 transition active:scale-95"
              >
                <QrCode size={14} />
                Door Scanner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Connective Bridge: AirPal.Me */}
      <aside aria-label="Companion Bridge" className="mt-8">
        <EcosystemSwitcher variant="banner" />
      </aside>
    </div>
  );
}
