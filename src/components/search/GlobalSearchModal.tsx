import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, limit, query as fsQuery, where } from "firebase/firestore";
import {
  Search,
  MapPin,
  CalendarDays,
  Sparkles,
  Users,
  Building2,
  ArrowRight,
  X,
  Compass,
  Footprints,
  HeartHandshake,
  Hotel,
} from "lucide-react";
import { activePlaces, placeByHandle, placesForLocation, toursForPrecinct } from "@/lib/catalog";
import { hrefForPlace, handleOfPlace, resolvePublicBio } from "@/lib/bio-handle";
import { useLocalNow } from "@/hooks/useLocalNow";
import { cityMatches } from "@/lib/remote-events";
import { EVENT_NEAR_M, locatedNear } from "@/lib/location-scope";
import { getFirebaseDb } from "@/lib/firebase";
import { aud, type Campaign } from "@shared/campaign";
import { isTicketed } from "@shared/plan";
import type { PublicMate } from "@shared/companion";
import { loadPublicMatesRemote } from "@/lib/companion-remote";
import { loadTours } from "@/lib/tours-store";
import { bioPath, bioKindLabel, type BioProfile } from "@shared/bio";
import { fetchPublicBio, loadBios } from "@/lib/bio-store";
import { listPeople } from "@/lib/people";
import { profileMatchesSearch, searchNeedle } from "@/lib/search-query";
import { useEvents } from "@/contexts/EventsContext";
import { useListings } from "@/contexts/ListingsContext";
import { usePlans } from "@/contexts/PlanContext";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/cn";

export function openGlobalSearch() {
  window.dispatchEvent(new CustomEvent("airpal-open-search"));
}

type SearchCategory = "all" | "people" | "places" | "events" | "stay" | "plan" | "experiences";

const RECENT_KEY = "airpal.recentSearches.v1";
type RecentItem = { title: string; href: string };

function loadRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: RecentItem) {
  try {
    const next = [item, ...loadRecent().filter((r) => r.href !== item.href)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

const EXPLORE_GROUPS = [
  { label: "Places", href: "/explore", icon: MapPin },
  { label: "Events", href: "/calendar", icon: CalendarDays },
  { label: "Plans", href: "/plan", icon: Users },
  { label: "People", href: "/mate", icon: HeartHandshake },
  { label: "Communities", href: "/club", icon: Building2 },
];

interface SearchResultItem {
  id: string;
  category: "place" | "event" | "stay" | "plan" | "partner" | "experience" | "person";
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
  icon: typeof Compass;
}

export function GlobalSearchModal() {
  const { version: catalogVersion } = useListings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, nav] = useLocation();
  const { calendarEvents } = useEvents();
  const { plans } = usePlans();
  const { here, city, usingGps } = useLocalNow();
  const [liveExperiences, setLiveExperiences] = useState<Campaign[]>([]);
  const [publicMates, setPublicMates] = useState<PublicMate[]>([]);
  const [handleBio, setHandleBio] = useState<BioProfile | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useScrollLock(open);

  // Live AirPal Experiences for search (small capped read when opened).
  useEffect(() => {
    if (!open) return;
    const db = getFirebaseDb();
    if (!db) return;
    void getDocs(fsQuery(collection(db, "campaigns"), where("status", "==", "live"), limit(20)))
      .then((snap) => setLiveExperiences(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, "id">) }))))
      .catch(() => undefined);
    void loadPublicMatesRemote()
      .then(setPublicMates)
      .catch(() => undefined);
  }, [open]);

  // Exact @handle → public profile (handles/{handle} get). Without this, People search never finds bios.
  useEffect(() => {
    if (!open) {
      setHandleBio(null);
      return;
    }
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
  }, [open, query]);

  // Keyboard shortcut (Cmd+K / Ctrl+K) and custom event listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleOpenEvent() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("airpal-open-search", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("airpal-open-search", handleOpenEvent);
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      void triggerHaptic("light");
      setQuery("");
      setSelectedIndex(0);
      setRecent(loadRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Generate indexed search results
  const results = useMemo<SearchResultItem[]>(() => {
    const needle = searchNeedle(query);
    const q = needle.text.replace(/^@+/, "");
    const items: SearchResultItem[] = [];
    const seenPerson = new Set<string>();

    // Empty query: when 'all', render Recent + Explore; when specific category, show recommendations.
    if (!needle.text) {
      if (activeCategory === "all") return items;

      if (activeCategory === "people") {
        for (const m of publicMates.slice(0, 10)) {
          items.push({
            id: `mate-${m.uid}`,
            category: "person",
            title: m.firstName,
            subtitle: [m.suburb || m.city, m.interests[0]].filter(Boolean).join(" · ") || "Approved Mate",
            badge: "Mate",
            href: "/mate",
            icon: HeartHandshake,
          });
        }
        return items;
      }
      if (activeCategory === "places") {
        for (const p of placesForLocation(activePlaces(), here, city, usingGps).slice(0, 10)) {
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
        return items;
      }
      if (activeCategory === "events") {
        for (const e of calendarEvents.filter((ev) => cityMatches(ev.city, city)).slice(0, 10)) {
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
        return items;
      }
      if (activeCategory === "experiences") {
        for (const c of liveExperiences.slice(0, 10)) {
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
      if (activeCategory === "stay") {
        items.push({
          id: "stay-concierge",
          category: "stay",
          title: "Stay Concierge",
          subtitle: "Digital compendium, Wi-Fi & checkout",
          badge: "Concierge",
          href: "/concierge",
          icon: Sparkles,
        });
        const stays = placesForLocation(activePlaces(), here, city, usingGps).filter(
          (p) => p.category.toLowerCase().includes("stay") || p.category.toLowerCase().includes("hotel"),
        );
        for (const p of stays.slice(0, 8)) {
          items.push({
            id: `stay-place-${p.id}`,
            category: "stay",
            title: p.name,
            subtitle: p.shortWhy || p.address || "Boutique stay",
            badge: "Stay",
            href: hrefForPlace(p),
            icon: Hotel,
          });
        }
        return items;
      }
      if (activeCategory === "plan") {
        items.push({
          id: "plan-create",
          category: "plan",
          title: "Create a Plan",
          subtitle: "Invite friends, family, or mates with RSVP",
          badge: "New Plan",
          href: "/plan/new",
          icon: Users,
        });
        const openPlans = plans.filter(
          (p) =>
            p.isPublic &&
            p.status === "open" &&
            locatedNear({ geo: p.geo, city: p.city || p.destination }, here, city, usingGps, EVENT_NEAR_M),
        );
        for (const p of openPlans.slice(0, 8)) {
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
        return items;
      }
    }

    function pushPerson(item: SearchResultItem) {
      if (seenPerson.has(item.id)) return;
      seenPerson.add(item.id);
      items.push(item);
    }

    // 0. People / bios by @handle (local cache + remote exact hit + saved contacts)
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
      if (!q) continue;
      if (!(handle && (handle === needle.handle || handle.includes(q))) && !person.name.toLowerCase().includes(q)) {
        continue;
      }
      pushPerson({
        id: `met-${person.id}`,
        category: "person",
        title: person.name,
        subtitle: person.handle ? `@${person.handle}` : person.whereMet || "People you met",
        badge: "Met",
        href: person.handle ? bioPath(person.handle) : "/me/people",
        icon: HeartHandshake,
      });
    }

    // 1. Match Places (live listings only — empty DB means no place results)
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

    // 2. Match Events
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

    // 3. Match Stay / Concierge actions
    const stayKeywords = ["wifi", "wi-fi", "stay", "room", "concierge", "checkout", "breakfast", "towel", "key"];
    if (stayKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "stay-concierge",
        category: "stay",
        title: "Concierge",
        subtitle: "Wi-Fi, front desk & checkout",
        badge: "Concierge",
        href: "/concierge",
        icon: Sparkles,
      });
    }

    // 4. Match Mates Planning keywords
    const planKeywords = [
      "plan",
      "mate",
      "friends",
      "night",
      "dinner",
      "lunch",
      "movie",
      "cinema",
      "roadtrip",
      "hangout",
    ];
    if (planKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "plan-create",
        category: "plan",
        title: "New Plan",
        subtitle: "Invite link with RSVP",
        badge: "Mates Plan",
        href: "/plan/new",
        icon: Users,
      });
    }

    if (q.includes("ticket") || q.includes("experience") || q.includes("event")) {
      items.push({
        id: "event-create",
        category: "event",
        title: "Sell tickets",
        subtitle: "Create a public event or experience",
        badge: "Tickets",
        href: "/create",
        icon: CalendarDays,
      });
      items.push({
        id: "join-tickets",
        category: "experience",
        title: "Buy tickets",
        subtitle: "Public events and experiences nearby",
        badge: "Join",
        href: "/experiences",
        icon: Sparkles,
      });
    }

    if (q.includes("mate") || q.includes("companion") || q.includes("someone")) {
      items.push({
        id: "mate-request",
        category: "person",
        title: "Find someone to go with",
        subtitle: "Request an approved Mate",
        badge: "Mate",
        href: "/mate/request",
        icon: HeartHandshake,
      });
    }

    for (const m of publicMates) {
      const hay =
        `${m.firstName} ${m.suburb} ${m.city} ${m.interests.join(" ")} ${m.activities.join(" ")} ${m.introduction}`.toLowerCase();
      if (q.length >= 2 && hay.includes(q)) {
        items.push({
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

    // 4c. Match live AirPal Experiences
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

    // 5. Match open Plans (one global search replaces per-page plan search)
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

    // 6. Match Walks / Tours (live tours only)
    for (const t of toursForPrecinct(usingGps ? city : city || "", loadTours())) {
      if (t.title.toLowerCase().includes(q) || t.city.toLowerCase().includes(q)) {
        items.push({
          id: `tour-${t.id}`,
          category: "place",
          title: t.title,
          subtitle: `${t.city} · guided walk`,
          badge: "Walk",
          href: `/tour/${t.id}`,
          icon: Footprints,
        });
      }
    }

    // 7. Street / lobby markers are QR-scanned codes, not searchable directory
    // entries (marker docs are not publicly listable). They resolve on /q pages.

    // 8. Match Partner / Roles keywords
    const partnerKeywords = ["host", "business", "list", "partner", "organise", "join", "creator"];
    if (partnerKeywords.some((k) => q.includes(k))) {
      items.push({
        id: "partner-join",
        category: "partner",
        title: "Partner account",
        subtitle: "Same AirPal login. Guests find your place on What's on",
        badge: "Partner",
        href: "/join",
        icon: Building2,
      });
    }

    // Apply category filter
    if (activeCategory === "people") return items.filter((i) => i.category === "person");
    if (activeCategory === "places") return items.filter((i) => i.category === "place");
    if (activeCategory === "events") return items.filter((i) => i.category === "event");
    if (activeCategory === "stay") {
      return items.filter(
        (i) =>
          i.category === "stay" ||
          (i.category === "place" &&
            (i.badge?.toLowerCase().includes("stay") ||
              i.badge?.toLowerCase().includes("hotel") ||
              i.subtitle.toLowerCase().includes("hotel") ||
              i.subtitle.toLowerCase().includes("stay"))),
      );
    }
    if (activeCategory === "plan") return items.filter((i) => i.category === "plan");
    if (activeCategory === "experiences") return items.filter((i) => i.category === "experience");

    return items;
  }, [
    query,
    calendarEvents,
    catalogVersion,
    plans,
    activeCategory,
    liveExperiences,
    publicMates,
    handleBio,
    here,
    city,
    usingGps,
  ]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      void triggerHapticSelection();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      void triggerHapticSelection();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      selectItem(results[selectedIndex]);
    }
  };

  const selectItem = (item: SearchResultItem) => {
    void triggerHaptic("light");
    saveRecent({ title: item.title, href: item.href });
    setOpen(false);
    nav(item.href);
  };

  const goHref = (title: string, href: string) => {
    void triggerHaptic("light");
    saveRecent({ title, href });
    setOpen(false);
    nav(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2.5 pt-3 sm:p-6 sm:pt-20 [padding-bottom:var(--keyboard-height,0px)] transition-[padding] duration-200">
      <button
        type="button"
        className="fixed inset-0 bg-ink/60 backdrop-blur-md transition-opacity cursor-pointer"
        aria-label="Close search"
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search AirPal"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl bg-card shadow-2xl ring-1 ring-line/80 safe-bottom"
      >
        <div className="flex h-14 sm:h-13 items-center gap-2.5 sm:gap-3 border-b border-line px-3.5 py-2 sm:px-4 sm:py-3">
          <Search size={20} className="shrink-0 text-brand" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search people, places, events, stays, plans…"
            aria-label="Search people, places, events, stays, plans"
            className="min-h-[44px] w-full bg-transparent text-[16px] sm:text-[15px] font-medium text-ink placeholder:text-mute focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mute hover:bg-paper hover:text-ink active:scale-95 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex min-h-[44px] shrink-0 items-center px-2 py-1.5 text-xs font-semibold text-brand active:scale-95 sm:hidden cursor-pointer"
          >
            Cancel
          </button>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-line bg-paper px-2 py-0.5 text-[10px] font-semibold text-mute">
            ESC
          </kbd>
        </div>

        {/* Category Chips */}
        <div className="no-scrollbar touch-pan-x flex items-center gap-1.5 overflow-x-auto border-b border-line/60 bg-paper/40 px-3 py-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "people", label: "People & Mates" },
              { id: "places", label: "Places" },
              { id: "events", label: "Events" },
              { id: "experiences", label: "Experiences" },
              { id: "stay", label: "Stays" },
              { id: "plan", label: "Plans" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                void triggerHapticSelection();
                setActiveCategory(c.id);
                setSelectedIndex(0);
              }}
              className={cn(
                "flex h-10 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition whitespace-nowrap active:scale-95 min-h-[40px] cursor-pointer",
                activeCategory === c.id
                  ? "bg-brand text-white shadow-xs"
                  : "bg-paper text-mute hover:bg-line hover:text-ink ring-1 ring-line",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="scroll-container max-h-[min(60vh,calc(var(--visual-viewport-height,100dvh)-12rem))] p-2 space-y-1">
          {!query.trim() ? (
            <div className="px-2 py-3">
              <p className="px-1 text-[15px] font-semibold text-ink">What are you looking for?</p>
              {recent.length > 0 && (
                <div className="mt-3">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Recent</p>
                  <ul className="mt-1.5 space-y-1">
                    {recent.map((r) => (
                      <li key={r.href}>
                        <button
                          type="button"
                          onClick={() => goHref(r.title, r.href)}
                          className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-paper"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper text-mute ring-1 ring-line">
                            <Search size={15} />
                          </span>
                          <span className="truncate text-[14px] font-medium text-ink">{r.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Explore</p>
                <ul className="mt-1.5 space-y-1">
                  {EXPLORE_GROUPS.map((g) => (
                    <li key={g.label}>
                      <button
                        type="button"
                        onClick={() => goHref(g.label, g.href)}
                        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-paper"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                          <g.icon size={17} />
                        </span>
                        <span className="text-[14px] font-semibold text-ink">{g.label}</span>
                        <ArrowRight size={15} className="ml-auto shrink-0 text-transparent" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : results.length > 0 ? (
            results.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition",
                    isSelected ? "bg-paper ring-1 ring-line text-ink" : "hover:bg-paper/60 text-mute",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                      isSelected ? "bg-brand text-white shadow-sm" : "bg-paper text-mute ring-1 ring-line",
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
                      {item.badge && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-gold ring-1 ring-line shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-mute mt-0.5">{item.subtitle}</p>
                  </div>
                  <ArrowRight
                    size={15}
                    className={cn("shrink-0 transition", isSelected ? "text-ink translate-x-0.5" : "text-transparent")}
                  />
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Compass size={28} className="mx-auto text-mute/50 mb-2" />
              <p className="text-sm font-semibold text-ink">No results found for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-xs text-mute">
                Try searching &ldquo;glenmore&rdquo;, &ldquo;wifi&rdquo;, &ldquo;market&rdquo;, or &ldquo;night
                out&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="hidden border-t border-line/60 bg-paper/60 px-4 py-2 text-[11px] text-mute sm:flex items-center gap-2">
          <kbd className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-line">↑</kbd>
          <kbd className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-line">↓</kbd>
          <kbd className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-line">↵ Select</kbd>
        </div>
      </div>
    </div>
  );
}
