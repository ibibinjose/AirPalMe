import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  EVENT_FLAVOUR_LABELS,
  STALL_CATEGORIES,
  stallFieldLabels,
  stallUnitDisplay,
  type EventRecord,
  type StallCategoryId,
} from "@shared/event";
import { bioPath } from "@shared/bio";
import { hrefForStall } from "@/lib/bio-handle";
import { useEvents } from "@/contexts/EventsContext";
import { cn } from "@/lib/cn";
import { EmojiRate } from "@/components/feedback/EmojiRate";
import { Photo } from "@/components/ui/Photo";
import { MapPin, Navigation, Info, ArrowLeft, Share2, Building2, User, Users, ExternalLink } from "lucide-react";
import { mapsPlaceUrl } from "@/lib/maps";
import { shareNative } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import { toast } from "sonner";

export function ExpoDirectoryPage({ event }: { event: EventRecord }) {
  const [, nav] = useLocation();
  const { stallsFor, savedStalls, isSaved } = useEvents();
  const stalls = stallsFor(event.id);
  const visitList = savedStalls.filter((s) => s.eventId === event.id);
  const chips = useMemo(() => {
    const present = new Set(stalls.map((s) => s.category));
    return STALL_CATEGORIES.filter((c) => present.has(c.id) || event.categoryChips.includes(c.id));
  }, [event.categoryChips, stalls]);
  const [chip, setChip] = useState<"all" | StallCategoryId>("all");
  const [q, setQ] = useState("");
  const [showDesc, setShowDesc] = useState(false);

  const rows = stalls.filter((s) => {
    if (chip !== "all" && s.category !== chip) return false;
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return (
      s.name.toLowerCase().includes(n) ||
      s.booth.toLowerCase().includes(n) ||
      (s.location || "").toLowerCase().includes(n) ||
      s.shortWhy.toLowerCase().includes(n) ||
      (s.handle || "").toLowerCase().includes(n.replace(/^@/, ""))
    );
  });

  const mapsUrl = event.geo
    ? mapsPlaceUrl(event.geo, event.venue || event.name)
    : event.venue || event.city
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue || ""}, ${event.city}`)}`
      : undefined;

  const handleShare = async () => {
    const shared = await shareNative({
      title: event.name,
      text: event.shortWhy || `Explore ${event.name} on AirPal`,
      url: toPublicUrl(event.gatePath),
    });
    if (!shared) {
      toast.success("Directory link copied to clipboard");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-16">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else nav("/");
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-mute hover:text-ink transition"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="grid h-8 w-8 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink shadow-xs transition"
          title="Share Directory"
        >
          <Share2 size={14} />
        </button>
      </div>

      {/* Hero Banner Image (if set) */}
      {event.coverImage && (
        <div className="relative h-44 w-full overflow-hidden rounded-3xl bg-paper shadow-xs ring-1 ring-line mb-3">
          <Photo src={event.coverImage} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <span className="rounded-full bg-black/50 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {EVENT_FLAVOUR_LABELS[event.flavour]}
            </span>
          </div>
        </div>
      )}

      {!event.coverImage && (
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
          {EVENT_FLAVOUR_LABELS[event.flavour]}
        </p>
      )}

      <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink">{event.name}</h1>
      
      {event.shortWhy && (
        <p className="mt-1 text-xs text-ink/80 font-medium">{event.shortWhy}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-mute border-y border-line/60 py-2.5">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} className="text-gold" />
          {[event.venue, event.city].filter(Boolean).join(" · ")}
        </span>
        <div className="flex items-center gap-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand font-semibold hover:underline inline-flex items-center gap-1"
            >
              <Navigation size={11} />
              <span>Directions</span>
            </a>
          )}
          <span className="font-medium text-ink">
            {stalls.length} {stallFieldLabels(event.flavour).listNoun}
          </span>
        </div>
      </div>

      {/* Host & Collaborators Attribution Card */}
      {(event.hostName || event.hostHandle || (event.collaboratorHandles && event.collaboratorHandles.length > 0)) && (
        <div className="mt-3 rounded-2xl bg-card p-3.5 ring-1 ring-line shadow-xs space-y-2.5">
          {(event.hostName || event.hostHandle) && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  {event.hostType === "business" ? <Building2 size={14} /> : <User size={14} />}
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">
                    {event.hostType === "business" ? "Hosted by Business" : "Hosted by"}
                  </span>
                  <span className="block font-semibold text-ink truncate">
                    {event.hostName || (event.hostHandle ? `@${event.hostHandle}` : "Host")}
                  </span>
                </div>
              </div>

              {event.hostHandle && (
                <button
                  type="button"
                  onClick={() => nav(bioPath(event.hostHandle!))}
                  className="shrink-0 inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand/10 px-3.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition"
                >
                  <span>@{event.hostHandle}</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
          )}

          {event.collaboratorHandles && event.collaboratorHandles.length > 0 && (
            <div className="pt-2 border-t border-line/60">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1.5 flex items-center gap-1">
                <Users size={11} className="text-gold" /> Co-hosts & Collaborators
              </span>
              <div className="flex flex-wrap gap-1.5">
                {event.collaboratorHandles.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => nav(bioPath(handle))}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink border border-line hover:border-brand hover:text-brand transition shadow-2xs group"
                  >
                    <span className="text-mute group-hover:text-brand">@</span>
                    <span>{handle}</span>
                    <ExternalLink size={10} className="text-mute group-hover:text-brand" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable Description */}
      {event.description && (
        <div className="mt-3 rounded-2xl bg-card p-3.5 ring-1 ring-line text-xs leading-relaxed text-ink/85">
          <button
            type="button"
            onClick={() => setShowDesc(!showDesc)}
            className="flex items-center justify-between w-full font-semibold text-ink text-left"
          >
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-gold">
              <Info size={13} /> About This Event
            </span>
            <span className="text-mute text-[11px]">{showDesc ? "Less" : "More"}</span>
          </button>
          <p className={cn("mt-1.5 whitespace-pre-line text-xs text-mute", !showDesc && "line-clamp-2")}>
            {event.description}
          </p>
        </div>
      )}

      {/* Search Filter */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stall, business, or @handle..."
        className="mt-4 h-12 w-full rounded-full bg-card px-4 border border-line outline-none focus:border-brand shadow-xs text-sm"
      />

      {/* Category Filter Chips */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setChip("all")}
          className={cn(
            "h-11 shrink-0 rounded-full px-4 text-xs font-semibold transition active:scale-95",
            chip === "all" ? "bg-brand text-white shadow-xs" : "bg-card ring-1 ring-line text-mute hover:text-ink",
          )}
        >
          All ({stalls.length})
        </button>
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            className={cn(
              "h-11 shrink-0 rounded-full px-4 text-xs font-semibold transition active:scale-95",
              chip === c.id ? "bg-brand text-white shadow-xs" : "bg-card ring-1 ring-line text-mute hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* My visit list — saved stalls for this event */}
      {visitList.length > 0 && (
        <div className="mt-4 rounded-2xl bg-brand/[0.04] p-3 ring-1 ring-brand/20">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-brand">
            My visit list · {visitList.length}
          </p>
          <ul className="mt-2 space-y-1.5">
            {visitList.map((s) => (
              <li key={s.stallId}>
                <button
                  type="button"
                  onClick={() => nav(`/e/${event.id}/s/${s.stallId}`)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-card px-3 py-3 text-left ring-1 ring-line"
                >
                  <span className="min-w-0 text-[13px]">
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="block truncate text-[11px] text-mute">
                      {[s.booth ? `Stall ${s.booth}` : "", s.location].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-brand">Visit →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stalls List */}
      <ul className="mt-5 space-y-2">
        {rows.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => nav(hrefForStall(s))}
              className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line hover:ring-brand/30 transition shadow-xs group"
            >
              <span>
                <span className="block text-[11px] font-semibold text-mute">
                  {stallUnitDisplay(event.flavour, s.booth)}
                  {" · "}
                  {STALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                  {s.location ? ` · ${s.location}` : ""}
                </span>
                <span className="font-semibold text-sm text-ink group-hover:text-brand transition-colors">
                  {s.name}
                </span>
                {s.shortWhy && <span className="mt-0.5 block text-xs text-mute">{s.shortWhy}</span>}
                {s.offer && <span className="mt-0.5 block text-xs font-semibold text-gold">🏷️ {s.offer}</span>}
              </span>
              <span className="shrink-0 text-right text-xs font-medium text-mute group-hover:text-ink">
                {isSaved(s.id) && <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-brand">Saved</span>}
                {s.handle ? `@${s.handle}` : "View"}
              </span>
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="p-8 text-center text-xs text-mute rounded-2xl border border-dashed border-line">
            No stalls found matching &ldquo;{q}&rdquo;
          </li>
        )}
      </ul>

      <button
        type="button"
        className="mt-6 w-full text-center text-xs font-semibold text-brand hover:underline"
        onClick={() => nav("/event")}
      >
        Organiser Workspace & Stalls Manager →
      </button>

      <div className="mt-6">
        <EmojiRate target="event" eventId={event.id} />
      </div>
    </div>
  );
}

