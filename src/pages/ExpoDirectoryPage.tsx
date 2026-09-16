import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { EVENT_FLAVOUR_LABELS, STALL_CATEGORIES, stallFieldLabels, stallUnitDisplay, type EventRecord, type StallCategoryId } from "@shared/event";
import { hrefForStall } from "@/lib/bio-handle";
import { useEvents } from "@/contexts/EventsContext";
import { cn } from "@/lib/cn";
import { EmojiRate } from "@/components/feedback/EmojiRate";

export function ExpoDirectoryPage({ event }: { event: EventRecord }) {
  const [, nav] = useLocation();
  const { stallsFor } = useEvents();
  const stalls = stallsFor(event.id);
  const chips = useMemo(() => {
    const present = new Set(stalls.map((s) => s.category));
    return STALL_CATEGORIES.filter((c) => present.has(c.id) || event.categoryChips.includes(c.id));
  }, [event.categoryChips, stalls]);
  const [chip, setChip] = useState<"all" | StallCategoryId>("all");
  const [q, setQ] = useState("");
  const rows = stalls.filter((s) => {
    if (chip !== "all" && s.category !== chip) return false;
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return (
      s.name.toLowerCase().includes(n) ||
      s.booth.toLowerCase().includes(n) ||
      s.shortWhy.toLowerCase().includes(n) ||
      (s.handle || "").toLowerCase().includes(n.replace(/^@/, ""))
    );
  });

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <p className="pt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{EVENT_FLAVOUR_LABELS[event.flavour]}</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{event.name}</h1>
      <p className="mt-1 text-sm text-mute">
        {[event.venue, event.city, `${stalls.length} ${stallFieldLabels(event.flavour).listNoun}`].filter(Boolean).join(" · ")}
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Business, stall number, or @handle"
        className="mt-4 h-12 w-full rounded-full bg-card px-4 border border-ink outline-none focus:border-brand"
      />
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setChip("all")}
          className={cn("h-9 shrink-0 rounded-full px-4 text-sm", chip === "all" ? "bg-ink text-white" : "bg-white ring-1 ring-line")}
        >
          All
        </button>
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            className={cn("h-9 shrink-0 rounded-full px-4 text-sm", chip === c.id ? "bg-ink text-white" : "bg-white ring-1 ring-line")}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className="mt-5 space-y-2">
        {rows.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => nav(hrefForStall(s))}
              className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line"
            >
              <span>
                <span className="block text-[12px] text-mute">
                  {stallUnitDisplay(event.flavour, s.booth)}
                  {" · "}
                  {STALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                </span>
                <span className="font-medium">{s.name}</span>
                {s.handle && <span className="mt-0.5 block text-[12px] text-mute">@{s.handle}</span>}
                {s.offer && <span className="mt-0.5 block text-[13px] text-gold">{s.offer}</span>}
              </span>
              <span className="shrink-0 text-sm text-mute">{s.handle ? `@${s.handle}` : "Open"}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-6 w-full text-center text-sm text-brand" onClick={() => nav("/me")}>
        My stalls
      </button>
      <EmojiRate target="event" eventId={event.id} />
    </div>
  );
}
