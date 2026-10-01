import { useState } from "react";
import {
  Search,
  X,
  Tag,
  Filter,
  RotateCcw,
  Sparkles,
  Compass,
  Check,
  Star,
  Heart,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CalendarEventCategory } from "@shared/event";
import { CALENDAR_CATEGORIES, CATEGORY_THEMES, type CalendarFilter, type CalendarViewMode } from "@/lib/calendar-utils";
import { cn } from "@/lib/cn";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";

export interface CalendarSidebarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  category: "all" | CalendarEventCategory;
  onCategoryChange: (cat: "all" | CalendarEventCategory) => void;
  filter: CalendarFilter;
  onFilterChange: (filter: CalendarFilter) => void;
  allTags: string[];
  categoryCounts: Record<string, number>;
  statusCounts: {
    all: number;
    going: number;
    interested: number;
    liked: number;
    local: number;
    weekend: number;
    free: number;
  };
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
  onCloseMobile?: () => void;
  className?: string;
  /** Prefix for element ids — the sidebar mounts twice (desktop + mobile drawer). */
  idPrefix?: string;
}

export function CalendarSidebar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  filter,
  onFilterChange,
  allTags,
  categoryCounts,
  statusCounts,
  totalCount,
  filteredCount,
  onResetFilters,
  onCloseMobile,
  className,
  idPrefix = "calendar-sidebar",
}: CalendarSidebarProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  const hasActiveFilters = searchQuery.trim().length > 0 || category !== "all" || filter !== "all";

  const displayedTags = showAllTags ? allTags : allTags.slice(0, 10);

  const statusOptions: Array<{
    id: CalendarFilter;
    label: string;
    count: number;
    icon: typeof CalendarDays;
    activeClass: string;
    softClass: string;
    iconClass: string;
  }> = [
    {
      id: "all",
      label: "All Events",
      count: statusCounts.all,
      icon: CalendarDays,
      activeClass: "bg-brand text-white",
      softClass: "bg-ink/[0.04] ring-1 ring-ink/15 hover:bg-ink/[0.08]",
      iconClass: "text-ink",
    },
    {
      id: "weekend",
      label: "Weekend Picks",
      count: statusCounts.weekend,
      icon: Compass,
      activeClass: "bg-indigo-600 text-white font-semibold",
      softClass: "bg-indigo-500/10 ring-1 ring-indigo-500/40 hover:bg-indigo-500/20",
      iconClass: "text-indigo-600",
    },
    {
      id: "free",
      label: "Free Admission",
      count: statusCounts.free,
      icon: Sparkles,
      activeClass: "bg-teal-600 text-white font-semibold",
      softClass: "bg-teal-500/10 ring-1 ring-teal-500/40 hover:bg-teal-500/20",
      iconClass: "text-teal-600",
    },
    {
      id: "going",
      label: "Going (RSVP)",
      count: statusCounts.going,
      icon: Check,
      activeClass: "bg-emerald-600 text-white font-semibold",
      softClass: "bg-emerald-500/10 ring-1 ring-emerald-500/40 hover:bg-emerald-500/20",
      iconClass: "text-emerald-600",
    },
    {
      id: "interested",
      label: "Interested",
      count: statusCounts.interested,
      icon: Star,
      activeClass: "bg-amber-600 text-white font-semibold",
      softClass: "bg-amber-500/10 ring-1 ring-amber-500/40 hover:bg-amber-500/20",
      iconClass: "text-amber-600",
    },
    {
      id: "liked",
      label: "Saved Favourites",
      count: statusCounts.liked,
      icon: Heart,
      activeClass: "bg-rose-600 text-white font-semibold",
      softClass: "bg-rose-500/10 ring-1 ring-rose-500/40 hover:bg-rose-500/20",
      iconClass: "text-rose-600",
    },
    {
      id: "local",
      label: "Local Community",
      count: statusCounts.local,
      icon: Sparkles,
      activeClass: "bg-brand text-white font-semibold",
      softClass: "bg-brand/10 ring-1 ring-brand/40 hover:bg-brand/20",
      iconClass: "text-brand",
    },
  ];

  return (
    <aside aria-label="Calendar search and filtering tools" className={cn("flex flex-col gap-5", className)}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-1 border-b border-line/70">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-brand" />
          <h2 className="font-display text-sm font-bold tracking-tight text-ink">Search & Filters</h2>
          {hasActiveFilters && (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand ring-1 ring-brand/30">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset all search filters"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-mute hover:text-brand transition cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close filters drawer"
              className="grid h-7 w-7 place-items-center rounded-full text-mute hover:bg-paper hover:text-ink lg:hidden cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* View Mode Toggle Control (Week, Month, Day) */}
      <div className="space-y-1.5" id={`${idPrefix}-view-mode`}>
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-mute">
          <span>Calendar View</span>
          <span className="text-[10px] font-semibold capitalize text-brand">{viewMode} mode</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Calendar view mode"
          className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 ring-1 ring-line/70 shadow-2xs"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "month"}
            onClick={() => {
              void triggerHapticSelection();
              onViewModeChange("month");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition active:scale-95 cursor-pointer",
              viewMode === "month" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-card/70",
            )}
          >
            <LayoutGrid size={13} />
            <span>Month</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "week"}
            onClick={() => {
              void triggerHapticSelection();
              onViewModeChange("week");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition active:scale-95 cursor-pointer",
              viewMode === "week" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-card/70",
            )}
          >
            <CalendarRange size={13} />
            <span>Week</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "day"}
            onClick={() => {
              void triggerHapticSelection();
              onViewModeChange("day");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition active:scale-95 cursor-pointer",
              viewMode === "day" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-card/70",
            )}
          >
            <CalendarDays size={13} />
            <span>Day</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "list"}
            onClick={() => {
              void triggerHapticSelection();
              onViewModeChange("list");
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition active:scale-95 cursor-pointer",
              viewMode === "list" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink hover:bg-card/70",
            )}
          >
            <List size={13} />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* 1. Search Bar */}
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-search`}
          className="block text-[11px] font-bold uppercase tracking-wider text-mute"
        >
          Search Events
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input
            id={`${idPrefix}-search`}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, tag (#jazz)..."
            aria-label="Search events by title or tag"
            className="h-11 sm:h-10 w-full rounded-xl bg-paper/90 pl-10 pr-10 text-[16px] sm:text-xs text-ink placeholder:text-mute border border-line outline-none transition focus:bg-card focus:ring-2 focus:ring-brand focus:border-brand shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search input"
              className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-mute hover:text-ink transition active:scale-95 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-mute">
          Matches event title, tag (e.g. <span className="font-semibold text-ink">#jazz</span>), venue, or city.
        </p>
      </div>

      {/* 2. Category Filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Categories</span>
          {category !== "all" && (
            <button
              type="button"
              onClick={() => onCategoryChange("all")}
              className="text-[10px] font-medium text-brand hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {CALENDAR_CATEGORIES.map((c) => {
            const isSelected = category === c.id;
            const theme = c.id !== "all" ? CATEGORY_THEMES[c.id] : null;
            const count = categoryCounts[c.id] || 0;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  void triggerHapticSelection();
                  onCategoryChange(c.id);
                }}
                aria-pressed={isSelected}
                className={cn(
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer active:scale-[0.98]",
                  theme
                    ? isSelected
                      ? cn(theme.blockActiveClass, "shadow-xs")
                      : cn(theme.blockClass, "text-ink/90 font-medium")
                    : isSelected
                      ? "bg-brand text-white font-medium shadow-xs"
                      : "bg-ink/[0.04] text-ink/85 ring-1 ring-ink/15 hover:bg-ink/[0.08]",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {theme ? (
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full shrink-0", isSelected ? "bg-white" : theme.dotClass)}
                    />
                  ) : (
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", isSelected ? "bg-white" : "bg-ink/30")} />
                  )}
                  <span className="truncate">{c.label}</span>
                </div>
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 py-0.2 text-[10px] font-semibold shrink-0",
                    isSelected
                      ? "bg-white/25 text-white"
                      : theme
                        ? theme.countClass
                        : "bg-paper text-mute ring-1 ring-line/50",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Popular Tags */}
      {allTags.length > 0 && (
        <div className="space-y-2 border-t border-line/60 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mute">
              <Tag size={12} className="text-gold" />
              <span>Tags</span>
            </div>
            {searchQuery.startsWith("#") && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-[10px] font-medium text-brand hover:underline cursor-pointer"
              >
                Clear tag
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {displayedTags.map((tag) => {
              const tagWithHash = `#${tag.toLowerCase()}`;
              const tagWithoutHash = tag.toLowerCase();
              const currentSearch = searchQuery.trim().toLowerCase();
              const isActive =
                currentSearch === tagWithHash ||
                currentSearch === tagWithoutHash ||
                currentSearch === `#${tag}`.toLowerCase();

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    if (isActive) {
                      onSearchChange("");
                    } else {
                      onSearchChange(`#${tag}`);
                    }
                  }}
                  aria-pressed={isActive}
                  title={isActive ? `Remove #${tag} filter` : `Filter by #${tag}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition active:scale-95 cursor-pointer",
                    isActive
                      ? "bg-brand text-white font-semibold shadow-xs ring-1 ring-brand-ink"
                      : "bg-paper text-mute hover:text-ink hover:bg-paper/80 ring-1 ring-line/60",
                  )}
                >
                  <span>#{tag}</span>
                  {isActive && <X size={10} />}
                </button>
              );
            })}
          </div>

          {allTags.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllTags(!showAllTags)}
              className="flex items-center gap-1 text-[11px] font-medium text-mute hover:text-ink transition cursor-pointer pt-0.5"
            >
              <span>{showAllTags ? "Show fewer tags" : `+${allTags.length - 10} more tags`}</span>
              {showAllTags ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      )}

      {/* 4. Attendance & Status Filters */}
      <div className="space-y-2 border-t border-line/60 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Status & Picks</span>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className="text-[10px] font-medium text-brand hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {statusOptions.map((opt) => {
            const isSelected = filter === opt.id;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  void triggerHapticSelection();
                  onFilterChange(opt.id);
                }}
                aria-pressed={isSelected}
                className={cn(
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer active:scale-[0.98]",
                  isSelected ? cn(opt.activeClass, "shadow-xs") : cn(opt.softClass, "text-ink/90 font-medium"),
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={isSelected ? "text-white" : opt.iconClass} />
                  <span>{opt.label}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                    isSelected ? "bg-white/25 text-white" : "bg-white/70 text-ink ring-1 ring-black/10",
                  )}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Live Count Footer */}
      <div className="rounded-xl bg-paper/90 p-3 text-xs text-mute ring-1 ring-line/60 space-y-2 mt-auto">
        <div className="flex items-center justify-between">
          <span>Matching Events:</span>
          <span className="font-semibold text-ink">
            {filteredCount} of {totalCount}
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onResetFilters();
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-card py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-line/60 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </aside>
  );
}
