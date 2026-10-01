import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { FilterChips } from "@/components/discovery/FilterChips";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/PageLoading";
import { useStay } from "@/contexts/StayContext";
import { askLocal } from "@/lib/ask";
import { getMarker, nearbyForMarker, placesWithDeals, PRECINCT } from "@/lib/catalog";
import { fetchMarker } from "@/lib/markers-store";
import type { MarkerDoc } from "@shared/nearby";
import { eventsTonight } from "@/lib/local-events";
import { tonightCalendarEvents } from "@/lib/remote-events";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/hooks/useLocalNow";
import { noteQrContext, track } from "@/lib/analytics";
import { ArrowLeft, Sparkles } from "lucide-react";

export function MarkerPage() {
  const [path, nav] = useLocation();
  const { setSession } = useStay();
  const { now, timeZone, city } = useLocalNow();
  const { calendarEvents, remoteNearby } = useEvents();
  // Live DB events around the guest — no bundled seed fallbacks.
  const tonight = useMemo(() => {
    const nearby = eventsTonight(remoteNearby, now, timeZone).map((ev) => ({
      id: ev.id,
      title: ev.title,
      sub: ev.when,
      image: ev.heroImage,
    }));
    const cal = tonightCalendarEvents(calendarEvents, now, timeZone, city).map((ev) => ({
      id: ev.id,
      title: ev.title,
      sub: ev.timeLabel,
      image: ev.heroImage,
    }));
    const seen = new Set(nearby.map((e) => e.id));
    return [...nearby, ...cal.filter((e) => !seen.has(e.id))];
  }, [remoteNearby, calendarEvents, now, timeZone, city]);
  const markerId = path.split("/").filter(Boolean)[1] || "";
  const [marker, setMarker] = useState<MarkerDoc | undefined>(() => getMarker(markerId));
  const [markerChecked, setMarkerChecked] = useState(false);
  useEffect(() => {
    let alive = true;
    setMarker(getMarker(markerId));
    setMarkerChecked(false);
    void fetchMarker(markerId).then((m) => {
      if (!alive) return;
      setMarker(m);
      setMarkerChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [markerId]);
  const [chip, setChip] = useState("all");
  const [askOpen, setAskOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    setSession({
      kind: marker?.kind === "room" ? "stay" : "marker",
      markerId,
      propertyId: marker?.propertyId,
      roomToken: marker?.roomToken,
      room: undefined,
    });
    if (markerId) noteQrContext(`marker:${markerId}`, { markerId, propertyId: marker?.propertyId, source: "marker" });
  }, [marker, markerId, setSession]);

  const places = useMemo(() => {
    let rows = nearbyForMarker(marker);
    if (chip === "deals") rows = placesWithDeals(rows);
    else if (chip !== "all" && chip !== "tonight") rows = rows.filter((p) => p.category === chip);
    return rows;
  }, [marker, chip]);

  const isStayMarker = marker?.kind === "room" || marker?.kind === "lobby";

  // A context_view with loadStatus "ok" already fired for /q/:id — pair it
  // with context_load_failed when the code resolves to nothing.
  const loadFailed = useRef("");
  useEffect(() => {
    if (!markerChecked || marker || !markerId || loadFailed.current === markerId) return;
    loadFailed.current = markerId;
    void track("context_load_failed", { contextType: "marker", contextId: markerId, errorClass: "not_found" });
  }, [markerChecked, marker, markerId]);

  if (!markerChecked && !marker) {
    return <PageLoading />;
  }

  if (markerChecked && !marker) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          kicker="Unknown code"
          title="This QR isn’t listed"
          body="The code you scanned isn’t attached to any venue yet."
          action={() => nav("/")}
          actionLabel="Explore nearby"
        />
      </div>
    );
  }

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else nav("/");
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ring-line bg-card transition hover:ring-brand/40 active:scale-95"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{marker?.city || PRECINCT.name}</p>
      </div>
      <h1 className="font-display mt-1 text-3xl font-semibold">{marker?.label || "Nearby"}</h1>
      <div className="mt-4">
        <FilterChips value={chip} onChange={setChip} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Ask", run: () => setAskOpen(true) },
          {
            label: "Stay",
            run: () => marker?.propertyId && nav(`/g/${marker.propertyId}?room=101`),
            hide: !isStayMarker || !marker?.propertyId,
          },
          { label: "Walk", run: () => nav("/guide") },
          { label: "Tonight", run: () => setChip("tonight") },
        ]
          .filter((x) => !x.hide)
          .map((x) => (
            <button
              key={x.label}
              onClick={x.run}
              className="h-11 rounded-2xl bg-card text-sm font-medium ring-1 ring-line"
            >
              {x.label}
            </button>
          ))}
      </div>

      {chip === "tonight" ? (
        <div className="mt-6 space-y-3">
          {tonight.length === 0 && (
            <EmptyState
              title="Nothing live here right now"
              body="Check the calendar for later this week."
              action={() => nav("/calendar")}
              actionLabel="Calendar"
            />
          )}
          {tonight.map((ev) => (
            <button
              key={ev.id}
              onClick={() => nav(`/e/${ev.id}`)}
              className="block w-full overflow-hidden rounded-3xl text-left"
            >
              {ev.image && (
                <img src={ev.image} alt="" referrerPolicy="no-referrer" className="h-36 w-full object-cover" />
              )}
              <div className="bg-card p-3 ring-1 ring-line">
                <p className="text-[11px] text-gold">{ev.sub}</p>
                <p className="font-display text-lg">{ev.title}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {places.length === 0 ? (
            <div className="col-span-2">
              <EmptyState
                title="Nothing nearby yet"
                body="Scan a stay QR or open Explore when venues are listed for this marker."
                action={() => nav("/")}
                actionLabel="Explore"
              />
            </div>
          ) : (
            places.slice(0, 12).map((p) => <PlaceCard key={p.id} place={p} walk={p.walk} />)
          )}
        </div>
      )}

      <Sheet open={askOpen} onClose={() => setAskOpen(false)} title="Ask">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAnswer(askLocal(q, { now, timeZone }));
            if (q.trim()) {
              void track("ask_submitted", { contextId: markerId, questionCategory: "nearby" });
              void track("ask_answered", { contextId: markerId, answerStatus: "shown", questionCategory: "nearby" });
            }
          }}
        >
          <div className="flex items-center gap-2 rounded-full bg-paper px-3 ring-1 ring-line">
            <Sparkles size={16} className="text-brand" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full bg-transparent outline-none"
              placeholder="What’s near?"
            />
          </div>
          <Button type="submit" className="mt-3 w-full">
            Ask
          </Button>
        </form>
        {answer && <p className="mt-4 text-[15px] leading-relaxed">{answer.body}</p>}
      </Sheet>
    </div>
  );
}
