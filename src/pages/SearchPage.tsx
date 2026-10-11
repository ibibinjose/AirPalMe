import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Search,
  MapPin,
  CalendarDays,
  Sparkles,
  Users,
  Building2,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  TrendingUp,
  Ticket,
  Footprints,
  HeartHandshake,
} from "lucide-react";
import { useSearchQueryLogger, usePopularSearches } from "@/hooks/useSearchQueryLogger";
import { activePlaces, placesForLocation, toursForPrecinct } from "@/lib/catalog";
import { hrefForPlace, handleOfPlace } from "@/lib/bio-handle";
import { useLocalNow } from "@/hooks/useLocalNow";
import { cityMatches } from "@/lib/remote-events";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { isTicketed } from "@shared/plan";
import { loadTours } from "@/lib/tours-store";
import { bioPath, bioKindLabel, type BioProfile } from "@shared/bio";
import { fetchPublicBio, loadBios } from "@/lib/bio-store";
import { listPeople } from "@/lib/people";
import { highlightSearchMatch, profileMatchesSearch, scoreSearchItem, searchNeedle } from "@/lib/search-query";
import { type Promotion } from "@shared/promotions";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs, query as firestoreQuery, where } from "firebase/firestore";
import { useEvents } from "@/contexts/EventsContext";
import { useListings } from "@/contexts/ListingsContext";
import { usePlans } from "@/contexts/PlanContext";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";
import { type SearchCategory } from "@/components/search/openSearch";

interface SearchResultItem {
  id: string;
  category: "place" | "event" | "deal" | "plan" | "partner" | "person";
  title: string;
  subtitle: string;
  description?: string;
  badge?: string;
  href: string;
  icon: typeof Compass;
  score?: number;
  image?: string;
}

const CATEGORY_TABS = [
  { id: "all" as SearchCategory, label: "All" },
  { id: "places" as SearchCategory, label: "Places" },
  { id: "events" as SearchCategory, label: "Events" },
  { id: "deals" as SearchCategory, label: "Deals" },
  { id: "circle" as SearchCategory, label: "Circle" },
  { id: "plans" as SearchCategory, label: "Plans" },
  { id: "people" as SearchCategory, label: "People" },
];

const SUGGESTED_QUERIES = [
  "Surry Hills coffee",
  "The Glenmore rooftop",
  "Live music tonight",
  "Indian festival",
  "Happy hour deals",
  "Networking circle",
];

export function SearchPage() {
  const [, nav] = useLocation();
  const searchString = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize query and category from URL query parameters
  const initialParams = useMemo(() => {
    try {
      const sp = new URLSearchParams(searchString || window.location.search);
      return {
        q: sp.get("q") || "",
        category: (sp.get("category") as SearchCategory) || "all",
      };
    } catch {
      return { q: "", category: "all" as SearchCategory };
    }
  }, [searchString]);

  const [query, setQuery] = useState(initialParams.q);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>(initialParams.category);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [handleBio, setHandleBio] = useState<BioProfile | null>(null);

  const { version: catalogVersion } = useListings();
  const { calendarEvents } = useEvents();
  const { plans } = usePlans();
  const { here, city, usingGps } = useLocalNow();
  const { trackQuery, logResultClick } = useSearchQueryLogger({ source: "search_page" });
  const { popularTerms } = usePopularSearches({ limit: 8 });

  // Sync state when URL params change externally
  useEffect(() => {
    if (initialParams.q !== query) setQuery(initialParams.q);
    if (initialParams.category !== activeCategory) setActiveCategory(initialParams.category);
  }, [initialParams]);

  // Update browser URL query params without full reload
  const updateUrlParams = (newQ: string, newCat: SearchCategory) => {
    try {
      const params = new URLSearchParams();
      if (newQ.trim()) params.set("q", newQ.trim());
      if (newCat !== "all") params.set("category", newCat);
      const queryString = params.toString();
      const newUrl = queryString ? `/search?${queryString}` : "/search";
      window.history.replaceState(null, "", newUrl);
    } catch {
      /* ignore */
    }
  };

  // Load promotions from Firestore on mount
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    let cancelled = false;
    getDocs(firestoreQuery(collection(db, "promotions"), where("status", "in", ["live", "approved"])))
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Promotion, "id">),
        }));
        setPromotions(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Exact @handle lookup
  useEffect(() => {
    const needle = searchNeedle(query);
    if (!needle.looksLikeHandle) {
      setHandleBio(null);
      return;
    }
    let cancelled = false;
    void fetchPublicBio(needle.handle)
      .then((bio) => {
        if (!cancelled) setHandleBio(bio);
      })
      .catch(() => {
        if (!cancelled) setHandleBio(null);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Full multi-vertical search indexer
  const allResults = useMemo<SearchResultItem[]>(() => {
    const needle = searchNeedle(query);
    const q = needle.text.replace(/^@+/, "");
    const items: SearchResultItem[] = [];
    const seenPerson = new Set<string>();

    // 0. Bios by @handle
    if (handleBio && profileMatchesSearch(handleBio, needle)) {
      const bioScore = scoreSearchItem(
        {
          title: handleBio.name || `@${handleBio.handle}`,
          subtitle: handleBio.shortWhy,
          handle: handleBio.handle,
          category: handleBio.kind,
        },
        query,
      );
      items.push({
        id: `bio-${handleBio.id || handleBio.handle}`,
        category: "person",
        title: handleBio.name || `@${handleBio.handle}`,
        subtitle: `@${handleBio.handle}${handleBio.shortWhy ? ` · ${handleBio.shortWhy}` : ""}`,
        description: handleBio.shortWhy,
        badge: bioKindLabel(handleBio.kind),
        href: bioPath(handleBio.handle),
        icon: HeartHandshake,
        score: bioScore || 120,
        image: handleBio.avatar,
      });
      seenPerson.add(handleBio.handle);
    }
    for (const bio of loadBios()) {
      if (seenPerson.has(bio.handle)) continue;
      const bioScore = scoreSearchItem(
        {
          title: bio.name || `@${bio.handle}`,
          subtitle: bio.shortWhy,
          handle: bio.handle,
          category: bio.kind,
        },
        query,
      );
      if (bioScore > 0 || profileMatchesSearch(bio, needle)) {
        items.push({
          id: `bio-${bio.id || bio.handle}`,
          category: "person",
          title: bio.name || `@${bio.handle}`,
          subtitle: `@${bio.handle}${bio.shortWhy ? ` · ${bio.shortWhy}` : ""}`,
          description: bio.shortWhy,
          badge: bioKindLabel(bio.kind),
          href: bioPath(bio.handle),
          icon: HeartHandshake,
          score: bioScore || 80,
          image: bio.avatar,
        });
        seenPerson.add(bio.handle);
      }
    }
    for (const person of listPeople()) {
      const pScore = scoreSearchItem(
        {
          title: person.name,
          subtitle: person.whereMet,
          handle: person.handle,
        },
        query,
      );
      if (pScore > 0) {
        items.push({
          id: `met-${person.id}`,
          category: "person",
          title: person.name,
          subtitle: person.handle ? `@${person.handle}` : person.whereMet || "People you met",
          badge: "Met",
          href: person.handle ? bioPath(person.handle) : "/me",
          icon: HeartHandshake,
          score: pScore,
        });
      }
    }

    // 1. Places (live catalog)
    const placesPool = q ? activePlaces() : placesForLocation(activePlaces(), here, city, usingGps);
    for (const p of placesPool) {
      const placeHandle = handleOfPlace(p) || "";
      const pScore = scoreSearchItem(
        {
          title: p.name,
          subtitle: p.shortWhy || p.address,
          description: p.description,
          category: p.category,
          handle: placeHandle,
          tags: p.deal ? [p.deal.badge, p.deal.detail] : undefined,
        },
        query,
      );
      if (pScore > 0 || !q) {
        items.push({
          id: `place-${p.id}`,
          category: "place",
          title: p.name,
          subtitle: p.shortWhy || p.address || p.category,
          description: p.description,
          badge: p.category,
          href: hrefForPlace(p),
          icon: MapPin,
          score: pScore,
          image: p.heroImage || p.photos?.[0],
        });
      }
    }

    // 2. Events (calendar events)
    for (const e of calendarEvents) {
      if (!cityMatches(e.city, city)) continue;
      const eScore = scoreSearchItem(
        {
          title: e.title,
          subtitle: `${e.timeLabel} · ${e.venue}`,
          description: e.description,
          category: e.categoryLabel || e.category,
          keywords: [e.venue, e.city],
        },
        query,
      );
      if (eScore > 0 || !q) {
        items.push({
          id: `event-${e.id}`,
          category: "event",
          title: e.title,
          subtitle: `${e.timeLabel} · ${e.venue}`,
          description: e.description,
          badge: e.categoryLabel,
          href: `/calendar?event=${e.id}`,
          icon: CalendarDays,
          score: eScore,
          image: e.heroImage,
        });
      }
    }

    // 3. Deals & Promotions (Pillar 4)
    for (const promo of promotions) {
      const promoScore = scoreSearchItem(
        {
          title: promo.title,
          subtitle: `${promo.sponsorName} · ${promo.category}`,
          description: promo.description,
          category: promo.category,
          tags: [promo.kind, promo.status],
          keywords: [
            promo.sponsorName,
            promo.prize?.title || "",
            promo.prizeValue || "",
            "deal",
            "perk",
            "discount",
            "offer",
          ],
        },
        query,
      );
      if (promoScore > 0 || !q) {
        items.push({
          id: `promo-${promo.id}`,
          category: "deal",
          title: promo.title,
          subtitle: `${promo.sponsorName} · ${promo.prize?.title || promo.category}`,
          description: promo.description,
          badge: promo.prizeValue || "Perk",
          href: `/deals/${promo.id}`,
          icon: Sparkles,
          score: promoScore,
          image: promo.heroImage,
        });
      }
    }

    // 4. AirPal Pass & Ticketing Shortcuts
    const passKeywords = [
      "pass",
      "ticket",
      "tickets",
      "admission",
      "scanner",
      "scan",
      "wallet",
      "gig",
      "mela",
      "festival",
      "concert",
    ];
    if (passKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "airpal-pass",
        category: "event",
        title: "AirPal Pass",
        subtitle: "Live concerts, Indian festivals & digital passbook tickets",
        description: "Official ticketing hub for authentic cultural and live music events.",
        badge: "Pass",
        href: "/pass",
        icon: Ticket,
        score: 95,
      });
      items.push({
        id: "my-tickets",
        category: "event",
        title: "My Ticket Wallet",
        subtitle: "View saved passes, dynamic QR entry barcodes & receipts",
        description: "Offline-ready digital passbook and door admission barcodes.",
        badge: "Wallet",
        href: "/me/tickets",
        icon: Sparkles,
        score: 90,
      });
    }

    // 5. Circle / Networking shortcuts
    const circleKeywords = [
      "circle",
      "network",
      "meet",
      "hangout",
      "catchup",
      "cohort",
      "campus",
      "presence",
      "here",
      "bio",
      "handle",
    ];
    if (circleKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "circle-hub",
        category: "person",
        title: "Networking Circle",
        subtitle: "Check in, live presence & connect nearby",
        badge: "Circle",
        href: "/circle",
        icon: Users,
        score: 88,
      });
    }

    // 6. Plans & Hangouts
    const openPlans = plans.filter(
      (p) =>
        p.isPublic &&
        p.status === "open" &&
        locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M),
    );
    for (const p of openPlans) {
      const planScore = scoreSearchItem(
        {
          title: p.title,
          subtitle: `${p.destination || p.city} · ${p.date}`,
          description: p.notes,
          keywords: [p.destination, p.city],
        },
        query,
      );
      if (planScore > 0 || !q) {
        items.push({
          id: `plan-${p.id}`,
          category: "plan",
          title: p.title,
          subtitle: `${p.destination || p.city} · ${p.date}`,
          description: p.notes,
          badge: isTicketed(p) ? `$${p.pricePerPerson}` : p.isExperience ? "Free" : "Plan",
          href: `/plan/${p.id}`,
          icon: Users,
          score: planScore,
        });
      }
    }

    // 7. Guided Walks / Precinct Tours
    for (const t of toursForPrecinct(usingGps ? city : city || "", loadTours())) {
      const tourScore = scoreSearchItem(
        {
          title: t.title,
          subtitle: `${t.city} · guided walk`,
          keywords: [t.city],
        },
        query,
      );
      if (tourScore > 0 || !q) {
        items.push({
          id: `tour-${t.id}`,
          category: "place",
          title: t.title,
          subtitle: `${t.city} · guided walk`,
          description: t.tagline,
          badge: "Walk",
          href: `/tour/${t.id}`,
          icon: Footprints,
          score: tourScore,
        });
      }
    }

    // 8. Arrival Engine & Campus Cohorts
    const arrivalKeywords = [
      "arrival",
      "campus",
      "unsw",
      "uts",
      "usyd",
      "college",
      "dorm",
      "student",
      "scape",
      "iglu",
      "just got here",
    ];
    if (arrivalKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "arrival-engine",
        category: "person",
        title: "I Just Got Here — Arrival Engine",
        subtitle: "Connect with verified campus & PBSA building cohorts",
        badge: "Arrival",
        href: "/join",
        icon: Building2,
        score: 92,
      });
    }

    // Sort by relevance score descending
    items.sort((a, b) => (b.score || 0) - (a.score || 0));

    return items;
  }, [query, calendarEvents, plans, promotions, handleBio, here, city, usingGps, catalogVersion]);

  // Compute category counts
  const counts = useMemo(() => {
    return {
      all: allResults.length,
      places: allResults.filter((i) => i.category === "place").length,
      events: allResults.filter((i) => i.category === "event").length,
      deals: allResults.filter((i) => i.category === "deal").length,
      circle: allResults.filter((i) => i.category === "person").length,
      plans: allResults.filter((i) => i.category === "plan").length,
      people: allResults.filter((i) => i.category === "person").length,
    };
  }, [allResults]);

  // Filtered results according to active category tab
  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return allResults;
    if (activeCategory === "places") return allResults.filter((i) => i.category === "place");
    if (activeCategory === "events") return allResults.filter((i) => i.category === "event");
    if (activeCategory === "deals") return allResults.filter((i) => i.category === "deal");
    if (activeCategory === "circle") return allResults.filter((i) => i.category === "person");
    if (activeCategory === "plans" || activeCategory === "plan") return allResults.filter((i) => i.category === "plan");
    if (activeCategory === "people") return allResults.filter((i) => i.category === "person");
    return allResults;
  }, [allResults, activeCategory]);

  // Log queries
  useEffect(() => {
    if (query.trim().length >= 2) {
      trackQuery(query, filteredResults.length, activeCategory);
    }
  }, [query, filteredResults.length, activeCategory, trackQuery]);

  const handleSelectQuery = (term: string) => {
    void triggerHaptic("medium");
    setQuery(term);
    updateUrlParams(term, activeCategory);
    inputRef.current?.focus();
  };

  const handleCategoryChange = (cat: SearchCategory) => {
    void triggerHapticSelection();
    setActiveCategory(cat);
    updateUrlParams(query, cat);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28 md:px-6 md:py-10">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            if (window.history.length > 1) {
              window.history.back();
            } else {
              nav("/");
            }
          }}
          className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-card ring-1 ring-line/80 text-mute hover:text-ink hover:bg-paper transition cursor-pointer active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Search AirPal</h1>
          <p className="text-xs text-mute mt-0.5 truncate">
            Places, live events, member dining perks, circles & hangouts
          </p>
        </div>
      </div>

      {/* Hero Search Input */}
      <div className="mt-5 relative flex items-center">
        <div className="relative flex-1 flex items-center">
          <Search size={20} className="absolute left-4 text-accent pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              updateUrlParams(val, activeCategory);
            }}
            placeholder="Search places, events, deals, circles, plans…"
            className="h-13 min-h-[48px] w-full rounded-2xl bg-card pl-12 pr-12 text-[16px] font-medium text-ink ring-1 ring-line/90 shadow-sm placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setQuery("");
                updateUrlParams("", activeCategory);
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-paper hover:text-ink transition active:scale-95 cursor-pointer"
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => {
          const count = counts[tab.id as keyof typeof counts] || 0;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleCategoryChange(tab.id)}
              className={cn(
                "inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition cursor-pointer active:scale-95 min-h-[38px] touch-manipulation",
                isActive
                  ? "bg-brand text-white shadow-xs"
                  : "bg-card text-mute hover:bg-paper hover:text-ink ring-1 ring-line/80",
              )}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-paper text-mute",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Suggested / Popular Searches when query is empty */}
      {!query.trim() && (
        <div className="mt-8 space-y-6">
          {/* Popular searches */}
          {popularTerms.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                <TrendingUp size={14} />
                <span>Trending Searches</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {popularTerms.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => handleSelectQuery(pt.term)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper hover:ring-brand/40 transition active:scale-95 cursor-pointer"
                  >
                    <Search size={12} className="text-accent" />
                    <span>{pt.term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick inspiration chips */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mute">Explore Sydney</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => handleSelectQuery(sq)}
                  className="rounded-full bg-paper px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line/70 hover:bg-card hover:ring-brand/40 transition active:scale-95 cursor-pointer"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Grid */}
      <div className="mt-6 space-y-2.5">
        {filteredResults.length > 0 ? (
          filteredResults.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-label={item.title}
                onClick={() => {
                  void triggerHaptic("light");
                  logResultClick(query, {
                    id: item.id,
                    title: item.title,
                    category: item.category,
                    href: item.href,
                  });
                }}
                className="group flex items-start sm:items-center justify-between gap-3.5 rounded-2xl bg-card p-3.5 ring-1 ring-line/80 shadow-xs hover:bg-paper/80 hover:ring-brand/30 transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {item.image ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-line">
                      <Photo src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent ring-1 ring-brand/15 group-hover:bg-brand group-hover:text-white transition">
                      <Icon size={20} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-[15px] font-bold text-ink truncate">
                        {highlightSearchMatch(item.title, query).map((seg, i) =>
                          seg.match ? (
                            <span key={i} className="text-accent font-extrabold">
                              {seg.text}
                            </span>
                          ) : (
                            <span key={i}>{seg.text}</span>
                          ),
                        )}
                      </h2>
                      {item.badge && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-accent ring-1 ring-line shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-mute truncate">
                      {highlightSearchMatch(item.subtitle, query).map((seg, i) =>
                        seg.match ? (
                          <span key={i} className="text-ink font-semibold">
                            {seg.text}
                          </span>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        ),
                      )}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-[11px] text-mute/80 line-clamp-1 hidden sm:block">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <span className="grid h-8 w-8 place-items-center rounded-full text-mute group-hover:text-accent group-hover:translate-x-0.5 transition">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            );
          })
        ) : query.trim() ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-line">
            <Compass size={32} className="mx-auto text-mute/60 mb-3" />
            <h3 className="font-display text-base font-bold text-ink">No results for &ldquo;{query}&rdquo;</h3>
            <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
              We couldn&apos;t find matching places, events, or deals for that search. Try one of our suggested
              categories or popular queries.
            </p>
            <div className="mt-5 flex justify-center gap-2 flex-wrap">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("all");
                  updateUrlParams("", "all");
                }}
              >
                Clear Search
              </Button>
              <Button variant="primary" size="sm" onClick={() => nav("/now")}>
                Discover on What Now
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
