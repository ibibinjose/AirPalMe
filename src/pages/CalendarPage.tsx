import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  CalendarDays,
  CalendarRange,
  Check,
  Heart,
  Sparkles,
  Star,
  X,
  LayoutGrid,
  Download,
  List,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useEvents } from "@/contexts/EventsContext";
import type { CalendarEvent, CalendarEventCategory } from "@shared/event";
import {
  filterCalendarEvents,
  initialMonthFor,
  toDateStr,
  isWeekendDay,
  isFreeAdmission,
  CALENDAR_CATEGORIES,
  getAllEventTags,
  type CalendarFilter,
  type CalendarViewMode,
} from "@/lib/calendar-utils";
import { downloadMultipleIcs } from "@/lib/calendar-export";
import { usePlans } from "@/contexts/PlanContext";
import { downloadPlanIcs } from "@/lib/plan-store";
import { formatPlanDate } from "@shared/plan";
import { CalendarAgendaView } from "@/components/calendar/CalendarAgendaView";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { CalendarEventModal } from "@/components/calendar/CalendarEventModal";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarDragProvider, useCalendarDrag } from "@/components/calendar/CalendarDragContext";
import { CalendarRescheduleModal } from "@/components/calendar/CalendarRescheduleModal";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLocalNow } from "@/hooks/useLocalNow";
import { cityMatches } from "@/lib/remote-events";
import { ROCKS_BROWSE } from "@/lib/catalog";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";

const CATEGORIES = CALENDAR_CATEGORIES;

// Loading skeleton component with shimmer effect
function CalendarSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="mb-8 space-y-4 animate-pulse">
        <div className="h-3 w-48 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded" />
        <div className="h-10 w-80 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl" />
        <div className="h-4 w-full max-w-md bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded" />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-11 w-28 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-full shrink-0"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>

      <div className="rounded-3xl bg-card p-4 md:p-6 ring-1 ring-line/80 shadow-sm">
        <div className="space-y-4">
          <div className="h-8 w-40 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl mb-6" />

          {/* Weekday column header skeleton */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl"
              />
            ))}
          </div>

          {/* Column cells skeleton */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[68px] sm:min-h-[84px] md:min-h-[102px] bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-2xl"
                style={{ animationDelay: `${(i % 7) * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPageContent() {
  const [, nav] = useLocation();
  const searchStr = useSearch();
  const { calendarEvents, exportItinerary } = useEvents();
  const { myPlans } = usePlans();
  const { today, city, usingGps, chooseLocation } = useLocalNow();
  const upcomingPlans = useMemo(
    () =>
      [...myPlans]
        .filter((p) => !p.date || p.date >= today)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
        .slice(0, 6),
    [myPlans, today],
  );
  const { reschedulingEvent, setReschedulingEvent } = useCalendarDrag();
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  // Loading state management — clear even when the feed is empty
  useEffect(() => {
    if (calendarEvents.length > 0) {
      setIsLoading(false);
      return;
    }
    const t = window.setTimeout(() => setIsLoading(false), 400);
    return () => window.clearTimeout(t);
  }, [calendarEvents]);

  // View state: 'month' | 'week' | 'day' | 'list'
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const v = searchParams.get("view") as CalendarViewMode;
    return ["month", "week", "day", "list"].includes(v) ? v : "month";
  });

  // Active date for week and day views
  const [activeDate, setActiveDate] = useState<Date>(() => {
    const dParam = searchParams.get("date");
    if (dParam) {
      const parsed = new Date(dParam + "T00:00:00");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  // Track view mode changes
  useEffect(() => {
    void track("calendar_view_change", { view: viewMode, action: "user_action" });
  }, [viewMode]);

  // Filter state: 'all' | 'going' | 'interested' | 'liked' | 'local' | 'weekend' | 'free'
  const [filter, setFilter] = useState<CalendarFilter>(() => {
    const f = searchParams.get("filter") as CalendarFilter;
    return ["all", "going", "interested", "liked", "local", "weekend", "free"].includes(f) ? f : "all";
  });

  // Track filter changes
  useEffect(() => {
    void track("calendar_filter_change", { filter, action: "user_action" });
  }, [filter]);

  // Category filter
  const [category, setCategory] = useState<"all" | CalendarEventCategory>("all");

  // Track category changes
  useEffect(() => {
    if (category !== "all") {
      void track("calendar_category_filter", { category, action: "user_action" });
    }
  }, [category]);

  // Selected date (for Month view)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(() => {
    return searchParams.get("date") || undefined;
  });

  const handleSelectDate = (dateStr?: string) => {
    setSelectedDate(dateStr);
    if (dateStr) {
      const parsed = new Date(dateStr + "T00:00:00");
      if (!isNaN(parsed.getTime())) {
        setActiveDate(parsed);
      }
    }
  };

  const handleChangeActiveDate = (d: Date) => {
    setActiveDate(d);
    setSelectedDate(toDateStr(d));
  };

  // Search input
  const [searchQuery, setSearchQuery] = useState("");
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Track search with debounce
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        void track("calendar_search", {
          query: searchQuery,
          queryLength: searchQuery.length,
          count: filteredEvents.length,
          action: "search",
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Current calendar month view
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  useEffect(() => {
    if (currentMonth === null && calendarEvents.length > 0) {
      setCurrentMonth(initialMonthFor(calendarEvents, today));
    }
  }, [calendarEvents, currentMonth, today]);
  const monthForGrid = currentMonth ?? new Date();

  // Selected event for modal
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);

  const closeEventModal = useCallback(() => {
    setModalEvent(null);
    const params = new URLSearchParams(searchStr);
    if (!params.has("event")) return;
    params.delete("event");
    const next = params.toString();
    nav(next ? `/calendar?${next}` : "/calendar", { replace: true });
  }, [nav, searchStr]);

  // Sync event from query param if opened with ?event=id
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId) return;
    const found = calendarEvents.find((e) => e.id === eventId);
    if (found) setModalEvent(found);
  }, [calendarEvents, searchParams]);

  // Keep modal event updated with live state (e.g. going/interested/liked)
  useEffect(() => {
    if (!modalEvent) return;
    const live = calendarEvents.find((e) => e.id === modalEvent.id);
    if (live && live !== modalEvent) setModalEvent(live);
  }, [calendarEvents, modalEvent]);

  useScrollLock(isMobileDrawerOpen);

  // Count tallies for filter tabs
  const counts = useMemo(() => {
    return {
      all: calendarEvents.length,
      going: calendarEvents.filter((e) => e.isGoing).length,
      interested: calendarEvents.filter((e) => e.isInterested).length,
      liked: calendarEvents.filter((e) => e.isLiked).length,
      local: calendarEvents.filter((e) => e.isLocal).length,
      weekend: calendarEvents.filter((e) => isWeekendDay(new Date(e.date + "T00:00:00"))).length,
      free: calendarEvents.filter((e) => isFreeAdmission(e.ticketPrice)).length,
    };
  }, [calendarEvents]);

  // Unique tags for tag-based filtering
  const allTags = useMemo(() => {
    return getAllEventTags(calendarEvents);
  }, [calendarEvents]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const countsMap: Record<string, number> = { all: calendarEvents.length };
    for (const cat of CALENDAR_CATEGORIES) {
      if (cat.id !== "all") {
        countsMap[cat.id] = calendarEvents.filter((e) => e.category === cat.id).length;
      }
    }
    return countsMap;
  }, [calendarEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    const rows = filterCalendarEvents(
      calendarEvents,
      filter,
      searchQuery,
      category,
      viewMode === "month" ? selectedDate : undefined,
    ).filter((e) => cityMatches(e.city, city));
    // "All Upcoming" should not keep yesterday's events in the list
    if (viewMode === "month" && !selectedDate) {
      return rows.filter((e) => e.date >= today);
    }
    return rows;
  }, [calendarEvents, filter, searchQuery, category, viewMode, selectedDate, today, city]);

  // Dots on the month grid reflect every active filter except the selected date itself
  const gridEvents = useMemo(() => {
    return filterCalendarEvents(calendarEvents, filter, searchQuery, category).filter((e) => cityMatches(e.city, city));
  }, [calendarEvents, filter, searchQuery, category, city]);

  // Events on selected day for Month View
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filterCalendarEvents(calendarEvents, filter, searchQuery, category, selectedDate).filter((e) =>
      cityMatches(e.city, city),
    );
  }, [calendarEvents, selectedDate, filter, searchQuery, category, city]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(selectedDate + "T00:00:00"));
  }, [selectedDate]);

  const savedItineraryCount = counts.going + counts.interested;

  const activeFilterCount =
    (searchQuery.trim().length > 0 ? 1 : 0) + (category !== "all" ? 1 : 0) + (filter !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const handleExportSelectedDay = () => {
    if (!selectedDayEvents.length || !selectedDate) return;
    downloadMultipleIcs(selectedDayEvents, `sydney-schedule-${selectedDate}.ics`);
    toast.success(
      `Exported ${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? "s" : ""} to calendar (.ics)`,
    );
    void track("calendar_export_selected_day", { date: selectedDate, count: selectedDayEvents.length });
  };

  // Show loading skeleton on initial load
  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      {/* Image header — laneway backdrop, controls float below the title */}
      <div className="relative mb-6 overflow-hidden rounded-[28px]">
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src="/media/laneway.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/media/harbour.jpg";
            }}
          />
          <div className="hero-scrim absolute inset-0" />
        </div>
        <div className="relative p-5 md:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85">
            <Sparkles size={13} />
            <span>{city} · What’s On</span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Event Calendar
          </h1>
          <p className="mt-1 text-[14px] font-medium text-white/80">
            {filteredEvents.length} upcoming · {savedItineraryCount} saved to your itinerary
          </p>
        </div>
      </div>

      {/* Top Header / tools */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">Browse events</h2>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Toggle Sidebar (Desktop) */}
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setIsSidebarOpen((prev) => !prev);
            }}
            title={isSidebarOpen ? "Collapse search sidebar" : "Expand search sidebar"}
            className={cn(
              "hidden lg:inline-flex min-h-[44px] h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition shadow-xs active:scale-95 cursor-pointer",
              isSidebarOpen
                ? "bg-card text-ink ring-1 ring-line/80 hover:bg-paper"
                : "bg-paper text-ink ring-1 ring-line hover:bg-line",
            )}
          >
            <SlidersHorizontal size={13} className="text-brand" />
            <span>{isSidebarOpen ? "Hide Filters" : "Show Filters"}</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Mobile Filters Trigger */}
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("medium");
              setIsMobileDrawerOpen(true);
            }}
            title="Open search and filters"
            className="inline-flex lg:hidden min-h-[44px] h-11 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-medium text-ink ring-1 ring-line/80 hover:bg-paper transition shadow-xs active:scale-95 cursor-pointer"
          >
            <SlidersHorizontal size={13} className="text-brand" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Switcher Tabs (Month, Week, Day, List) */}
          <div className="inline-flex min-h-[44px] h-11 items-center rounded-full bg-card p-1 ring-1 ring-line/80 shadow-xs">
            <button
              type="button"
              aria-label="Month View"
              onClick={() => {
                if (viewMode !== "month") void triggerHapticSelection();
                setViewMode("month");
              }}
              className={cn(
                "flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95 cursor-pointer",
                viewMode === "month" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              <LayoutGrid size={14} />
              <span>Month</span>
            </button>
            <button
              type="button"
              aria-label="Week View"
              onClick={() => {
                if (viewMode !== "week") void triggerHapticSelection();
                setViewMode("week");
              }}
              className={cn(
                "flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95 cursor-pointer",
                viewMode === "week" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              <CalendarRange size={14} />
              <span>Week</span>
            </button>
            <button
              type="button"
              aria-label="Day View"
              onClick={() => {
                if (viewMode !== "day") void triggerHapticSelection();
                setViewMode("day");
              }}
              className={cn(
                "flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95 cursor-pointer",
                viewMode === "day" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              <CalendarDays size={14} />
              <span>Day</span>
            </button>
            <button
              type="button"
              aria-label="List View"
              onClick={() => {
                if (viewMode !== "list") void triggerHapticSelection();
                setViewMode("list");
              }}
              className={cn(
                "flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition active:scale-95 cursor-pointer",
                viewMode === "list" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              <List size={14} />
              <span>List</span>
            </button>
          </div>

          {/* Export My Itinerary CTA */}
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              exportItinerary("all-saved");
            }}
            title="Export your saved RSVP events to Apple, Outlook, or Google Calendar"
            className={cn(
              "inline-flex min-h-[44px] h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition shadow-xs active:scale-95 cursor-pointer",
              savedItineraryCount > 0
                ? "bg-brand text-white hover:bg-brand-ink shadow-sm"
                : "bg-card text-ink ring-1 ring-line/80 hover:bg-paper",
            )}
          >
            <Download size={13} />
            <span>Itinerary</span>
            {savedItineraryCount > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 py-0.2 text-[10px] font-bold">
                {savedItineraryCount}
              </span>
            )}
          </button>

          {/* Host Event link */}
          <button
            type="button"
            onClick={() => nav("/event/new")}
            title="Create an event and invite your Circle"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-medium text-white hover:bg-brand-ink transition active:scale-95"
          >
            <PlusCircle size={13} />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Desktop Sticky Sidebar */}
        {isSidebarOpen && (
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20 rounded-2xl ring-1 ring-line bg-card p-4 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
            <CalendarSidebar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              category={category}
              onCategoryChange={setCategory}
              filter={filter}
              onFilterChange={setFilter}
              allTags={allTags}
              categoryCounts={categoryCounts}
              statusCounts={counts}
              totalCount={calendarEvents.length}
              filteredCount={filteredEvents.length}
              onResetFilters={() => {
                setSearchQuery("");
                setCategory("all");
                setFilter("all");
              }}
            />
          </div>
        )}

        {/* Main Calendar Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Active Filter Feedback Summary */}
          {(searchQuery || category !== "all" || filter !== "all") && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-3.5 py-2 text-xs text-mute ring-1 ring-line/70">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-ink">Active filters:</span>
                {filter !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 font-medium text-ink ring-1 ring-line/60">
                    Status: <strong className="capitalize">{filter}</strong>
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className="grid h-7 w-7 -m-2 p-2 place-items-center rounded-full hover:bg-line/60 hover:text-ink/60 cursor-pointer"
                      aria-label="Remove status filter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {category !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 font-medium text-ink ring-1 ring-line/60">
                    Category: <strong>{CATEGORIES.find((c) => c.id === category)?.label}</strong>
                    <button
                      type="button"
                      onClick={() => setCategory("all")}
                      className="grid h-7 w-7 -m-2 p-2 place-items-center rounded-full hover:bg-line/60 hover:text-ink/60 cursor-pointer"
                      aria-label="Remove category filter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 font-medium text-brand ring-1 ring-brand/30">
                    {searchQuery.startsWith("#") ? "Tag: " : "Search: "}
                    <strong>{searchQuery}</strong>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="grid h-7 w-7 -m-2 p-2 place-items-center rounded-full hover:bg-brand/15 hover:text-brand-ink cursor-pointer"
                      aria-label="Clear search text"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <span className="text-mute">
                  ({filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} matching)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setCategory("all");
                  setSearchQuery("");
                }}
                className="inline-flex min-h-[44px] items-center px-1 text-[11px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Selected Date Notice (Month View) */}
          {viewMode === "month" && selectedDate && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand/10 px-4 py-2.5 text-ink ring-1 ring-line">
              <div className="flex items-center gap-2 text-xs">
                <CalendarDays size={15} className="text-brand" />
                <span>
                  Showing schedule for <strong className="font-semibold text-ink">{selectedDateLabel}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedDayEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportSelectedDay}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-card px-3.5 text-[11px] font-medium text-ink ring-1 ring-line hover:bg-paper transition"
                  >
                    <Download size={11} />
                    <span>Save Day (.ics)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDate(undefined)}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-card px-3.5 text-[11px] font-medium text-ink ring-1 ring-line hover:bg-paper transition"
                >
                  Show full month
                </button>
              </div>
            </div>
          )}

          {/* Main View Display */}
          {viewMode === "month" && (
            <div className="space-y-8">
              {/* Visual Month Grid */}
              <CalendarMonthGrid
                currentDate={monthForGrid}
                onChangeMonth={setCurrentMonth}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                events={gridEvents}
                todayStr={today}
              />

              {/* Section: Events on Selected Day or All Month Events */}
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">
                      {selectedDate ? `Schedule for ${selectedDateLabel}` : "All Upcoming Events"}
                    </h3>
                    <p className="text-xs text-mute mt-0.5">
                      {selectedDate
                        ? `${selectedDayEvents.length} event${selectedDayEvents.length === 1 ? "" : "s"} scheduled for this day`
                        : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} matching your filters`}
                    </p>
                  </div>

                  {/* Quick actions for current events list */}
                  {filteredEvents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targets = selectedDate ? selectedDayEvents : filteredEvents;
                        downloadMultipleIcs(targets, `sydney-events-${Date.now().toString().slice(-4)}.ics`);
                        toast.success(`Exported ${targets.length} events to .ics calendar file!`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line/80 hover:bg-paper transition active:scale-95 shadow-xs"
                    >
                      <Download size={13} className="text-mute" />
                      <span>Download visible (.ics)</span>
                    </button>
                  )}
                </div>

                {/* Event Cards Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(selectedDate ? selectedDayEvents : filteredEvents).map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onSelect={setModalEvent}
                      onSelectTag={(tag) => setSearchQuery(tag.startsWith("#") ? tag : `#${tag}`)}
                    />
                  ))}
                </div>

                {(selectedDate ? selectedDayEvents : filteredEvents).length === 0 && (
                  <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line/80">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-paper text-gold ring-1 ring-line">
                      {filter === "going" ? (
                        <Check size={22} />
                      ) : filter === "interested" ? (
                        <Star size={22} />
                      ) : filter === "liked" ? (
                        <Heart size={22} />
                      ) : (
                        <CalendarDays size={22} />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {filter === "going"
                        ? "No events marked as Going yet"
                        : filter === "interested"
                          ? "No events saved to Interested yet"
                          : filter === "liked"
                            ? "No liked events yet"
                            : filter === "weekend"
                              ? "No events scheduled for the weekend"
                              : filter === "free"
                                ? "No free admission events matching criteria"
                                : selectedDate
                                  ? "No events scheduled for this day"
                                  : usingGps
                                    ? `Nothing listed near ${city} yet`
                                    : "No matching events found"}
                    </p>
                    {usingGps && filter === "all" && (
                      <button
                        type="button"
                        className="mt-3 text-[13px] font-semibold text-brand"
                        onClick={() => chooseLocation(ROCKS_BROWSE)}
                      >
                        See The Rocks
                      </button>
                    )}
                    <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
                      {filter === "going"
                        ? "Browse upcoming live gigs, weekend markets, and harbour festivals, then tap Going to lock them into your itinerary."
                        : filter === "interested"
                          ? "Tap the Star on any event to bookmark it for later."
                          : filter === "liked"
                            ? "Tap the Heart on any event to save your favourites."
                            : filter === "weekend"
                              ? "Check back soon or select another category to view weekday showcases."
                              : filter === "free"
                                ? "Explore other categories or check all events."
                                : selectedDate
                                  ? "Try tapping another date on the calendar or view all upcoming events."
                                  : "Try broadening your search query or selecting a different category."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {filter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setFilter("all")}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm hover:bg-brand-ink transition"
                        >
                          <span>Show All Events</span>
                        </button>
                      )}
                      {selectedDate && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(undefined)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-medium text-ink ring-1 ring-line hover:bg-line transition"
                        >
                          <span>Clear date filter</span>
                        </button>
                      )}
                      {(category !== "all" || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategory("all");
                            setSearchQuery("");
                          }}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-medium text-ink ring-1 ring-line hover:bg-line transition"
                        >
                          <span>Reset search & filters</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Week View Display */}
          {viewMode === "week" && (
            <CalendarWeekView
              currentDate={activeDate}
              onChangeDate={handleChangeActiveDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              events={filteredEvents}
              onSelectEvent={setModalEvent}
              onSelectTag={(tag) => setSearchQuery(tag.startsWith("#") ? tag : `#${tag}`)}
            />
          )}

          {/* Day View Display */}
          {viewMode === "day" && (
            <CalendarDayView
              currentDate={activeDate}
              onChangeDate={handleChangeActiveDate}
              events={filteredEvents}
              onSelectEvent={setModalEvent}
              onSelectTag={(tag) => setSearchQuery(tag.startsWith("#") ? tag : `#${tag}`)}
            />
          )}

          {/* List View Display — date tree of upcoming events only */}
          {viewMode === "list" && (
            <CalendarAgendaView
              events={filteredEvents.filter((e) => e.date >= today)}
              onSelectEvent={setModalEvent}
              onResetFilters={() => {
                setFilter("all");
                setCategory("all");
                setSearchQuery("");
              }}
              onSelectTag={(tag) => setSearchQuery(tag.startsWith("#") ? tag : `#${tag}`)}
            />
          )}

          {/* My plans — the repeat loop lives here, same chrome as events */}
          <section aria-label="My plans" className="rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">My plans</h3>
                <p className="mt-0.5 text-xs text-mute">
                  Your upcoming plans — open one to coordinate, or save it to your calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => nav("/plan/new")}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition active:scale-95"
              >
                <PlusCircle size={13} />
                <span>New plan</span>
              </button>
            </div>
            {upcomingPlans.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-[13px] text-mute ring-1 ring-line/60">
                No upcoming plans yet. Create one, invite your crew, and it will show up here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {upcomingPlans.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 ring-1 ring-line/60"
                  >
                    <button
                      type="button"
                      onClick={() => nav(`/plan/${p.id}`)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <span className="block truncate text-[14px] font-semibold text-ink">{p.title}</span>
                      <span className="block text-[12px] text-mute">
                        {formatPlanDate(p.date, p.time)}
                        {p.destination ? ` · ${p.destination}` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPlanIcs(p)}
                      aria-label={`Save ${p.title} to calendar`}
                      className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-card ring-1 ring-line transition hover:ring-brand/40 active:scale-90"
                    >
                      <Download size={15} className="text-mute" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Mobile Filters Slide-over Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Calendar search and filters"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-card p-5 shadow-2xl border-l border-line overflow-y-auto z-10 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))]">
            <CalendarSidebar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              category={category}
              onCategoryChange={setCategory}
              filter={filter}
              onFilterChange={setFilter}
              allTags={allTags}
              categoryCounts={categoryCounts}
              statusCounts={counts}
              totalCount={calendarEvents.length}
              filteredCount={filteredEvents.length}
              onResetFilters={() => {
                setSearchQuery("");
                setCategory("all");
                setFilter("all");
              }}
              onCloseMobile={() => setIsMobileDrawerOpen(false)}
              idPrefix="calendar-drawer"
            />
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      <CalendarEventModal
        event={modalEvent}
        onClose={closeEventModal}
        onSelectTag={(tag) => setSearchQuery(tag.startsWith("#") ? tag : `#${tag}`)}
      />

      {/* Event Reschedule Modal */}
      <CalendarRescheduleModal event={reschedulingEvent} onClose={() => setReschedulingEvent(null)} />
    </div>
  );
}

export function CalendarPage() {
  return (
    <CalendarDragProvider>
      <CalendarPageContent />
    </CalendarDragProvider>
  );
}
