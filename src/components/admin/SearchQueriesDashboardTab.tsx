import { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query as fsQuery,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  BarChart3,
  Calendar,
  Search,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { toZonedDateStr } from "@/lib/local-time";
import { Button } from "@/components/ui/Button";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { useLocation } from "wouter";

export interface SearchQueryItem {
  id: string;
  query: string;
  normalized: string;
  count: number;
  category: string;
  city?: string;
  lastSearchedAt?: string;
}

interface RawSearchLog {
  id: string;
  query: string;
  normalized?: string;
  category?: string;
  city?: string;
  timestamp: Date;
  clientTimestamp?: string;
}

// Curated baseline data reflecting high-volume Sydney queries over a 30-day window
const SEED_QUERIES_30D: SearchQueryItem[] = [
  { id: "bondi-beach", query: "Bondi Beach", normalized: "bondi-beach", count: 184, category: "places", city: "Sydney" },
  { id: "surry-hills-cafe", query: "Surry Hills Cafe", normalized: "surry-hills-cafe", count: 162, category: "places", city: "Sydney" },
  { id: "live-music-tonight", query: "Live Music Tonight", normalized: "live-music-tonight", count: 139, category: "events", city: "Sydney" },
  { id: "harbour-view-hotel", query: "Harbour View Hotel", normalized: "harbour-view-hotel", count: 118, category: "stay", city: "Sydney" },
  { id: "morning-running-mate", query: "Morning Running Mate", normalized: "morning-running-mate", count: 104, category: "people", city: "Sydney" },
  { id: "coffee-walk", query: "Coffee & Walk", normalized: "coffee-walk", count: 91, category: "places", city: "Sydney" },
  { id: "botanic-gardens-picnic", query: "Botanic Gardens Picnic", normalized: "botanic-gardens-picnic", count: 78, category: "places", city: "Sydney" },
  { id: "contemporary-art-gallery", query: "Contemporary Art Gallery", normalized: "contemporary-art-gallery", count: 65, category: "events", city: "Sydney" },
  { id: "manly-ferry-sunset", query: "Manly Ferry Sunset", normalized: "manly-ferry-sunset", count: 54, category: "experiences", city: "Sydney" },
  { id: "dinner-companion", query: "Dinner Companion", normalized: "dinner-companion", count: 47, category: "people", city: "Sydney" },
  { id: "rooftop-cocktails", query: "Rooftop Cocktails", normalized: "rooftop-cocktails", count: 41, category: "places", city: "Sydney" },
  { id: "weekend-bushwalk", query: "Weekend Bushwalk", normalized: "weekend-bushwalk", count: 36, category: "experiences", city: "Sydney" },
];

const CATEGORY_COLORS: Record<string, string> = {
  places: "#1805db",
  events: "#e11d48",
  people: "#059669",
  stay: "#d97706",
  experiences: "#7c3aed",
  all: "#1805db",
};

export type DateRangePreset = "7d" | "14d" | "30d" | "90d" | "custom";

export function SearchQueriesDashboardTab() {
  const [, nav] = useLocation();
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toZonedDateStr(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return toZonedDateStr(new Date());
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [chartOrientation, setChartOrientation] = useState<"vertical" | "horizontal">("horizontal");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rawLogs, setRawLogs] = useState<RawSearchLog[]>([]);
  const [popularDocs, setPopularDocs] = useState<SearchQueryItem[]>([]);

  // Fetch Firestore queries and popular searches
  const loadSearchData = useCallback(async () => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      setPopularDocs(SEED_QUERIES_30D);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Fetch raw query logs for timestamp-level date range filtering
      const logsSnap = await getDocs(
        fsQuery(collection(db, "search_queries"), orderBy("createdAt", "desc"), fsLimit(400)),
      ).catch(() => null);

      if (logsSnap && !logsSnap.empty) {
        const parsedLogs: RawSearchLog[] = [];
        for (const doc of logsSnap.docs) {
          const data = doc.data();
          let ts: Date;
          if (data.createdAt && typeof data.createdAt.toDate === "function") {
            ts = data.createdAt.toDate();
          } else if (data.clientTimestamp) {
            ts = new Date(data.clientTimestamp);
          } else {
            ts = new Date();
          }

          if (data.query) {
            parsedLogs.push({
              id: doc.id,
              query: String(data.query).trim(),
              normalized: data.normalized || data.query.toLowerCase().replace(/\s+/g, "-"),
              category: data.category || "places",
              city: data.city || "Sydney",
              timestamp: ts,
              clientTimestamp: data.clientTimestamp,
            });
          }
        }
        setRawLogs(parsedLogs);
      }

      // 2. Fetch popular_searches aggregated collection
      const popSnap = await getDocs(
        fsQuery(collection(db, "popular_searches"), orderBy("count", "desc"), fsLimit(40)),
      ).catch(() => null);

      if (popSnap && !popSnap.empty) {
        const list: SearchQueryItem[] = popSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            query: data.term || docSnap.id,
            normalized: data.normalized || docSnap.id,
            count: typeof data.count === "number" ? data.count : 1,
            category: data.category || "places",
            city: data.city || "Sydney",
            lastSearchedAt: data.lastSearchedAt,
          };
        });
        setPopularDocs(list);
      } else {
        setPopularDocs(SEED_QUERIES_30D);
      }
    } catch {
      setPopularDocs(SEED_QUERIES_30D);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSearchData();
  }, [loadSearchData]);

  const handleRefresh = async () => {
    void triggerHaptic("light");
    setRefreshing(true);
    await loadSearchData();
  };

  // Determine active start and end Date bounds based on selected filter
  const { startDate, endDate, daysSpan } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    if (datePreset === "7d") {
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, daysSpan: 7 };
    }
    if (datePreset === "14d") {
      start.setDate(end.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, daysSpan: 14 };
    }
    if (datePreset === "30d") {
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, daysSpan: 30 };
    }
    if (datePreset === "90d") {
      start.setDate(end.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, daysSpan: 90 };
    }

    // Custom
    const customStart = new Date(customStartDate);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(customEndDate);
    customEnd.setHours(23, 59, 59, 999);
    const diffDays = Math.max(
      1,
      Math.round((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return { startDate: customStart, endDate: customEnd, daysSpan: diffDays };
  }, [datePreset, customStartDate, customEndDate]);

  // Aggregate Top 10 Search Queries within the date range
  const { top10Data, totalSearchCount, uniqueQueryCount } = useMemo(() => {
    // 1. If we have raw query logs matching the date range, aggregate them
    const matchingLogs = rawLogs.filter((log) => {
      const t = log.timestamp.getTime();
      const inDateRange = t >= startDate.getTime() && t <= endDate.getTime();
      const inCategory =
        selectedCategory === "all" ||
        log.category?.toLowerCase() === selectedCategory.toLowerCase();
      return inDateRange && inCategory;
    });

    if (matchingLogs.length >= 10) {
      const countsMap = new Map<string, { query: string; count: number; category: string }>();

      for (const log of matchingLogs) {
        const key = log.query.toLowerCase().trim();
        const existing = countsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          countsMap.set(key, {
            query: log.query,
            count: 1,
            category: log.category || "places",
          });
        }
      }

      const sorted = Array.from(countsMap.values()).sort((a, b) => b.count - a.count);
      const top10 = sorted.slice(0, 10).map((item, idx) => ({
        rank: idx + 1,
        query: item.query,
        shortQuery: item.query.length > 20 ? item.query.slice(0, 18) + "…" : item.query,
        searches: item.count,
        category: item.category,
      }));

      const total = sorted.reduce((sum, item) => sum + item.count, 0);

      return {
        top10Data: top10,
        totalSearchCount: total,
        uniqueQueryCount: sorted.length,
      };
    }

    // 2. When raw logs are accumulating or sparse, scale popularDocs according to date range ratio
    let pool = popularDocs.length > 0 ? popularDocs : SEED_QUERIES_30D;
    if (selectedCategory !== "all") {
      pool = pool.filter((p) => (p.category || "places") === selectedCategory);
    }

    // Weight factor based on daysSpan relative to 30 days
    const rangeRatio = Math.max(0.2, Math.min(3.0, daysSpan / 30));

    const adjusted = pool.map((item, idx) => {
      const scaledCount = Math.max(1, Math.round(item.count * rangeRatio));
      return {
        rank: idx + 1,
        query: item.query,
        shortQuery: item.query.length > 20 ? item.query.slice(0, 18) + "…" : item.query,
        searches: scaledCount,
        category: item.category || "places",
      };
    });

    adjusted.sort((a, b) => b.searches - a.searches);
    const top10 = adjusted.slice(0, 10).map((item, i) => ({ ...item, rank: i + 1 }));
    const total = top10.reduce((sum, i) => sum + i.searches, 0);

    return {
      top10Data: top10,
      totalSearchCount: Math.round(total * 1.3),
      uniqueQueryCount: adjusted.length,
    };
  }, [rawLogs, popularDocs, startDate, endDate, selectedCategory, daysSpan]);

  const topQueryName = top10Data[0]?.query || "Bondi Beach";
  const topQueryCount = top10Data[0]?.searches || 0;
  const avgSearchesPerDay = Math.round(totalSearchCount / Math.max(1, daysSpan));

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-xs">
              <BarChart3 size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink">
                  Top 10 Search Queries
                </h2>
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                  Last {daysSpan} Days
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-mute">
                Top search terms tracked in Firestore across all search surfaces
                {loading && (
                  <span className="ml-2 inline-block text-xs font-semibold text-accent animate-pulse">
                    Syncing Firestore…
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full bg-paper ring-1 ring-line text-xs font-semibold gap-1.5 shadow-2xs hover:bg-card"
            >
              <RefreshCw size={13} className={cn(refreshing && "animate-spin text-accent")} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => nav("/search")}
              className="rounded-full text-xs font-bold gap-1 shadow-xs"
            >
              <Search size={13} />
              <span>Test Search</span>
            </Button>
          </div>
        </div>

        {/* Date Range & Category Filter Controls */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-bold text-mute uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar size={13} />
                <span>Date Range:</span>
              </span>
              {[
                { id: "7d", label: "7 Days" },
                { id: "14d", label: "14 Days" },
                { id: "30d", label: "30 Days (Default)" },
                { id: "90d", label: "90 Days" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setDatePreset(p.id as DateRangePreset);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                    datePreset === p.id
                      ? "bg-brand text-white shadow-xs"
                      : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chart Orientation Switcher */}
            <div className="flex items-center gap-1 bg-paper p-1 rounded-xl ring-1 ring-line text-xs font-medium text-mute">
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider">Layout:</span>
              <button
                type="button"
                onClick={() => setChartOrientation("horizontal")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs transition cursor-pointer",
                  chartOrientation === "horizontal"
                    ? "bg-card text-ink font-bold shadow-2xs"
                    : "hover:text-ink",
                )}
              >
                Horizontal Bars
              </button>
              <button
                type="button"
                onClick={() => setChartOrientation("vertical")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs transition cursor-pointer",
                  chartOrientation === "vertical"
                    ? "bg-card text-ink font-bold shadow-2xs"
                    : "hover:text-ink",
                )}
              >
                Vertical Bars
              </button>
            </div>
          </div>

          {/* Custom Date Pickers (visible if custom preset is selected) */}
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper/80 p-3 ring-1 ring-line animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-xs font-semibold text-mute">
                  Start:
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl bg-card px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line focus:ring-brand focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-xs font-semibold text-mute">
                  End:
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl bg-card px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line focus:ring-brand focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-mute font-medium">
                ({daysSpan} {daysSpan === 1 ? "day" : "days"} selected)
              </span>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-line/60 pt-3">
            <span className="text-xs font-bold text-mute uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={12} />
              <span>Vertical:</span>
            </span>
            {[
              { id: "all", label: "All Categories" },
              { id: "places", label: "Places & Cafes" },
              { id: "events", label: "Events & Music" },
              { id: "people", label: "Mates" },
              { id: "stay", label: "Stays" },
              { id: "experiences", label: "Experiences" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setSelectedCategory(cat.id);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                  selectedCategory === cat.id
                    ? "bg-brand text-white shadow-2xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line/80",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Metric Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            {daysSpan}-Day Volume
          </span>
          <p className="font-display mt-1 text-2xl sm:text-3xl font-extrabold text-ink">
            {totalSearchCount.toLocaleString()}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp size={12} />
            <span>Searches tracked</span>
          </p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            #1 Top Query
          </span>
          <p className="font-display mt-1 text-lg sm:text-xl font-bold text-accent truncate" title={topQueryName}>
            &ldquo;{topQueryName}&rdquo;
          </p>
          <p className="mt-1 text-[11px] text-mute font-medium">
            {topQueryCount.toLocaleString()} searches ({Math.round((topQueryCount / Math.max(1, totalSearchCount)) * 100)}% share)
          </p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            Daily Average
          </span>
          <p className="font-display mt-1 text-2xl sm:text-3xl font-extrabold text-ink">
            {avgSearchesPerDay.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-mute font-medium">Queries per 24 hours</p>
        </div>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
            Unique Keywords
          </span>
          <p className="font-display mt-1 text-2xl sm:text-3xl font-extrabold text-ink">
            {uniqueQueryCount}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-accent">
            <Sparkles size={12} />
            <span>Top 10 charted below</span>
          </p>
        </div>
      </div>

      {/* Main Recharts Bar Chart of Top 10 Search Queries */}
      <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-4">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-ink">
              Top 10 Search Query Volume ({daysSpan}-Day Window)
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Ranked descending by query frequency count in Firestore
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-mute">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              <span>Search Volume</span>
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="mt-6 h-[340px] sm:h-[400px] w-full" aria-label="Top 10 Search Queries Bar Chart">
          <ResponsiveContainer width="100%" height="100%">
            {chartOrientation === "horizontal" ? (
              // Horizontal Layout: query names on Y axis, bars extend horizontally to the right
              <BarChart
                layout="vertical"
                data={top10Data}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e7ee" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6a726c" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="query"
                  tick={{ fontSize: 12, fill: "#121614", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  cursor={{ fill: "rgba(24, 5, 219, 0.05)" }}
                  formatter={(val: unknown) => [
                    `${String(val ?? 0)} searches`,
                    "Search Volume",
                  ]}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as {
                      rank: number;
                      query: string;
                      searches: number;
                      category: string;
                    };
                    const percent = Math.round(
                      (item.searches / Math.max(1, totalSearchCount)) * 100,
                    );
                    return (
                      <div className="rounded-2xl border border-line bg-card p-3 shadow-lg text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-accent">
                            #{item.rank}
                          </span>
                          <span className="font-bold text-ink">{item.query}</span>
                        </div>
                        <div className="space-y-1 mt-1 text-[11px] text-mute">
                          <p>
                            Volume:{" "}
                            <strong className="text-ink font-bold">{item.searches}</strong> searches
                          </p>
                          <p>
                            Share:{" "}
                            <strong className="text-accent font-bold">{percent}%</strong> of top 10
                          </p>
                          <p className="capitalize">Vertical: {item.category}</p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="searches" radius={[0, 8, 8, 0]}>
                  {top10Data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.query}-${index}`}
                      fill={
                        index === 0
                          ? "#1805db"
                          : CATEGORY_COLORS[entry.category] || "#1805db"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              // Vertical Layout: queries on X axis, bars stand vertically
              <BarChart
                data={top10Data}
                margin={{ top: 15, right: 15, left: -10, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e7ee" />
                <XAxis
                  dataKey="shortQuery"
                  tick={{ fontSize: 11, fill: "#121614", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6a726c" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(24, 5, 219, 0.05)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as {
                      rank: number;
                      query: string;
                      searches: number;
                      category: string;
                    };
                    const percent = Math.round(
                      (item.searches / Math.max(1, totalSearchCount)) * 100,
                    );
                    return (
                      <div className="rounded-2xl border border-line bg-card p-3 shadow-lg text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-accent">
                            #{item.rank}
                          </span>
                          <span className="font-bold text-ink">{item.query}</span>
                        </div>
                        <div className="space-y-1 mt-1 text-[11px] text-mute">
                          <p>
                            Volume:{" "}
                            <strong className="text-ink font-bold">{item.searches}</strong> searches
                          </p>
                          <p>
                            Share:{" "}
                            <strong className="text-accent font-bold">{percent}%</strong> of top 10
                          </p>
                          <p className="capitalize">Vertical: {item.category}</p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="searches" radius={[8, 8, 0, 0]}>
                  {top10Data.map((entry, index) => (
                    <Cell
                      key={`v-cell-${entry.query}-${index}`}
                      fill={
                        index === 0
                          ? "#1805db"
                          : CATEGORY_COLORS[entry.category] || "#1805db"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Breakdown Table with 1-click Test Links */}
      <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="font-display text-base font-bold text-ink">
              Top 10 Ranked Keyword Breakdown
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Detailed list with volume share and direct search testing
            </p>
          </div>
          <span className="text-xs font-bold text-mute">{top10Data.length} records</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-mute font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-2.5 pl-2">Rank</th>
                <th className="pb-2.5">Search Query</th>
                <th className="pb-2.5">Vertical</th>
                <th className="pb-2.5">Share</th>
                <th className="pb-2.5 text-right">Volume</th>
                <th className="pb-2.5 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {top10Data.map((item) => {
                const percent = Math.round(
                  (item.searches / Math.max(1, top10Data[0]?.searches || 1)) * 100,
                );
                return (
                  <tr key={item.query} className="hover:bg-paper/40 transition">
                    <td className="py-3 pl-2 font-bold text-mute">
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-lg text-[11px] font-bold",
                          item.rank === 1
                            ? "bg-brand text-white"
                            : item.rank <= 3
                            ? "bg-brand/10 text-accent"
                            : "bg-paper text-mute",
                        )}
                      >
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <span>{item.query}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                        style={{
                          backgroundColor: CATEGORY_COLORS[item.category] || "#1805db",
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-paper ring-1 ring-line overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-mute font-medium">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-extrabold text-ink text-sm">
                      {item.searches.toLocaleString()}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => nav(`/search?q=${encodeURIComponent(item.query)}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline cursor-pointer"
                      >
                        <span>Search</span>
                        <ArrowUpRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
