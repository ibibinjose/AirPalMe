import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  AtSign,
  Building2,
  CalendarDays,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  LayoutGrid,
  MapPin,
  Plus,
  QrCode,
  Sparkles,
  Store,
  Upload,
  User,
  Users,
  X,
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
import { bioPath } from "@shared/bio";
import { DEMO_BUSINESS, DEMO_EVENT_ID, isDemoModeSearch } from "@shared/demo-business";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { publicSiteOrigin } from "@/lib/public-origin";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useBio } from "@/contexts/BioContext";
import { makeQrDataUrl } from "@/lib/qr";
import { ratingsForEvent } from "@/lib/ratings";
import { CITY_OPTIONS } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { EventFestivalFields, type FestivalFieldValues } from "@/components/event/EventFestivalFields";
import {
  EventTicketFields,
  ticketValuesToCents,
  validateTickets,
  type TicketFieldValues,
} from "@/components/event/EventTicketFields";
import { StallHandleField } from "@/components/event/StallHandleField";
import { landing, landingItem } from "@/lib/motion";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import { ImageField } from "@/components/media/ImageField";
import { Photo } from "@/components/ui/Photo";
import { mapsPlaceUrl } from "@/lib/maps";

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
  const { user, authReady, isAdmin } = useAuth();
  const { mine, business } = useBio();
  const { myEvent, stallsFor, upsertEvent, importCsv, upsertStall, confirmEventSchedule } = useEvents();
  const demoMode = Boolean(isAdmin) && isDemoModeSearch(useSearch());
  // Demo runs always take the create path — never edit the admin's local draft.
  const viewEvent = demoMode ? null : myEvent;
  const demoPrefilled = useRef(false);
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"today" | "stalls" | "print" | "settings">("today");

  // Event core fields
  const [name, setName] = useState("");
  const [flavour, setFlavour] = useState<EventFlavour>("market");
  const [city, setCity] = useState("Sydney");
  const [venue, setVenue] = useState("");
  const [room, setRoom] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [mapsPlaceId, setMapsPlaceId] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>();
  const [coverImage, setCoverImage] = useState("");
  const [startsLocal, setStartsLocal] = useState(() => toLocalInput(nextSaturdayNine().toISOString()));
  const [endsLocal, setEndsLocal] = useState(() => toLocalInput(sameDayFifteen(nextSaturdayNine()).toISOString()));
  const [status, setStatus] = useState<"draft" | "live" | "ended">("live");

  // Host info state
  const [hostType, setHostType] = useState<"business" | "individual">("business");
  const [hostName, setHostName] = useState("");
  const [hostHandle, setHostHandle] = useState("");

  // Collaborator handles state
  const [collaboratorHandles, setCollaboratorHandles] = useState<string[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState("");

  // Festival program state
  const [festivalFields, setFestivalFields] = useState<FestivalFieldValues>({
    festivalSlug: "",
    track: "",
    registrationUrl: "",
    registrationNote: "",
    speakers: [],
  });

  // Ticket state
  const [ticketFields, setTicketFields] = useState<TicketFieldValues>({ paid: false, price: "25", capacity: "40" });

  // Stall creation & editing form states
  const [stallName, setStallName] = useState("");
  const [booth, setBooth] = useState("");
  const [stallLocation, setStallLocation] = useState("");
  const [stallHandle, setStallHandle] = useState("");
  const [stallOffer, setStallOffer] = useState("");
  const [stallWhy, setStallWhy] = useState("");
  const [stallCategory, setStallCategory] = useState<StallCategoryId>("shops");
  const [editingStallId, setEditingStallId] = useState<string | null>(null);

  const [qr, setQr] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const stalls = viewEvent ? stallsFor(viewEvent.id) : [];
  const feedback = viewEvent ? ratingsForEvent(viewEvent.id) : [];

  useEffect(() => {
    if (!viewEvent) {
      if (demoMode && !demoPrefilled.current) {
        demoPrefilled.current = true;
        setName(DEMO_BUSINESS.eventName);
        setFlavour("event_space");
        setCity(DEMO_BUSINESS.city);
        setVenue(DEMO_BUSINESS.venue);
        setAddress(DEMO_BUSINESS.address);
        setDescription(DEMO_BUSINESS.eventShortWhy);
        setShortWhy(DEMO_BUSINESS.eventShortWhy);
        setGeo({ ...DEMO_BUSINESS.geo });
      }
      if (business?.handle) {
        setHostType("business");
        setHostName(business.name);
        setHostHandle(business.handle);
      } else if (mine?.handle) {
        setHostType("individual");
        setHostName(mine.name);
        setHostHandle(mine.handle);
      }
      return;
    }
    if (!myEvent) return;
    setName(myEvent.name);
    setFlavour(myEvent.flavour);
    setCity(myEvent.city || "Sydney");
    setVenue(myEvent.venue || "");
    setRoom(myEvent.room || "");
    setAddress(myEvent.address || "");
    setDescription(myEvent.description || "");
    setShortWhy(myEvent.shortWhy || "");
    setMapsPlaceId(myEvent.mapsPlaceId || "");
    setGeo(myEvent.geo);
    setCoverImage(myEvent.coverImage || "");
    setHostType(myEvent.hostType || (myEvent.businessHandle ? "business" : "individual"));
    setHostName(myEvent.hostName || myEvent.businessName || "");
    setHostHandle(myEvent.hostHandle || myEvent.businessHandle || "");
    setCollaboratorHandles(myEvent.collaboratorHandles || []);
    setFestivalFields({
      festivalSlug: myEvent.festivalSlug || "",
      track: myEvent.track || "",
      registrationUrl: myEvent.registrationUrl || "",
      registrationNote: myEvent.registrationNote || "",
      speakers: myEvent.speakers || [],
    });
    setStartsLocal(toLocalInput(myEvent.startsAt));
    setEndsLocal(toLocalInput(myEvent.endsAt));
    setStatus(myEvent.status);
    setTicketFields({
      paid: (myEvent.ticketPriceCents || 0) > 0,
      price: String(((myEvent.ticketPriceCents || 2500) / 100).toFixed(2)),
      capacity: String(myEvent.capacity || 40),
    });
    const origin = publicSiteOrigin();
    void makeQrDataUrl(`${origin}${myEvent.gatePath}`).then(setQr);
  }, [viewEvent, business, mine, demoMode]);

  function addCollaborator(handleRaw: string) {
    const clean = handleRaw.trim().replace(/^@+/, "").toLowerCase();
    if (!clean) return;
    if (collaboratorHandles.includes(clean)) {
      toast.error(`@${clean} is already added as a collaborator`);
      return;
    }
    if (clean === hostHandle.trim().replace(/^@+/, "").toLowerCase()) {
      toast.error(`@${clean} is already the primary host`);
      return;
    }
    setCollaboratorHandles((prev) => [...prev, clean]);
    setCollaboratorInput("");
    toast.success(`Added @${clean} to collaborators`);
  }

  function removeCollaborator(handle: string) {
    setCollaboratorHandles((prev) => prev.filter((h) => h !== handle));
  }

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
    const ticketError = validateTickets(ticketFields);
    if (ticketError) {
      toast.error(ticketError);
      return;
    }
    setCreating(true);
    try {
      const cleanHostHandle = hostHandle.trim().replace(/^@+/, "").toLowerCase() || undefined;
      await upsertEvent({
        ...(demoMode ? { id: DEMO_EVENT_ID, demo: true as const } : {}),
        name: trimmed,
        flavour,
        city: city.trim() || "Sydney",
        venue: venue.trim(),
        room: room.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        shortWhy: shortWhy.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        geo,
        coverImage: coverImage.trim() || undefined,
        hostType,
        hostName: hostName.trim() || undefined,
        hostHandle: cleanHostHandle,
        businessName: hostType === "business" ? hostName.trim() || undefined : undefined,
        businessHandle: hostType === "business" ? cleanHostHandle : undefined,
        collaboratorHandles: collaboratorHandles.length > 0 ? collaboratorHandles : undefined,
        startsAt: startsAt || new Date().toISOString(),
        endsAt: endsAt || undefined,
        status,
        ...ticketValuesToCents(ticketFields),
        festivalSlug: festivalFields.festivalSlug.trim(),
        track: festivalFields.track.trim() || undefined,
        registrationUrl: festivalFields.registrationUrl.trim() || undefined,
        registrationNote: festivalFields.registrationNote.trim() || undefined,
        speakers: festivalFields.speakers.length > 0 ? festivalFields.speakers : undefined,
      });
      toast.success("Event created and live — add your stalls/exhibitors next");
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
    setStallLocation("");
    setStallHandle("");
    setStallOffer("");
    setStallWhy("");
    setStallCategory("shops");
  }

  function editStall(s: StallRecord) {
    setEditingStallId(s.id);
    setStallName(s.name);
    setBooth(s.booth || "");
    setStallLocation(s.location || "");
    setStallHandle(s.handle || "");
    setStallOffer(s.offer || "");
    setStallWhy(s.shortWhy || "");
    setStallCategory(s.category);
    setTab("stalls");
  }

  async function onAddStall(e: FormEvent) {
    e.preventDefault();
    if (!myEvent || !stallName.trim()) {
      toast.error("Add a business or stall name");
      return;
    }
    await upsertStall({
      id: editingStallId || undefined,
      eventId: myEvent.id,
      name: stallName.trim(),
      category: stallCategory,
      booth: booth.trim(),
      location: stallLocation.trim() || undefined,
      shortWhy: stallWhy.trim(),
      offer: stallOffer.trim() || undefined,
      handle: stallHandle.trim().replace(/^@+/, "").toLowerCase() || undefined,
    });
    resetStallForm();
    toast.success(editingStallId ? "Stall updated" : "Stall added to directory");
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
    const ticketError = validateTickets(ticketFields);
    if (ticketError) {
      toast.error(ticketError);
      return;
    }
    setSaving(true);
    try {
      const cleanHostHandle = hostHandle.trim().replace(/^@+/, "").toLowerCase() || undefined;
      await upsertEvent({
        id: myEvent.id,
        name: trimmed,
        flavour,
        city: city.trim() || "Sydney",
        venue: venue.trim(),
        room: room.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        shortWhy: shortWhy.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        geo,
        coverImage: coverImage.trim() || undefined,
        hostType,
        hostName: hostName.trim() || undefined,
        hostHandle: cleanHostHandle,
        businessName: hostType === "business" ? hostName.trim() || undefined : undefined,
        businessHandle: hostType === "business" ? cleanHostHandle : undefined,
        collaboratorHandles: collaboratorHandles.length > 0 ? collaboratorHandles : undefined,
        startsAt: startsAt || myEvent.startsAt,
        endsAt: endsAt || myEvent.endsAt,
        status,
        ...ticketValuesToCents(ticketFields),
        festivalSlug: festivalFields.festivalSlug.trim(),
        track: festivalFields.track.trim() || undefined,
        registrationUrl: festivalFields.registrationUrl.trim() || undefined,
        registrationNote: festivalFields.registrationNote.trim() || undefined,
        speakers: festivalFields.speakers.length > 0 ? festivalFields.speakers : [],
      });
      toast.success("Event details and Google place saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save event details");
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
        lede="Sign in or create an account first. Then you can run a market, expo, or festival directory with instant gate QR codes and Google Maps place integration."
      />
    );
  }

  // EVENT CREATION FLOW
  if (!viewEvent) {
    return (
      <div className="relative isolate overflow-hidden min-h-[85vh]">
        <motion.div
          className="relative mx-auto max-w-2xl px-4 py-8 pb-24"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={reduce ? undefined : landing}
        >
          <motion.header variants={landingItem}>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                AirPal Pass · Event Hosting
              </span>
              <span className="text-xs text-mute font-medium">Tickets &amp; Passes</span>
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Create a Market, Expo or Event
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              Pick a format, search Google Place for the venue, and set your schedule. Guests scan the entrance Gate QR
              into a live directory.
            </p>
          </motion.header>

          <motion.form variants={landingItem} className="mt-6 space-y-6" onSubmit={onCreate}>
            {/* Flavour Card Selector */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">1. What kind of event?</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
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
                        "rounded-2xl p-4 text-left ring-1 transition duration-200 active:scale-[0.98]",
                        on
                          ? "bg-brand text-white ring-brand shadow-md"
                          : "bg-paper ring-line hover:ring-brand/30 hover:bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-xl ring-1",
                          on ? "bg-white/15 text-white ring-white/25" : "bg-brand/10 text-accent ring-brand/20",
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="mt-3 block text-sm font-bold">{EVENT_FLAVOUR_LABELS[id]}</span>
                      <span className={cn("mt-1 block text-[11px] leading-snug", on ? "text-white/80" : "text-mute")}>
                        {meta.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info & Media */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">2. Name & Banner</p>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Event Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Rocks Weekend Market or Sydney Design Expo"
                  required
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Tagline / 1-Line Highlight
                </label>
                <input
                  value={shortWhy}
                  maxLength={100}
                  onChange={(e) => setShortWhy(e.target.value)}
                  placeholder="e.g. 80+ artisanal stalls, food trucks, and live music by the harbour"
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Cover Banner Image (Optional)
                </label>
                <ImageField kind="cover" value={coverImage} onChange={(src) => setCoverImage(src || "")} />
              </div>
            </div>

            {/* Google Place & Location Pinning */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">3. Google Place & Venue</p>
                <span className="text-[11px] text-mute flex items-center gap-1">
                  <MapPin size={12} className="text-accent" /> Google Maps Linked
                </span>
              </div>

              {/* Google Place Search Input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Search Venue on Google Maps
                </label>
                <PlaceAddressField
                  value={venue || address}
                  placeholder="Search venue (e.g. Overseas Passenger Terminal, Sydney)"
                  onChange={(val) => {
                    setVenue(val);
                    setAddress(val);
                  }}
                  onPick={(picked: PickedPlace) => {
                    setVenue(picked.label.split(",")[0] || picked.label);
                    setAddress(picked.label);
                    setGeo(picked.geo);
                    if (picked.city) setCity(picked.city);
                    toast.success(`Pinned venue: ${picked.label}`);
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">City</label>
                  <input
                    value={city}
                    list="event-cities"
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Sydney"
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <datalist id="event-cities">
                    {CITY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.label} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Venue Short Label
                  </label>
                  <input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Argyle Precinct"
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Room / Hall / Stage (Optional)
                </label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Boardroom 5+6, Great Hall, Main stage"
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {geo && (
                <div className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2 text-xs text-mute border border-line/70">
                  <span className="flex items-center gap-1.5 text-ink font-medium">
                    <Check size={14} className="text-emerald-600" />
                    GPS Pinned: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                  </span>
                  <a
                    href={mapsPlaceUrl(geo, venue || name)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    View map <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Schedule & Timing */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">4. Date & Times</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    value={startsLocal}
                    onChange={(e) => setStartsLocal(e.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    value={endsLocal}
                    onChange={(e) => setEndsLocal(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>

            {/* Host & Collaborators Section */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">5. Host & Collaborators</p>
                <span className="text-[11px] text-mute flex items-center gap-1">
                  <Users size={12} className="text-accent" /> AirPal Handles
                </span>
              </div>
              <p className="text-xs text-mute leading-relaxed">
                Specify whether this event is run by a business or an individual with their AirPal @handle, plus any
                co-hosts or collaborators.
              </p>

              {/* Host Type Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Organised By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHostType("business")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
                      hostType === "business"
                        ? "bg-brand text-white ring-brand shadow-sm"
                        : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                    )}
                  >
                    <Building2 size={16} />
                    <span>Business / Place</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostType("individual")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
                      hostType === "individual"
                        ? "bg-brand text-white ring-brand shadow-sm"
                        : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                    )}
                  >
                    <User size={16} />
                    <span>Individual Host</span>
                  </button>
                </div>
              </div>

              {/* Host Name & Handle Inputs */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    {hostType === "business" ? "Business / Organiser Name" : "Host Full Name"}
                  </label>
                  <input
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder={hostType === "business" ? "e.g. The Rocks Markets" : "e.g. Sarah Jenkins"}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    AirPal @handle (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
                    <input
                      value={hostHandle}
                      onChange={(e) => setHostHandle(e.target.value.replace(/^@+/, ""))}
                      placeholder={hostType === "business" ? "therocksmarkets" : "sarah"}
                      className="h-12 w-full rounded-2xl border border-line bg-paper pl-8 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>

              {/* Quick autofill buttons from user bios if available */}
              {(business?.handle || mine?.handle) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-mute">Autofill:</span>
                  {business?.handle && (
                    <button
                      type="button"
                      onClick={() => {
                        setHostType("business");
                        setHostName(business.name);
                        setHostHandle(business.handle);
                        toast.success(`Filled business: ${business.name} (@${business.handle})`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
                    >
                      <Building2 size={12} className="text-accent" />
                      <span>Business (@{business.handle})</span>
                    </button>
                  )}
                  {mine?.handle && (
                    <button
                      type="button"
                      onClick={() => {
                        setHostType("individual");
                        setHostName(mine.name);
                        setHostHandle(mine.handle);
                        toast.success(`Filled personal: ${mine.name} (@${mine.handle})`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
                    >
                      <User size={12} className="text-accent" />
                      <span>My Handle (@{mine.handle})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Collaborators & Co-hosts */}
              <div className="pt-3 border-t border-line/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute block">
                    Co-hosts & Collaborators
                  </label>
                  <span className="text-[11px] text-mute">{collaboratorHandles.length} added</span>
                </div>
                <p className="text-[11px] text-mute">
                  Type any AirPal @handle and press Enter or click Add to link co-hosts, sponsors, or partner venues.
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
                    <input
                      value={collaboratorInput}
                      onChange={(e) => setCollaboratorInput(e.target.value.replace(/^@+/, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCollaborator(collaboratorInput);
                        }
                      }}
                      placeholder="collab_handle"
                      className="h-11 w-full rounded-2xl border border-line bg-paper pl-8 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="tonal"
                    size="sm"
                    onClick={() => addCollaborator(collaboratorInput)}
                    disabled={!collaboratorInput.trim()}
                    className="h-11 px-4 gap-1.5 rounded-2xl"
                  >
                    <Plus size={15} />
                    <span>Add</span>
                  </Button>
                </div>

                {/* Collaborator Chips */}
                {collaboratorHandles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {collaboratorHandles.map((handle) => (
                      <div
                        key={handle}
                        className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink border border-line shadow-xs group"
                      >
                        <AtSign size={12} className="text-accent" />
                        <span>{handle}</span>
                        <a
                          href={bioPath(handle)}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview profile"
                          className="text-mute hover:text-accent transition p-0.5"
                        >
                          <ExternalLink size={11} />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(handle)}
                          title="Remove collaborator"
                          className="ml-0.5 rounded-full p-0.5 text-mute hover:bg-rose-100 hover:text-rose-700 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rich Description Option */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">6. Event Description & Story</p>
                <span className="text-[11px] text-mute">{description.length}/1000</span>
              </div>
              <textarea
                value={description}
                maxLength={1000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your market, expo, or gathering. What can attendees expect? Highlight special guests, parking tips, food & drink, entry details…"
                className="w-full rounded-2xl border border-line bg-paper p-3.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus:border-brand placeholder:text-mute/60 resize-none leading-relaxed"
              />
            </div>

            {/* Publish Status */}
            <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">7. Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["live", "Go live now · Public Gate QR active"],
                    ["draft", "Save as draft · Private preview"],
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
                        "rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition text-left",
                        on ? "bg-brand text-white ring-brand shadow-sm" : "bg-paper text-mute ring-line hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <EventFestivalFields values={festivalFields} onChange={setFestivalFields} />

            <EventTicketFields values={ticketFields} onChange={setTicketFields} />

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold shadow-md gap-2"
              disabled={creating}
            >
              <span>
                {creating ? "Creating Event…" : status === "draft" ? "Save Draft" : "Create Event & Open Gate"}
              </span>
              <ArrowRight size={18} />
            </Button>
          </motion.form>
        </motion.div>
      </div>
    );
  }

  // ACTIVE EVENT MANAGEMENT WORKSPACE (unreachable in demo mode: demo always renders create).
  if (!myEvent) return null;
  const whenLabel = [formatWhen(myEvent.startsAt), formatWhen(myEvent.endsAt)].filter(Boolean).join(" → ");

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-[-6rem] h-64 w-64 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-28 h-56 w-56 rounded-full bg-gold/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-4">
        {/* Top Header Card */}
        <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay overflow-hidden relative">
          {myEvent.coverImage && (
            <div className="h-32 -mx-5 -mt-5 mb-4 relative overflow-hidden">
              <Photo src={myEvent.coverImage} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                  {EVENT_FLAVOUR_LABELS[myEvent.flavour]}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                    myEvent.status === "live"
                      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
                      : myEvent.status === "draft"
                        ? "bg-amber-500/10 text-amber-800 ring-amber-500/20"
                        : "bg-paper text-mute ring-line",
                  )}
                >
                  {myEvent.status}
                </span>
                {myEvent.mapsPlaceId && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/20">
                    Google Place
                  </span>
                )}
              </div>
              <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                {myEvent.name}
              </h1>
              {myEvent.shortWhy && <p className="text-xs text-mute mt-0.5">{myEvent.shortWhy}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full border border-line bg-paper text-xs font-semibold shadow-xs hover:bg-card"
                onClick={() => nav(myEvent.gatePath)}
              >
                <ExternalLink size={13} className="text-accent" />
                <span>Guest Directory</span>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mute border-t border-line/60 pt-3">
            {whenLabel && (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <CalendarDays size={14} className="text-accent" />
                {whenLabel}
              </span>
            )}
            {(myEvent.venue || myEvent.city || myEvent.address) && (
              <span className="inline-flex items-center gap-1.5 text-mute">
                <MapPin size={14} className="text-accent" />
                {[myEvent.venue, myEvent.city].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation Pill Bar — sticky so long manage views keep their sections */}
        <div className="sticky top-2 z-20 mt-5 flex rounded-2xl bg-paper p-1.5 ring-1 ring-line shadow-xs">
          {(
            [
              { id: "today", label: "Overview", icon: LayoutGrid, count: undefined },
              { id: "stalls", label: stallFieldLabels(myEvent.flavour).listNoun, icon: Store, count: stalls.length },
              { id: "print", label: "Gate QR", icon: QrCode, count: undefined },
              { id: "settings", label: "Settings & Location", icon: Edit3, count: undefined },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 h-10 rounded-xl text-xs sm:text-sm font-semibold capitalize transition active:scale-95",
                tab === item.id ? "bg-brand text-white shadow-sm" : "text-mute hover:text-ink hover:bg-white/50",
              )}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    tab === item.id ? "bg-white/25 text-white" : "bg-card text-mute ring-1 ring-line",
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW / TODAY */}
        {tab === "today" && (
          <div className="mt-5 space-y-4">
            <HostFreshnessBanner
              kind="events"
              at={myEvent.scheduleVerifiedAt || myEvent.updatedAt}
              onConfirm={async () => {
                await confirmEventSchedule();
                toast.success("Schedule confirmed");
              }}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">Directory Supply</p>
                <p className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink">{stalls.length}</p>
                <p className="text-xs capitalize text-mute mt-0.5">{stallFieldLabels(myEvent.flavour).listNoun} live</p>
              </div>

              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">Guest Feedback</p>
                <p className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink">{feedback.length}</p>
                <p className="text-xs text-mute mt-0.5">Ratings received</p>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Entrance QR</p>
                  <p className="text-xs text-ink font-semibold mt-1 truncate">{myEvent.gatePath}</p>
                </div>
                <Button size="sm" variant="tonal" className="mt-2 text-xs" onClick={() => setTab("print")}>
                  Print Entrance QR
                </Button>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Guestlist</p>
                  <p className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink">
                    {(myEvent as { guestCounts?: { goingHeads?: number } }).guestCounts?.goingHeads ?? "–"}
                  </p>
                  <p className="text-xs text-mute mt-0.5">Going heads, live from the list</p>
                </div>
                <Button
                  size="sm"
                  variant="tonal"
                  className="mt-2 text-xs"
                  onClick={() => nav(`/e/${myEvent.id}/guests`)}
                >
                  Open guestlist
                </Button>
              </div>
            </div>

            {/* Description Preview Card */}
            {myEvent.description && (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <FileText size={14} /> Description & Guest Story
                </p>
                <p className="text-xs sm:text-sm text-ink/85 leading-relaxed whitespace-pre-line">
                  {myEvent.description}
                </p>
              </div>
            )}

            {/* Growth Campaign Banner */}
            <button
              type="button"
              onClick={() => nav("/business/promotions")}
              className="flex w-full items-center justify-between gap-3 rounded-3xl bg-neutral-900 p-5 text-left text-white shadow-md hover:bg-black transition active:scale-[0.99]"
            >
              <div>
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles size={14} /> Need a bigger crowd?
                </span>
                <span className="block text-sm font-semibold mt-1">
                  Fund an Experience Campaign — AirPal drives verified foot traffic.
                </span>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white shrink-0">
                <ArrowRight size={16} />
              </span>
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1 h-11 font-semibold" onClick={() => nav(myEvent.gatePath)}>
                Open Live Guest Directory
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-11 font-semibold border border-line"
                onClick={() => setTab("stalls")}
              >
                {stallFieldLabels(myEvent.flavour).addTitle}
              </Button>
            </div>

            {feedback.length > 0 && (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-mute">Recent Guest Ratings</p>
                <ul className="space-y-2">
                  {feedback.slice(0, 8).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 border border-line/70"
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-xs text-ink">
                          {r.stallName || "Event Entrance"}
                        </span>
                        {r.note && <span className="block truncate text-xs text-mute">{r.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STALLS & EXHIBITORS */}
        {tab === "stalls" && (
          <div className="mt-5 space-y-4">
            {(() => {
              const labels = stallFieldLabels(myEvent.flavour);
              return (
                <>
                  <form className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs" onSubmit={onAddStall}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-bold text-ink">
                          {editingStallId ? "Edit Listing" : labels.addTitle}
                        </h2>
                        <p className="text-xs text-mute">
                          Add makers, food stalls, or exhibitor booths. Displayed in real-time on the guest directory.
                        </p>
                      </div>
                      {editingStallId && (
                        <button
                          type="button"
                          className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-rose-600 border border-line hover:bg-card"
                          onClick={resetStallForm}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                        {labels.business}
                      </label>
                      <input
                        value={stallName}
                        onChange={(e) => setStallName(e.target.value)}
                        placeholder={labels.businessPlaceholder}
                        required
                        className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                          {labels.unit}
                        </label>
                        <input
                          value={booth}
                          onChange={(e) => setBooth(e.target.value)}
                          placeholder={labels.unitPlaceholder}
                          className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      <StallHandleField
                        value={stallHandle}
                        onChange={setStallHandle}
                        onAutofillName={(name) => {
                          if (!stallName.trim()) {
                            setStallName(name);
                            toast.success("Filled stall name from profile");
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                        Floor location (Optional)
                      </label>
                      <input
                        value={stallLocation}
                        onChange={(e) => setStallLocation(e.target.value)}
                        placeholder="e.g. Aisle C · Bay 12, near Gate B"
                        maxLength={120}
                        className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STALL_CATEGORIES.map((c) => {
                          const on = stallCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setStallCategory(c.id)}
                              className={cn(
                                "min-h-[44px] rounded-full px-3 text-xs font-semibold transition active:scale-95",
                                on
                                  ? "bg-brand text-white shadow-xs"
                                  : "bg-paper text-mute border border-line hover:text-ink",
                              )}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                        {labels.about}
                      </label>
                      <input
                        value={stallWhy}
                        onChange={(e) => setStallWhy(e.target.value)}
                        placeholder="One-line summary guests see (e.g. Handmade ceramic cups & vases)"
                        className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                        Exclusive Guest Offer (Optional)
                      </label>
                      <input
                        value={stallOffer}
                        onChange={(e) => setStallOffer(e.target.value)}
                        placeholder="e.g. Free espresso with bag of beans, or 10% off"
                        className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <Button type="submit" className="w-full h-11 font-semibold shadow-xs">
                      {editingStallId ? "Save Stall Changes" : labels.addTitle}
                    </Button>
                  </form>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-900 text-xs sm:text-sm font-semibold text-white hover:bg-black transition shadow-xs">
                      <Upload size={15} />
                      Import CSV Directory
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
                      className="flex-1 h-11 text-xs sm:text-sm font-semibold border border-line bg-card hover:bg-paper"
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
                      <Download size={15} />
                      Download CSV Template
                    </Button>
                  </div>

                  {stalls.length === 0 ? (
                    <div className="rounded-3xl bg-card px-4 py-8 text-center text-xs text-mute border border-dashed border-line">
                      {labels.empty}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {stalls.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => editStall(s)}
                            className="w-full rounded-2xl bg-card px-4 py-3.5 text-left border border-line/80 transition hover:border-brand/40 shadow-xs group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-mute font-medium">
                                {stallUnitDisplay(myEvent.flavour, s.booth)}
                                {" · "}
                                {STALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                                {s.handle ? ` · @${s.handle}` : ""}
                              </span>
                              <span className="text-[11px] font-semibold text-accent group-hover:underline">Edit</span>
                            </div>
                            <p className="font-semibold text-sm text-ink mt-0.5">{s.name}</p>
                            {s.shortWhy && <p className="text-xs text-mute">{s.shortWhy}</p>}
                            {s.offer && <p className="text-xs font-semibold text-accent mt-1">🏷️ {s.offer}</p>}
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

        {/* TAB 3: PRINT GATE QR */}
        {tab === "print" && (
          <div className="mt-5 rounded-3xl bg-card p-6 text-center ring-1 ring-line shadow-clay space-y-4">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
              <QrCode size={26} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Entrance Gate QR Code</h2>
              <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
                Print and display this QR code at your entrance gate, registration desk, or tables. Attendees scan
                directly into your live directory.
              </p>
            </div>

            {qr ? (
              <div className="relative inline-block rounded-3xl bg-white p-4 ring-1 ring-line shadow-md">
                <img src={qr} alt={`QR code for ${myEvent.name}`} className="mx-auto h-52 w-52" />
              </div>
            ) : (
              <div className="mx-auto h-52 w-52 animate-pulse rounded-3xl bg-paper" />
            )}

            <div>
              <p className="font-mono text-xs text-ink font-semibold">
                {publicSiteOrigin()}
                {myEvent.gatePath}
              </p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Button
                variant="primary"
                className="flex-1 h-11 font-semibold gap-1.5 shadow-sm"
                disabled={!qr}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qr;
                  a.download = `${myEvent.name.toLowerCase().replace(/\s+/g, "-")}-gate-qr.png`;
                  a.click();
                }}
              >
                <Download size={15} />
                <span>Download PNG</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-11 font-semibold border border-line bg-paper hover:bg-card gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(`${publicSiteOrigin()}${myEvent.gatePath}`).then(
                    () => toast.success("Gate directory link copied"),
                    () => toast.error("Couldn’t copy link"),
                  );
                }}
              >
                <Copy size={15} />
                <span>Copy Link</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS, LOCATION & DESCRIPTION */}
        {tab === "settings" && (
          <form
            className="mt-5 space-y-5 rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay"
            onSubmit={onSaveSettings}
          >
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Event Details, Google Place & Description</h2>
              <p className="text-xs text-mute mt-0.5">
                Update venue pinning, description story, schedule, banner, and publishing status.
              </p>
            </div>

            {/* Event Name & Short Tagline */}
            <div className="space-y-4 pt-2 border-t border-line/60">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Event Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Tagline / 1-Line Highlight
                </label>
                <input
                  value={shortWhy}
                  maxLength={100}
                  onChange={(e) => setShortWhy(e.target.value)}
                  placeholder="e.g. 80+ artisanal stalls, food trucks, and live music by the harbour"
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Cover Banner Image
                </label>
                <ImageField kind="cover" value={coverImage} onChange={(src) => setCoverImage(src || "")} />
              </div>
            </div>

            {/* Flavour Format */}
            <div className="pt-2 border-t border-line/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">Event Format</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_FLAVOURS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFlavour(id)}
                    className={cn(
                      "min-h-[44px] rounded-full px-4 text-xs font-semibold transition active:scale-95",
                      flavour === id
                        ? "bg-brand text-white shadow-xs"
                        : "bg-paper text-mute border border-line hover:text-ink",
                    )}
                  >
                    {EVENT_FLAVOUR_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            {/* Google Place & Location Search */}
            <div className="space-y-4 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Google Place & Venue Pinning</p>
                <span className="text-[11px] text-mute flex items-center gap-1">
                  <MapPin size={12} className="text-accent" /> Verified Location
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Search Venue on Google Maps
                </label>
                <PlaceAddressField
                  value={venue || address}
                  placeholder="Search venue (e.g. The Rocks, Sydney)"
                  onChange={(val) => {
                    setVenue(val);
                    setAddress(val);
                  }}
                  onPick={(picked: PickedPlace) => {
                    setVenue(picked.label.split(",")[0] || picked.label);
                    setAddress(picked.label);
                    setGeo(picked.geo);
                    if (picked.city) setCity(picked.city);
                    toast.success(`Pinned venue: ${picked.label}`);
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">City</label>
                  <input
                    value={city}
                    list="event-cities-edit"
                    onChange={(e) => setCity(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <datalist id="event-cities-edit">
                    {CITY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.label} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Venue Name / Precinct
                  </label>
                  <input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Room / Hall / Stage (Optional)
                </label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Boardroom 5+6, Great Hall, Main stage"
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {geo && (
                <div className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2 text-xs text-mute border border-line/70">
                  <span className="flex items-center gap-1.5 text-ink font-medium">
                    <Check size={14} className="text-emerald-600" />
                    GPS Pinned: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                  </span>
                  <a
                    href={mapsPlaceUrl(geo, venue || name)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Directions map <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Host & Collaborators Section */}
            <div className="space-y-4 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Host & Collaborators</p>
                <span className="text-[11px] text-mute flex items-center gap-1">
                  <Users size={12} className="text-accent" /> AirPal Handles
                </span>
              </div>
              <p className="text-xs text-mute leading-relaxed">
                Specify whether this event is run by a business or an individual with their AirPal @handle, plus any
                co-hosts or collaborators.
              </p>

              {/* Host Type Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Organised By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHostType("business")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
                      hostType === "business"
                        ? "bg-brand text-white ring-brand shadow-sm"
                        : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                    )}
                  >
                    <Building2 size={16} />
                    <span>Business / Place</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostType("individual")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
                      hostType === "individual"
                        ? "bg-brand text-white ring-brand shadow-sm"
                        : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                    )}
                  >
                    <User size={16} />
                    <span>Individual Host</span>
                  </button>
                </div>
              </div>

              {/* Host Name & Handle Inputs */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    {hostType === "business" ? "Business / Organiser Name" : "Host Full Name"}
                  </label>
                  <input
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder={hostType === "business" ? "e.g. The Rocks Markets" : "e.g. Sarah Jenkins"}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    AirPal @handle (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
                    <input
                      value={hostHandle}
                      onChange={(e) => setHostHandle(e.target.value.replace(/^@+/, ""))}
                      placeholder={hostType === "business" ? "therocksmarkets" : "sarah"}
                      className="h-12 w-full rounded-2xl border border-line bg-paper pl-8 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>

              {/* Quick autofill buttons from user bios if available */}
              {(business?.handle || mine?.handle) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-mute">Autofill:</span>
                  {business?.handle && (
                    <button
                      type="button"
                      onClick={() => {
                        setHostType("business");
                        setHostName(business.name);
                        setHostHandle(business.handle);
                        toast.success(`Filled business: ${business.name} (@${business.handle})`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
                    >
                      <Building2 size={12} className="text-accent" />
                      <span>Business (@{business.handle})</span>
                    </button>
                  )}
                  {mine?.handle && (
                    <button
                      type="button"
                      onClick={() => {
                        setHostType("individual");
                        setHostName(mine.name);
                        setHostHandle(mine.handle);
                        toast.success(`Filled personal: ${mine.name} (@${mine.handle})`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
                    >
                      <User size={12} className="text-accent" />
                      <span>My Handle (@{mine.handle})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Collaborators & Co-hosts */}
              <div className="pt-3 border-t border-line/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute block">
                    Co-hosts & Collaborators
                  </label>
                  <span className="text-[11px] text-mute">{collaboratorHandles.length} added</span>
                </div>
                <p className="text-[11px] text-mute">
                  Type any AirPal @handle and press Enter or click Add to link co-hosts, sponsors, or partner venues.
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
                    <input
                      value={collaboratorInput}
                      onChange={(e) => setCollaboratorInput(e.target.value.replace(/^@+/, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCollaborator(collaboratorInput);
                        }
                      }}
                      placeholder="collab_handle"
                      className="h-11 w-full rounded-2xl border border-line bg-paper pl-8 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="tonal"
                    size="sm"
                    onClick={() => addCollaborator(collaboratorInput)}
                    disabled={!collaboratorInput.trim()}
                    className="h-11 px-4 gap-1.5 rounded-2xl"
                  >
                    <Plus size={15} />
                    <span>Add</span>
                  </Button>
                </div>

                {/* Collaborator Chips */}
                {collaboratorHandles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {collaboratorHandles.map((handle) => (
                      <div
                        key={handle}
                        className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink border border-line shadow-xs group"
                      >
                        <AtSign size={12} className="text-accent" />
                        <span>{handle}</span>
                        <a
                          href={bioPath(handle)}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview profile"
                          className="text-mute hover:text-accent transition p-0.5"
                        >
                          <ExternalLink size={11} />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(handle)}
                          title="Remove collaborator"
                          className="ml-0.5 rounded-full p-0.5 text-mute hover:bg-rose-100 hover:text-rose-700 transition"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rich Description & Story Option */}
            <div className="space-y-3 pt-2 border-t border-line/60">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Event Description & Details</p>
                <span className="text-[11px] text-mute">{description.length}/1000</span>
              </div>
              <textarea
                value={description}
                maxLength={1000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed event information for attendees: what to see, parking & public transport directions, timetable, food options, special exhibitors…"
                className="w-full rounded-2xl border border-line bg-paper p-3.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus:border-brand placeholder:text-mute/60 resize-none leading-relaxed"
              />
            </div>

            {/* Dates & Schedule */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-line/60">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                  Starts At
                </label>
                <input
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Ends At</label>
                <input
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Status */}
            <div className="pt-2 border-t border-line/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">Publishing Status</p>
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
                        on ? "bg-brand text-white ring-brand shadow-xs" : "bg-paper text-mute ring-line hover:text-ink",
                      )}
                    >
                      {on && <Check size={12} className="mr-1 inline" />}
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>

            <EventFestivalFields values={festivalFields} onChange={setFestivalFields} />

            <EventTicketFields values={ticketFields} onChange={setTicketFields} />

            <Button type="submit" className="w-full h-12 text-base font-semibold shadow-md" disabled={saving}>
              {saving ? "Saving Changes…" : "Save All Event Details"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
