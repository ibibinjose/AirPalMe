import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, limit, query as fsQuery, where } from "firebase/firestore";
import {
  Search,
  MapPin,
  CalendarDays,
  Sparkles,
  Users,
  ArrowRight,
  Compass,
  HeartHandshake,
  Hotel,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useSearchQueryLogger, usePopularSearches } from "@/hooks/useSearchQueryLogger";
import { activePlaces, placeByHandle, placesForLocation } from "@/lib/catalog";
import { hrefForPlace, handleOfPlace, resolvePublicBio } from "@/lib/bio-handle";
import { useLocalNow } from "@/hooks/useLocalNow";
import { cityMatches } from "@/lib/remote-events";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { getFirebaseDb } from "@/lib/firebase";
import { aud, type Campaign } from "@shared/campaign";
import { isTicketed } from "@shared/plan";
import type { PublicMate } from "@shared/companion";
import { loadPublicMatesRemote } from "@/lib/companion-remote";
import { bioPath, bioKindLabel, type BioProfile } from "@shared/bio";
import { fetchPublicBio, loadBios } from "@/lib/bio-store";
import { listPeople } from "@/lib/people";
import { profileMatchesSearch, searchNeedle } from "@/lib/search-query";
import { useEvents } from "@/contexts/EventsContext";
import { useListings } from "@/contexts/ListingsContext";
import { usePlans } from "@/contexts/PlanContext";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";
import { SearchBar } from "@/components/search/SearchBar";

type SearchCategory = "all" | "people" | "places" | "events" | "stay" | "plan" | "experiences";

interface SearchResultItem {
  id: string;
  category: "place" | "event" | "stay" | "plan" | "partner" | "experience" | "person";
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
  icon: typeof Compass;
}

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "people", label: "People & Mates", icon: HeartHandshake },
  { id: "places", label: "Places", icon: MapPin },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "experiences", label: "Experiences", icon: Sparkles },
  { id: "stay", label: "Stays", icon: Hotel },
  { id: "plan", label: "Plans", icon: Users },
] as const;

export function SearchPage() {
  const [, nav] = useLocation();
  const { version: catalogVersion } = useListings();
  const { calendarEvents } = useEvents();
  const { plans } = usePlans();
  const { here, city, usingGps } = useLocalNow();

  // Read initial query and category from browser location search params
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });

  const [activeCategory, setActiveCategory] = useState<SearchCategory>(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category") as SearchCategory | null;
    return cat && CATEGORY_TABS.some((t) => t.id === cat) ? cat : "all";
  });

  const [liveExperiences, setLiveExperiences] = useState<Campaign[]>([]);
  const [publicMates, setPublicMates] = useState<PublicMate[]>([]);
  const [handleBio, setHandleBio] = useState<BioProfile | null>(null);

  const { trackQuery, logResultClick } = useSearchQueryLogger({ source: "search_page" });
  const { popularTerms } = usePopularSearches({ limit: 8 });

  // Sync URL when query or category changes without reloading
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeCategory !== "all") params.set("category", activeCategory);
    const newSearch = params.toString();
    const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [query, activeCategory]);

  // Load experiences and mates
  useEffect(() => {
    const db = getFirebaseDb();
    if (db) {
      void getDocs(fsQuery(collection(db, "campaigns"), where("status", "==", "live"), limit(25)))
        .then((snap) => setLiveExperiences(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, "id">) }))))
        .catch(() => undefined);
    }
    void loadPublicMatesRemote()
      .then(setPublicMates)
      .catch(() => undefined);
  }, []);

  // Handle @handle lookup
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

  // Build indexed search results
  const allResults = useMemo<SearchResultItem[]>(() => {
    const needle = searchNeedle(query);
    const q = needle.text.replace(/^@+/, "");
    const items: SearchResultItem[] = [];
    const seenPerson = new Set<string>();

    function pushPerson(item: SearchResultItem) {
      if (seenPerson.has(item.id)) return;
      seenPerson.add(item.id);
      items.push(item);
    }

    if (!q) {
      // Empty query default recommendations across verticals
      for (const m of publicMates.slice(0, 6)) {
        pushPerson({
          id: `mate-${m.uid}`,
          category: "person",
          title: m.firstName,
          subtitle: [m.suburb || m.city, m.interests[0]].filter(Boolean).join(" · ") || "Approved Mate",
          badge: "Mate",
          href: "/mate",
          icon: HeartHandshake,
        });
      }
      for (const p of placesForLocation(activePlaces(), here, city, usingGps).slice(0, 8)) {
        items.push({
          id: `place-${p.id}`,
          category: "place",
          title: p.name,
          subtitle: p.shortWhy || p.address || p.category,
          badge: p.category,
          href: hrefForPlace(p),
          icon: MapPin,
        });
      }
      for (const e of calendarEvents.filter((ev) => cityMatches(ev.city, city)).slice(0, 6)) {
        items.push({
          id: `event-${e.id}`,
          category: "event",
          title: e.title,
          subtitle: `${e.timeLabel} · ${e.venue}`,
          badge: e.categoryLabel,
          href: `/calendar?event=${e.id}`,
          icon: CalendarDays,
        });
      }
      for (const c of liveExperiences.slice(0, 6)) {
        items.push({
          id: `experience-${c.id}`,
          category: "experience",
          title: c.title,
          subtitle: `${c.businessName} · ${c.suburb} · ${c.date}`,
          badge: c.priceCents > 0 ? aud(c.priceCents) : "Free",
          href: "/experiences",
          icon: Sparkles,
        });
      }
      return items;
    }

    // 1. People & Mates
    if (handleBio && profileMatchesSearch(handleBio, needle)) {
      pushPerson({
        id: `bio-${handleBio.id || handleBio.handle}`,
        category: "person",
        title: handleBio.name || `@${handleBio.handle}`,
        subtitle: `@${handleBio.handle}${handleBio.shortWhy ? ` · ${handleBio.shortWhy}` : ""}`,
        badge: bioKindLabel(handleBio.kind),
        href: bioPath(handleBio.handle),
        icon: HeartHandshake,
      });
    }
    for (const bio of loadBios()) {
      if (!profileMatchesSearch(bio, needle)) continue;
      pushPerson({
        id: `bio-${bio.id || bio.handle}`,
        category: "person",
        title: bio.name || `@${bio.handle}`,
        subtitle: `@${bio.handle}${bio.shortWhy ? ` · ${bio.shortWhy}` : ""}`,
        badge: bioKindLabel(bio.kind),
        href: bioPath(bio.handle),
        icon: HeartHandshake,
      });
    }
    if (needle.looksLikeHandle) {
      const resolved = resolvePublicBio(needle.handle, (h) => loadBios().find((b) => b.handle === h));
      if (resolved) {
        pushPerson({
          id: `bio-${resolved.id || resolved.handle}`,
          category: "person",
          title: resolved.name || `@${resolved.handle}`,
          subtitle: `@${resolved.handle}${resolved.shortWhy ? ` · ${resolved.shortWhy}` : ""}`,
          badge: bioKindLabel(resolved.kind),
          href: bioPath(resolved.handle),
          icon: HeartHandshake,
        });
      } else {
        const place = placeByHandle(needle.handle);
        if (place) {
          items.push({
            id: `place-handle-${place.id}`,
            category: "place",
            title: place.name,
            subtitle: place.shortWhy || place.address || place.category,
            badge: place.category,
            href: hrefForPlace(place),
            icon: MapPin,
          });
        }
      }
    }
    for (const person of listPeople()) {
      const handle = (person.handle || "").toLowerCase();
      if ((handle && (handle === needle.handle || handle.includes(q))) || person.name.toLowerCase().includes(q)) {
        pushPerson({
          id: `met-${person.id}`,
          category: "person",
          title: person.name,
          subtitle: person.handle ? `@${person.handle}` : person.whereMet || "Contacts",
          badge: "Contact",
          href: person.handle ? bioPath(person.handle) : "/me/people",
          icon: HeartHandshake,
        });
      }
    }
    for (const m of publicMates) {
      const hay =
        `${m.firstName} ${m.suburb} ${m.city} ${m.interests.join(" ")} ${m.activities.join(" ")} ${m.introduction}`.toLowerCase();
      if (q.length >= 2 && hay.includes(q)) {
        pushPerson({
          id: `mate-${m.uid}`,
          category: "person",
          title: m.firstName,
          subtitle: [m.suburb || m.city, m.interests[0]].filter(Boolean).join(" · ") || "Approved Mate",
          badge: "Mate",
          href: "/mate",
          icon: HeartHandshake,
        });
      }
    }

    // 2. Places
    for (const p of placesForLocation(activePlaces(), here, city, usingGps)) {
      const placeHandle = handleOfPlace(p) || "";
      if (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortWhy.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (placeHandle && (placeHandle === needle.handle || placeHandle.includes(q)))
      ) {
        items.push({
          id: `place-${p.id}`,
          category: "place",
          title: p.name,
          subtitle: p.shortWhy || p.address || p.category,
          badge: p.category,
          href: hrefForPlace(p),
          icon: MapPin,
        });
      }
    }

    // 3. Events
    for (const e of calendarEvents) {
      if (!cityMatches(e.city, city)) continue;
      if (
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q)
      ) {
        items.push({
          id: `event-${e.id}`,
          category: "event",
          title: e.title,
          subtitle: `${e.timeLabel} · ${e.venue}`,
          badge: e.categoryLabel,
          href: `/calendar?event=${e.id}`,
          icon: CalendarDays,
        });
      }
    }

    // 4. Stays
    const stayKeywords = ["wifi", "wi-fi", "stay", "room", "concierge", "checkout", "breakfast", "hotel"];
    if (stayKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "stay-concierge",
        category: "stay",
        title: "Stay & Guide",
        subtitle: "Stay guide, Wi-Fi & checkout",
        badge: "Guide",
        href: "/concierge",
        icon: Hotel,
      });
    }

    // 5. Plans
    const openPlans = plans.filter(
      (p) =>
        p.isPublic &&
        p.status === "open" &&
        locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M),
    );
    for (const p of openPlans) {
      const hay = `${p.title} ${p.destination} ${p.city}`.toLowerCase();
      if (q.length >= 2 && hay.includes(q)) {
        items.push({
          id: `plan-${p.id}`,
          category: "plan",
          title: p.title,
          subtitle: `${p.destination || p.city} · ${p.date}`,
          badge: isTicketed(p) ? `$${p.pricePerPerson}` : p.isExperience ? "Free" : "Plan",
          href: `/plan/${p.id}`,
          icon: Users,
        });
      }
    }

    // 6. Experiences
    for (const c of liveExperiences) {
      const hay = `${c.title} ${c.businessName} ${c.suburb} ${c.category}`.toLowerCase();
      if (q.length >= 2 && hay.includes(q)) {
        items.push({
          id: `experience-${c.id}`,
          category: "experience",
          title: c.title,
          subtitle: `${c.businessName} · ${c.suburb} · ${c.date}`,
          badge: c.priceCents > 0 ? aud(c.priceCents) : "Free",
          href: "/experiences",
          icon: Sparkles,
        });
      }
    }

    return items;
  }, [query, catalogVersion, calendarEvents, liveExperiences, publicMates, handleBio, plans, here, city, usingGps]);

  // Filtered by selected category tab
  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return allResults;
    if (activeCategory === "people") return allResults.filter((r) => r.category === "person");
    if (activeCategory === "places")
      return allResults.filter((r) => r.category === "place" || r.category === "partner");
    if (activeCategory === "events") return allResults.filter((r) => r.category === "event");
    if (activeCategory === "experiences") return allResults.filter((r) => r.category === "experience");
    if (activeCategory === "stay") return allResults.filter((r) => r.category === "stay");
    if (activeCategory === "plan") return allResults.filter((r) => r.category === "plan");
    return allResults;
  }, [allResults, activeCategory]);

  // Log debounced search query to Firestore to track search terms & relevance
  useEffect(() => {
    if (query.trim().length >= 2) {
      trackQuery(query, filteredResults.length, activeCategory);
    }
  }, [query, filteredResults.length, activeCategory, trackQuery]);

  return (
    <div className="min-h-screen bg-paper pb-24">
      {/* Header & Sticky Search Bar Area */}
      <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-line shadow-2xs pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Search AirPal</h1>
              <p className="text-xs text-mute mt-0.5">{city || "Sydney"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/search/analytics");
                }}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-card px-3.5 text-xs font-semibold text-brand ring-1 ring-line hover:bg-paper transition cursor-pointer"
              >
                <BarChart3 size={13} />
                <span>Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => nav("/explore")}
                className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-mute hover:text-ink cursor-pointer"
              >
                Explore Map
              </button>
            </div>
          </div>

          {/* Full Search Bar with Mobile & Touch Friendly Dimensions */}
          <SearchBar
            value={query}
            onChange={setQuery}
            sizeVariant="lg"
            variant="card"
            placeholder="Search mates, suburbs, venues, food, events or plans…"
            autoFocus
          />

          {/* Category Tabs: Mobile horizontal touch-scrollable */}
          <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              const count =
                tab.id === "all"
                  ? allResults.length
                  : tab.id === "people"
                    ? allResults.filter((r) => r.category === "person").length
                    : tab.id === "places"
                      ? allResults.filter((r) => r.category === "place" || r.category === "partner").length
                      : tab.id === "events"
                        ? allResults.filter((r) => r.category === "event").length
                        : tab.id === "experiences"
                          ? allResults.filter((r) => r.category === "experience").length
                          : tab.id === "stay"
                            ? allResults.filter((r) => r.category === "stay").length
                            : allResults.filter((r) => r.category === "plan").length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    setActiveCategory(tab.id);
                  }}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation",
                    isActive
                      ? "bg-brand text-white shadow-xs"
                      : "bg-card text-mute hover:bg-paper hover:text-ink ring-1 ring-line",
                  )}
                >
                  <span>{tab.label}</span>
                  {query.trim() ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-paper text-mute",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {/* Results Count & Scope Line */}
        <div className="mb-4 flex items-center justify-between text-xs text-mute">
          <div>
            {query.trim() ? (
              <span>
                Found <strong className="font-semibold text-ink">{filteredResults.length}</strong>{" "}
                {filteredResults.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
              </span>
            ) : (
              <span>Popular in {city || "Sydney"}</span>
            )}
          </div>
          {query.trim() && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex min-h-[44px] items-center px-1 font-medium text-brand hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Popular Searches when query is empty */}
        {!query.trim() && popularTerms.length > 0 && (
          <div className="mb-5 rounded-2xl bg-card p-4 ring-1 ring-line/80 shadow-xs">
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingUp size={15} className="text-brand" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand">Popular Searches</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTerms.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setQuery(pt.term);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/40 transition active:scale-95 cursor-pointer touch-manipulation"
                >
                  <Search size={12} className="text-brand" />
                  <span>{pt.term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredResults.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    logResultClick(query, {
                      id: item.id,
                      title: item.title,
                      category: item.category,
                      href: item.href,
                    });
                    nav(item.href);
                  }}
                  className="flex w-full items-center gap-3.5 rounded-2xl bg-card p-3.5 text-left ring-1 ring-line/80 shadow-xs hover:ring-brand/30 hover:bg-card/90 transition active:scale-[0.99] cursor-pointer touch-manipulation"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/15">
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink">{item.title}</span>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-mute ring-1 ring-line">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-mute mt-0.5">{item.subtitle}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-mute/60 ml-1" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand mb-3">
              <Search size={26} />
            </div>
            <h3 className="text-base font-bold text-ink">No results found for &ldquo;{query}&rdquo;</h3>
            <p className="mt-1 text-xs text-mute max-w-md mx-auto">
              We couldn&apos;t find an exact match in {activeCategory === "all" ? "AirPal" : activeCategory}. Try a
              different term or find someone to explore with.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setQuery("")}
                className="h-10 min-h-[44px] rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
              >
                Clear Search
              </button>
              <button
                type="button"
                onClick={() => nav("/mate")}
                className="h-10 min-h-[44px] rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink transition"
              >
                Find a Mate
              </button>
              <button
                type="button"
                onClick={() => nav("/plan/new")}
                className="h-10 min-h-[44px] rounded-full bg-card px-4 text-xs font-semibold text-brand ring-1 ring-brand/30 hover:bg-paper transition"
              >
                Create a Plan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
