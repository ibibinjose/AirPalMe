import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  LayoutGrid,
  MapPin,
  QrCode,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import {
  EVENT_FLAVOURS,
  EVENT_FLAVOUR_LABELS,
  STALL_CATEGORIES,
  stallCsvTemplate,
  stallFieldLabels,
  stallUnitDisplay,
  type EventFlavour,
  type StallCategoryId,
  type StallRecord,
} from "@shared/event";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { makeQrDataUrl } from "@/lib/qr";
import { ratingsForEvent } from "@/lib/ratings";
import { CITY_OPTIONS } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { landing, landingItem } from "@/lib/motion";

const field =
  "h-12 w-full rounded-2xl bg-paper/70 px-4 text-[16px] md:text-[15px] ring-1 ring-line outline-none transition placeholder:text-mute/70 focus:bg-card focus:ring-2 focus:ring-brand/45";

const FLAVOUR_META: Record<EventFlavour, { icon: typeof Store; blurb: string }> = {
  market: { icon: Store, blurb: "Makers, produce, and weekend stalls." },
  expo: { icon: LayoutGrid, blurb: "Trade floor, exhibitors, and a scanned directory." },
  event_space: { icon: Sparkles, blurb: "A one-off gathering with a gate QR." },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function nextSaturdayNine() {
  const d = new Date();
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(9, 0, 0, 0);
  return d;
}

function sameDayFifteen(start: Date) {
  const d = new Date(start);
  d.setHours(15, 0, 0, 0);
  return d;
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrganiserEventPage() {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { myEvent, stallsFor, upsertEvent, importCsv, upsertStall, confirmEventSchedule } = useEvents();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"today" | "stalls" | "print" | "settings">("today");
  const [name, setName] = useState("");
  const [flavour, setFlavour] = useState<EventFlavour>("market");
  const [city, setCity] = useState("Sydney");
  const [venue, setVenue] = useState("");
  const [startsLocal, setStartsLocal] = useState(() => toLocalInput(nextSaturdayNine().toISOString()));
  const [endsLocal, setEndsLocal] = useState(() => toLocalInput(sameDayFifteen(nextSaturdayNine()).toISOString()));
  const [status, setStatus] = useState<"draft" | "live" | "ended">("live");
  const [stallName, setStallName] = useState("");
  const [booth, setBooth] = useState("");
  const [stallHandle, setStallHandle] = useState("");
  const [stallOffer, setStallOffer] = useState("");
  const [stallWhy, setStallWhy] = useState("");
  const [stallCategory, setStallCategory] = useState<StallCategoryId>("shops");
  const [editingStallId, setEditingStallId] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const stalls = myEvent ? stallsFor(myEvent.id) : [];
  const feedback = myEvent ? ratingsForEvent(myEvent.id) : [];

  useEffect(() => {
    if (!myEvent) return;
    setName(myEvent.name);
    setFlavour(myEvent.flavour);
    setCity(myEvent.city);
    setVenue(myEvent.venue || "");
    setStartsLocal(toLocalInput(myEvent.startsAt));
    setEndsLocal(toLocalInput(myEvent.endsAt));
    setStatus(myEvent.status);
    const origin = window.location.origin;
    void makeQrDataUrl(`${origin}${myEvent.gatePath}`).then(setQr);
  }, [myEvent]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the event a name");
      return;
    }
    const startsAt = fromLocalInput(startsLocal);
    const endsAt = fromLocalInput(endsLocal);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      toast.error("End time needs to be after start");
      return;
    }
    setCreating(true);
    try {
      await upsertEvent({
        name: trimmed,
        flavour,
        city: city.trim() || "Sydney",
        venue: venue.trim(),
        startsAt: startsAt || new Date().toISOString(),
        endsAt: endsAt || undefined,
        status,
      });
      toast.success("Event is live — add stalls next");
      setTab("stalls");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t create event");
    } finally {
      setCreating(false);
    }
  }

  async function onCsv(file: File) {
    if (!myEvent) return;
    const text = await file.text();
    const n = await importCsv(myEvent.id, text);
    toast.success(`${n} stalls imported`);
    setTab("stalls");
  }

  function resetStallForm() {
    setEditingStallId(null);
    setStallName("");
    setBooth("");
    setStallHandle("");
    setStallOffer("");
    setStallWhy("");
    setStallCategory("shops");
  }

  function editStall(s: StallRecord) {
    setEditingStallId(s.id);
    setStallName(s.name);
    setBooth(s.booth || "");
    setStallHandle(s.handle || "");
    setStallOffer(s.offer || "");
    setStallWhy(s.shortWhy || "");
    setStallCategory(s.category);
    setTab("stalls");
  }

  async function onAddStall(e: FormEvent) {
    e.preventDefault();
    if (!myEvent || !stallName.trim()) {
      toast.error("Add a business name");
      return;
    }
    await upsertStall({
      id: editingStallId || undefined,
      eventId: myEvent.id,
      name: stallName.trim(),
      category: stallCategory,
      booth: booth.trim(),
      shortWhy: stallWhy.trim(),
      offer: stallOffer.trim() || undefined,
      handle: stallHandle.trim().replace(/^@+/, "").toLowerCase() || undefined,
    });
    resetStallForm();
    toast.success(editingStallId ? "Stall updated" : "Stall added");
  }

  async function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!myEvent) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the event a name");
      return;
    }
    const startsAt = fromLocalInput(startsLocal);
    const endsAt = fromLocalInput(endsLocal);
    setSaving(true);
    try {
      await upsertEvent({
        id: myEvent.id,
        name: trimmed,
        flavour,
        city: city.trim(),
        venue: venue.trim(),
        startsAt: startsAt || myEvent.startsAt,
        endsAt: endsAt || myEvent.endsAt,
        status,
      });
      toast.success("Event saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (!user) {
    return (
      <AuthGate
        next="/event"
        kicker="Event Organiser"
        title="Create an event"
        lede="Sign in or create an account first. Then you can run a market, expo, or festival directory with instant gate QR codes."
      />
    );
  }

  if (!myEvent) {
    return (
      <div className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -left-20 top-[-6rem] h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <motion.div
          className="relative mx-auto max-w-2xl px-4 py-8 pb-24"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={reduce ? undefined : landing}
        >
          <motion.header variants={landingItem}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Organiser</p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Create an event</h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-mute">
              Name it, pick a flavour, set when it runs. Guests scan the gate QR into a live stall directory.
            </p>
          </motion.header>

          <motion.form variants={landingItem} className="mt-6 space-y-5" onSubmit={onCreate}>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink/70">What kind of event?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {EVENT_FLAVOURS.map((id) => {
                  const meta = FLAVOUR_META[id];
                  const Icon = meta.icon;
                  const on = flavour === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFlavour(id)}
                      className={cn(
                        "rounded-[22px] p-4 text-left ring-1 transition duration-200 active:scale-[0.98]",
                        on ? "bg-ink text-white ring-ink shadow-md" : "bg-card/90 ring-line hover:ring-ink/25",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-2xl ring-1",
                          on ? "bg-white/15 text-white ring-white/20" : "bg-brand/10 text-brand ring-brand/20",
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="mt-3 block text-sm font-semibold">{EVENT_FLAVOUR_LABELS[id]}</span>
                      <span className={cn("mt-1 block text-[12px] leading-snug", on ? "text-white/70" : "text-mute")}>
                        {meta.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Event name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Rocks Weekend Market"
                className={field}
                autoComplete="off"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">City</span>
                <input
                  value={city}
                  list="event-cities"
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Sydney"
                  className={field}
                />
                <datalist id="event-cities">
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.label} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Venue</span>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Argyle Precinct"
                  className={field}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Starts</span>
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Ends</span>
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  className={field}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink/70">Publish</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["live", "Go live now"],
                    ["draft", "Save as draft"],
                  ] as const
                ).map(([id, label]) => {
                  const on = status === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setStatus(id)}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition",
                        on ? "bg-ink text-white ring-ink" : "bg-card text-mute ring-line hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full justify-between" disabled={creating}>
              <span>{creating ? "Creating…" : status === "draft" ? "Save draft" : "Create event"}</span>
              <ArrowRight size={18} />
            </Button>
          </motion.form>
        </motion.div>
      </div>
    );
  }

  const whenLabel = [formatWhen(myEvent.startsAt), formatWhen(myEvent.endsAt)].filter(Boolean).join(" → ");

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-24 top-[-6rem] h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-28 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 pb-16">
        <header className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              {EVENT_FLAVOUR_LABELS[myEvent.flavour]}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                myEvent.status === "live"
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
                  : myEvent.status === "draft"
                    ? "bg-amber-500/10 text-amber-800 ring-amber-500/20"
                    : "bg-paper text-mute ring-line",
              )}
            >
              {myEvent.status}
            </span>
          </div>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{myEvent.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
            {whenLabel ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                {whenLabel}
              </span>
            ) : null}
            {(myEvent.venue || myEvent.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} />
                {[myEvent.venue, myEvent.city].filter(Boolean).join(" · ")}
              </span>
            )}
          </p>
        </header>

        <div className="mt-5 flex gap-1 rounded-full bg-card/80 p-1 ring-1 ring-line shadow-sm backdrop-blur">
          {(["today", "stalls", "print", "settings"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "h-9 flex-1 rounded-full px-3 text-sm capitalize transition",
                tab === id ? "bg-ink text-white shadow-sm" : "text-mute hover:text-ink",
              )}
            >
              {id}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <div className="mt-5 space-y-3">
            <HostFreshnessBanner
              kind="events"
              at={myEvent.scheduleVerifiedAt || myEvent.updatedAt}
              onConfirm={async () => {
                await confirmEventSchedule();
                toast.success("Schedule confirmed");
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[22px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
                <p className="font-display text-4xl font-semibold">{stalls.length}</p>
                <p className="text-sm capitalize text-mute">{stallFieldLabels(myEvent.flavour).listNoun} live</p>
              </div>
              <div className="rounded-[22px] bg-card/90 p-5 ring-1 ring-line shadow-sm">
                <p className="font-display text-4xl font-semibold">{feedback.length}</p>
                <p className="text-sm text-mute">Guest ratings</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => nav("/business/campaigns")}
              className="flex w-full items-center justify-between gap-3 rounded-[22px] bg-ink p-4 text-left text-white"
            >
              <span>
                <span className="block text-sm font-semibold">Need a bigger crowd?</span>
                <span className="block text-xs text-white/70">Fund an Experience — AirPal fills the room.</span>
              </span>
              <span aria-hidden>→</span>
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => nav(myEvent.gatePath)}>
                Open guest directory
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => setTab("stalls")}>
                {stallFieldLabels(myEvent.flavour).addTitle}
              </Button>
            </div>
            {feedback.length > 0 && (
              <ul className="space-y-2">
                {feedback.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3 ring-1 ring-line">
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.stallName || "Event"}</span>
                      {r.note && <span className="block truncate text-[13px] text-mute">{r.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "stalls" && (
          <div className="mt-5 space-y-4">
            {(() => {
              const labels = stallFieldLabels(myEvent.flavour);
              return (
                <>
            <form className="space-y-3 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm" onSubmit={onAddStall}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {editingStallId ? "Edit" : labels.addTitle}
                  </h2>
                  <p className="text-[13px] text-mute">
                    Same fields for expo, market, and event space. Guests see them in the directory.
                  </p>
                </div>
                {editingStallId && (
                  <button type="button" className="text-xs font-semibold text-mute hover:text-ink" onClick={resetStallForm}>
                    Cancel
                  </button>
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">{labels.business}</span>
                <input
                  value={stallName}
                  onChange={(e) => setStallName(e.target.value)}
                  placeholder={labels.businessPlaceholder}
                  className={field}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">{labels.unit}</span>
                  <input
                    value={booth}
                    onChange={(e) => setBooth(e.target.value)}
                    placeholder={labels.unitPlaceholder}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">{labels.handle}</span>
                  <input
                    value={stallHandle}
                    onChange={(e) => setStallHandle(e.target.value)}
                    placeholder={labels.handlePlaceholder}
                    className={field}
                  />
                </label>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink/70">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {STALL_CATEGORIES.map((c) => {
                    const on = stallCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setStallCategory(c.id)}
                        className={cn(
                          "h-9 rounded-full px-3.5 text-xs font-semibold ring-1 transition",
                          on ? "bg-ink text-white ring-ink" : "bg-paper text-mute ring-line hover:text-ink",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">{labels.about}</span>
                <input
                  value={stallWhy}
                  onChange={(e) => setStallWhy(e.target.value)}
                  placeholder="One line guests will read"
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Offer for guests</span>
                <input
                  value={stallOffer}
                  onChange={(e) => setStallOffer(e.target.value)}
                  placeholder="Optional — e.g. 2 for $10"
                  className={field}
                />
              </label>
              <Button type="submit" className="w-full">
                {editingStallId ? "Save changes" : labels.addTitle}
              </Button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white">
                <Upload size={16} />
                Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onCsv(file);
                  }}
                />
              </label>
              <Button
                variant="ghost"
                className="flex-1"
                type="button"
                onClick={() => {
                  const blob = new Blob([stallCsvTemplate(myEvent.flavour)], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `airpal-${myEvent.flavour}-directory.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download template
              </Button>
            </div>
            <p className="text-center text-[12px] text-mute">
              CSV columns: business name, {labels.unit.toLowerCase()}, handle, category, about, offer
            </p>

            {stalls.length === 0 ? (
              <p className="rounded-[22px] bg-card px-4 py-8 text-center text-sm text-mute ring-1 ring-line">
                {labels.empty}
              </p>
            ) : (
              <ul className="space-y-2">
                {stalls.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => editStall(s)}
                      className="w-full rounded-[22px] bg-card px-4 py-3 text-left ring-1 ring-line transition hover:ring-ink/20"
                    >
                      <p className="text-[12px] text-mute">
                        {stallUnitDisplay(myEvent.flavour, s.booth)}
                        {" · "}
                        {STALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                        {s.handle ? ` · @${s.handle}` : ""}
                      </p>
                      <p className="font-medium">{s.name}</p>
                      {s.offer && <p className="text-[13px] text-gold">{s.offer}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
                </>
              );
            })()}
          </div>
        )}

        {tab === "print" && (
          <div className="mt-5 rounded-[28px] bg-card/90 p-6 text-center ring-1 ring-line shadow-sm">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <QrCode size={22} />
            </span>
            <p className="font-display mt-3 text-xl font-semibold">Gate QR</p>
            <p className="mt-1 text-sm text-mute">Print this at the entrance. Guests land on the live directory.</p>
            {qr ? (
              <img src={qr} alt="" className="mx-auto mt-4 h-52 w-52 rounded-2xl bg-white p-2 ring-1 ring-line" />
            ) : (
              <div className="mx-auto mt-4 h-52 w-52 animate-pulse rounded-2xl bg-paper" />
            )}
            <p className="mt-3 text-sm text-mute">{myEvent.gatePath}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={!qr}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qr;
                  a.download = `${myEvent.name.toLowerCase().replace(/\s+/g, "-")}-gate.png`;
                  a.click();
                }}
              >
                <Download size={15} />
                Download PNG
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}${myEvent.gatePath}`).then(
                    () => toast.success("Link copied"),
                    () => toast.error("Couldn’t copy"),
                  );
                }}
              >
                <Copy size={15} />
                Copy link
              </Button>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <form className="mt-5 space-y-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6" onSubmit={onSaveSettings}>
            <div>
              <h2 className="font-display text-lg font-semibold">Event details</h2>
              <p className="text-[13px] text-mute">Saved to the live event record guests already see.</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </label>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink/70">Flavour</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_FLAVOURS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFlavour(id)}
                    className={cn(
                      "h-9 rounded-full px-4 text-sm",
                      flavour === id ? "bg-ink text-white" : "bg-paper ring-1 ring-line text-mute",
                    )}
                  >
                    {EVENT_FLAVOUR_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">City</span>
                <input value={city} list="event-cities-edit" onChange={(e) => setCity(e.target.value)} className={field} />
                <datalist id="event-cities-edit">
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.label} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Venue</span>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} className={field} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Starts</span>
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-ink/70">Ends</span>
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  className={field}
                />
              </label>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink/70">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(["live", "draft", "ended"] as const).map((id) => {
                  const on = status === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatus(id)}
                      className={cn(
                        "rounded-2xl px-3 py-2.5 text-xs font-semibold capitalize ring-1 transition",
                        on ? "bg-ink text-white ring-ink" : "bg-paper text-mute ring-line",
                      )}
                    >
                      {on && <Check size={12} className="mr-1 inline" />}
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Save event"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
