import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { clearPendingIntent, peekPendingIntent } from "@/lib/pending-intent";
import {
  eventGatePath,
  parseStallCsv,
  type AttendanceStatus,
  type CalendarEvent,
  type EventRecord,
  type SavedEvent,
  type SavedStall,
  type StallCategoryId,
  type StallRecord,
  type UserEventState,
} from "@shared/event";
import { computeRescheduledTimes, formatEventTimeRange } from "@/lib/calendar-utils";
import { docToCalendarBase, docToEventRecord, recordToCalendarBase, toNearbyEvent } from "@/lib/remote-events";
import type { NearbyEvent } from "@shared/nearby";
import { downloadMultipleIcs } from "@/lib/calendar-export";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  liveBackendEnabled,
  saveAttendeeStallRemote,
  upsertEventRemote,
  upsertEventStallRemote,
} from "@/lib/functions";
import { track } from "@/lib/analytics";
import { useOptionalSync } from "@/contexts/SyncContext";
import { stampContentMeta } from "@shared/content-meta";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadEvents,
  loadSavedEvents,
  loadSavedStalls,
  loadStalls,
  loadUserEventStates,
  persistEvents,
  persistSavedEvents,
  persistSavedStalls,
  persistStalls,
  persistUserEventStates,
} from "@/lib/events-store";

type EventsValue = {
  events: EventRecord[];
  stalls: StallRecord[];
  savedEvents: SavedEvent[];
  savedStalls: SavedStall[];
  myEvent: EventRecord | null;
  calendarEvents: CalendarEvent[];
  userStates: Record<string, UserEventState>;
  stallsFor: (eventId: string) => StallRecord[];
  getEvent: (id: string) => EventRecord | undefined;
  /** Public curated/organiser events read from Firestore (`events`). Empty when offline/empty. */
  remoteNearby: NearbyEvent[];
  remoteLoaded: boolean;
  refresh: () => void;
  fetchRemoteStalls: (eventId: string) => Promise<void>;
  upsertEvent: (input: Partial<EventRecord> & Pick<EventRecord, "name" | "flavour">) => Promise<EventRecord>;
  confirmEventSchedule: () => Promise<void>;
  importCsv: (eventId: string, csv: string) => Promise<number>;
  upsertStall: (stall: Omit<StallRecord, "id" | "status"> & { id?: string }) => Promise<StallRecord>;
  saveStall: (stall: StallRecord, event: EventRecord) => Promise<void>;
  unsaveStall: (stallId: string) => Promise<void>;
  isSaved: (stallId: string) => boolean;
  /**
   * Guest-gated toggles. Return true when the action was applied, false when
   * the guest was asked to sign in instead (pending intent resumes on login).
   */
  toggleGoing: (eventId: string) => boolean;
  toggleInterested: (eventId: string) => boolean;
  toggleLiked: (eventId: string) => boolean;
  setEventStatus: (eventId: string, status: AttendanceStatus | null) => Promise<void>;
  rescheduleEvent: (eventId: string, newDateStr: string) => Promise<boolean>;
  resetEventSchedule: (eventId: string) => Promise<void>;
  exportItinerary: (filter?: "going" | "interested" | "all-saved") => boolean;
};

const EventsContext = createContext<EventsValue | undefined>(undefined);

function uidNow() {
  return getFirebaseAuth()?.currentUser?.uid;
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const { user, requireUser } = useAuth();
  const sync = useOptionalSync();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stalls, setStalls] = useState<StallRecord[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [savedStalls, setSavedStalls] = useState<SavedStall[]>([]);
  const [userStates, setUserStates] = useState<Record<string, UserEventState>>({});
  type RemoteBase = Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked">;
  const [remoteBases, setRemoteBases] = useState<RemoteBase[]>([]);
  const [remoteNearby, setRemoteNearby] = useState<NearbyEvent[]>([]);
  const [remoteRecords, setRemoteRecords] = useState<EventRecord[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const stallsFetchedRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setEvents(loadEvents());
    setStalls(loadStalls());
    setSavedEvents(loadSavedEvents());
    setSavedStalls(loadSavedStalls());
    setUserStates(loadUserEventStates());
  }, []);

  useEffect(() => {
    refresh();
    const handleReload = () => {
      refresh();
    };
    window.addEventListener("airpal:reload-data", handleReload);
    return () => {
      window.removeEventListener("airpal:reload-data", handleReload);
    };
  }, [refresh]);

  useEffect(() => {
    const db = getFirebaseDb();
    const uid = user?.uid || uidNow();
    if (!db || !uid) return;
    void Promise.all([
      getDocs(collection(db, "users", uid, "savedEvents")),
      getDocs(collection(db, "users", uid, "savedStalls")),
      getDocs(collection(db, "users", uid, "calendar")),
    ])
      .then(([ev, st, cal]) => {
        const eventsBy = new Map(loadSavedEvents().map((row) => [row.eventId, row]));
        const stallsBy = new Map(loadSavedStalls().map((row) => [row.stallId, row]));
        const statesBy = { ...loadUserEventStates() };
        for (const row of ev.docs) eventsBy.set(row.id, row.data() as SavedEvent);
        for (const row of st.docs) stallsBy.set(row.id, row.data() as SavedStall);
        for (const row of cal.docs) statesBy[row.id] = row.data() as UserEventState;
        persistSavedEvents(Array.from(eventsBy.values()));
        persistSavedStalls(Array.from(stallsBy.values()));
        persistUserEventStates(statesBy);
        setSavedEvents(loadSavedEvents());
        setSavedStalls(loadSavedStalls());
        setUserStates(statesBy);
      })
      .catch(() => undefined);
  }, [user]);

  const myEvent = useMemo(() => {
    if (!user) return null;
    return events.find((e) => e.organiserUid === user.uid || e.organiserEmail === user.email) || null;
  }, [events, user]);

  // Public events + curated NearbyEvents from Firestore. Empty when the
  // collection is empty or unreachable — no bundled seed fallback.
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setRemoteLoaded(true);
      return;
    }
    let alive = true;
    void getDocs(collection(db, "events"))
      .then((snap) => {
        if (!alive) return;
        const bases: RemoteBase[] = [];
        const nearby: NearbyEvent[] = [];
        const records: EventRecord[] = [];
        for (const row of snap.docs) {
          const data = row.data() as Record<string, unknown>;
          const rec = docToEventRecord(data, row.id);
          if (rec) {
            records.push(rec);
            const base = docToCalendarBase(data, row.id);
            if (base) bases.push(base);
            continue;
          }
          const base = docToCalendarBase(data, row.id);
          if (base) {
            bases.push(base);
            continue;
          }
          const ne = toNearbyEvent(data, row.id);
          if (ne) nearby.push(ne);
        }
        setRemoteBases(bases);
        setRemoteNearby(nearby);
        setRemoteRecords(records);
        setRemoteLoaded(true);
      })
      .catch(() => {
        if (alive) setRemoteLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const fetchRemoteStalls = useCallback(async (eventId: string) => {
    if (!eventId || stallsFetchedRef.current.has(eventId)) return;
    stallsFetchedRef.current.add(eventId);
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, "events", eventId, "stalls"));
      if (snap.empty) return;
      const rows = snap.docs
        .map((row) => ({ id: row.id, eventId, status: "active" as const, ...(row.data() as Record<string, unknown>) }))
        .filter((s) => typeof (s as StallRecord).name === "string" && (s as StallRecord).name.trim());
      if (!rows.length) return;
      const merged = new Map(loadStalls().map((s) => [s.id, s]));
      for (const s of rows as StallRecord[]) merged.set(s.id, s);
      const next = Array.from(merged.values());
      persistStalls(next);
      setStalls(next);
    } catch {
      /* offline — local stalls stand */
    }
  }, []);

  const stallsFor = useCallback(
    (eventId: string) => stalls.filter((s) => s.eventId === eventId && s.status === "active"),
    [stalls],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const overlay = (base: Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked">): CalendarEvent => {
      const state = userStates[base.id];
      const isSaved = savedEvents.some((se) => se.eventId === base.id);
      const isRescheduled = Boolean(state?.rescheduledDate && state.rescheduledDate !== base.date);
      const date = state?.rescheduledDate || base.date;
      const startsAt = state?.rescheduledStartsAt || base.startsAt;
      const endsAt = state?.rescheduledEndsAt || base.endsAt;
      const timeLabel = isRescheduled ? formatEventTimeRange(startsAt, endsAt) || base.timeLabel : base.timeLabel;
      return {
        ...base,
        date,
        startsAt,
        endsAt,
        timeLabel,
        isRescheduled,
        originalDate: base.date,
        isGoing: state?.status === "going",
        isInterested: state?.status === "interested" || (!state?.status && isSaved),
        isLiked: Boolean(state?.liked),
      };
    };

    // Firestore `events` docs first (curated + organiser-published), then
    // device-local organiser drafts. Empty DB → empty calendar, honestly.
    const remote = remoteBases.map(overlay);
    const custom = events
      .filter((e) => !remote.some((l) => l.id === e.id))
      .map((e) => overlay(recordToCalendarBase(e)));

    return [...remote, ...custom].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [events, remoteBases, savedEvents, userStates]);

  const setEventStatus = useCallback(
    async (eventId: string, status: AttendanceStatus | null) => {
      const now = new Date().toISOString();
      const current = userStates[eventId] || { eventId, updatedAt: now };
      const updated: UserEventState = {
        ...current,
        status,
        updatedAt: now,
      };
      const nextStates = { ...userStates, [eventId]: updated };
      setUserStates(nextStates);
      persistUserEventStates(nextStates);

      const targetEv = calendarEvents.find((e) => e.id === eventId);
      if (targetEv) {
        if (status === "going" || status === "interested") {
          const evSave: SavedEvent = {
            eventId,
            name: targetEv.title,
            flavour: targetEv.category === "market" ? "market" : targetEv.category === "expo" ? "expo" : "event_space",
            savedAt: now,
          };
          const nextSaved = [evSave, ...loadSavedEvents().filter((e) => e.eventId !== eventId)];
          persistSavedEvents(nextSaved);
          setSavedEvents(nextSaved);
        } else if (status === null && !current.liked) {
          const nextSaved = loadSavedEvents().filter((e) => e.eventId !== eventId);
          persistSavedEvents(nextSaved);
          setSavedEvents(nextSaved);
        }
      }

      void track("event_save", { eventId, contextId: eventId, action: status || "none" });

      const uid = uidNow();
      const db = getFirebaseDb();
      if (db && uid) {
        try {
          await setDoc(doc(db, "users", uid, "calendar", eventId), updated, { merge: true });
        } catch {
          /* ignore */
        }
      }
    },
    [calendarEvents, userStates],
  );

  const toggleGoing = useCallback(
    (eventId: string) => {
      if (!requireUser("Sign in to mark yourself Going.", { kind: "going-event", id: eventId })) return false;
      const current = userStates[eventId]?.status;
      void setEventStatus(eventId, current === "going" ? null : "going");
      return true;
    },
    [setEventStatus, userStates, requireUser],
  );

  const toggleInterested = useCallback(
    (eventId: string) => {
      if (!requireUser("Sign in to save events.", { kind: "interested-event", id: eventId })) return false;
      const current = userStates[eventId]?.status;
      void setEventStatus(eventId, current === "interested" ? null : "interested");
      return true;
    },
    [setEventStatus, userStates, requireUser],
  );

  const setLiked = useCallback(
    async (eventId: string, liked: boolean) => {
      const now = new Date().toISOString();
      const current = userStates[eventId] || { eventId, updatedAt: now };
      if (current.liked === liked) return;
      const updated: UserEventState = {
        ...current,
        liked,
        updatedAt: now,
      };
      const nextStates = { ...userStates, [eventId]: updated };
      setUserStates(nextStates);
      persistUserEventStates(nextStates);

      void track("event_save", { eventId, contextId: eventId, action: liked ? "like" : "unlike" });

      const uid = uidNow();
      const db = getFirebaseDb();
      if (db && uid) {
        try {
          await setDoc(doc(db, "users", uid, "calendar", eventId), updated, { merge: true });
        } catch {
          /* ignore */
        }
      }
    },
    [userStates],
  );

  const toggleLiked = useCallback(
    (eventId: string) => {
      if (!requireUser("Sign in to like events.", { kind: "like-event", id: eventId })) return false;
      const nextLiked = !userStates[eventId]?.liked;
      void setLiked(eventId, nextLiked);
      return true;
    },
    [setLiked, userStates, requireUser],
  );

  const rescheduleEvent = useCallback(
    async (eventId: string, newDateStr: string) => {
      const targetEv = calendarEvents.find((e) => e.id === eventId);
      if (!targetEv || targetEv.date === newDateStr) return false;

      const { startsAt: newStartsAt, endsAt: newEndsAt } = computeRescheduledTimes(
        targetEv.startsAt,
        targetEv.endsAt,
        newDateStr,
      );

      const now = new Date().toISOString();
      const current = userStates[eventId] || { eventId, updatedAt: now };
      const updated: UserEventState = {
        ...current,
        rescheduledDate: newDateStr,
        rescheduledStartsAt: newStartsAt,
        rescheduledEndsAt: newEndsAt,
        updatedAt: now,
      };

      const nextStates = { ...userStates, [eventId]: updated };
      setUserStates(nextStates);
      persistUserEventStates(nextStates);

      void track("calendar_event_reschedule", {
        eventId,
        fromDate: targetEv.date,
        toDate: newDateStr,
        action: "reschedule",
      });

      const uid = uidNow();
      const db = getFirebaseDb();
      if (db && uid) {
        try {
          await setDoc(doc(db, "users", uid, "calendar", eventId), updated, { merge: true });
        } catch {
          /* ignore */
        }
      }

      return true;
    },
    [calendarEvents, userStates],
  );

  const resetEventSchedule = useCallback(
    async (eventId: string) => {
      const targetEv = calendarEvents.find((e) => e.id === eventId);
      if (!targetEv) return;

      const now = new Date().toISOString();
      const current = userStates[eventId];
      if (!current || !current.rescheduledDate) return;

      const updated: UserEventState = {
        ...current,
        rescheduledDate: undefined,
        rescheduledStartsAt: undefined,
        rescheduledEndsAt: undefined,
        updatedAt: now,
      };

      const nextStates = { ...userStates, [eventId]: updated };
      setUserStates(nextStates);
      persistUserEventStates(nextStates);

      void track("calendar_event_reschedule", {
        eventId,
        fromDate: targetEv.date,
        toDate: targetEv.originalDate || targetEv.date,
        action: "reset",
      });

      const uid = uidNow();
      const db = getFirebaseDb();
      if (db && uid) {
        try {
          await setDoc(doc(db, "users", uid, "calendar", eventId), updated, { merge: true });
        } catch {
          /* ignore */
        }
      }
    },
    [calendarEvents, userStates],
  );

  // Resume the guest's pending event intent once they finish signing in.
  useEffect(() => {
    if (!user) return;
    const intent = peekPendingIntent();
    if (!intent) return;
    if (intent.kind === "going-event") {
      clearPendingIntent();
      void setEventStatus(intent.id, "going");
      toast.success("Saved — you're marked Going.");
    } else if (intent.kind === "interested-event") {
      clearPendingIntent();
      void setEventStatus(intent.id, "interested");
      toast.success("Saved to your Interested events.");
    } else if (intent.kind === "like-event") {
      clearPendingIntent();
      void setLiked(intent.id, true);
      toast.success("Liked — added to your list.");
    }
  }, [user, setEventStatus, setLiked]);

  const value = useMemo<EventsValue>(
    () => ({
      events,
      stalls,
      savedEvents,
      savedStalls,
      myEvent,
      calendarEvents,
      remoteNearby,
      remoteLoaded,
      refresh,
      fetchRemoteStalls,
      userStates,
      stallsFor,
      getEvent: (id) => events.find((e) => e.id === id) || remoteRecords.find((e) => e.id === id),
      isSaved: (stallId) => savedStalls.some((s) => s.stallId === stallId),
      toggleGoing,
      toggleInterested,
      toggleLiked,
      setEventStatus,
      async upsertEvent(input) {
        const keepId = input.id || myEvent?.id;
        const id = keepId || `evt-${nanoid(8)}`;
        const record: EventRecord = {
          id,
          name: input.name.trim(),
          flavour: input.flavour,
          city: (input.city || myEvent?.city || "Sydney").trim(),
          venue: (input.venue || myEvent?.venue)?.trim(),
          room: (input.room || myEvent?.room)?.trim() || undefined,
          ticketPriceCents: input.ticketPriceCents ?? myEvent?.ticketPriceCents,
          capacity: input.capacity ?? myEvent?.capacity,
          address: input.address !== undefined ? input.address : myEvent?.address,
          description: input.description !== undefined ? input.description : myEvent?.description,
          shortWhy: input.shortWhy !== undefined ? input.shortWhy : myEvent?.shortWhy,
          mapsPlaceId: input.mapsPlaceId !== undefined ? input.mapsPlaceId : myEvent?.mapsPlaceId,
          geo: input.geo !== undefined ? input.geo : myEvent?.geo,
          coverImage: input.coverImage !== undefined ? input.coverImage : myEvent?.coverImage,
          hostName: input.hostName !== undefined ? input.hostName : myEvent?.hostName,
          hostHandle: input.hostHandle !== undefined ? input.hostHandle : myEvent?.hostHandle,
          hostType: input.hostType !== undefined ? input.hostType : myEvent?.hostType,
          businessName: input.businessName !== undefined ? input.businessName : myEvent?.businessName,
          businessHandle: input.businessHandle !== undefined ? input.businessHandle : myEvent?.businessHandle,
          collaboratorHandles:
            input.collaboratorHandles !== undefined ? input.collaboratorHandles : myEvent?.collaboratorHandles,
          startsAt: input.startsAt || myEvent?.startsAt || new Date().toISOString(),
          endsAt: input.endsAt || myEvent?.endsAt || new Date(Date.now() + 2 * 86400000).toISOString(),
          status: input.status || myEvent?.status || "live",
          festivalSlug: input.festivalSlug !== undefined ? input.festivalSlug || undefined : myEvent?.festivalSlug,
          track: input.track !== undefined ? input.track || undefined : myEvent?.track,
          registrationUrl:
            input.registrationUrl !== undefined ? input.registrationUrl || undefined : myEvent?.registrationUrl,
          registrationNote:
            input.registrationNote !== undefined ? input.registrationNote || undefined : myEvent?.registrationNote,
          speakers: input.speakers !== undefined ? input.speakers : myEvent?.speakers,
          gatePath: eventGatePath(id),
          organiserUid: uidNow() || user?.uid || myEvent?.organiserUid,
          organiserEmail: getFirebaseAuth()?.currentUser?.email || user?.email || myEvent?.organiserEmail,
          categoryChips: input.categoryChips || myEvent?.categoryChips || ["eat", "coffee", "shops"],
          stallCount: stallsFor(id).length,
          scheduleVerifiedAt: new Date().toISOString(),
        };
        const meta = stampContentMeta(record, {
          ownerUid: record.organiserUid,
          ownerEmail: record.organiserEmail,
          source: "organiser",
          verifiedOwner: Boolean(record.organiserUid),
        });
        const stamped = { ...record, ...meta };
        persistEvents([stamped, ...loadEvents().filter((e) => e.id !== id)]);
        refresh();
        if (!keepId) {
          void track("host_activation", {
            tenantId: stamped.organiserUid || "local",
            activationStep: "event_created",
            contextId: stamped.id,
            actorRole: "organiser",
          });
        }
        await sync?.runJob({
          id: `event-${stamped.id}`,
          label: "Event",
          remote:
            liveBackendEnabled() && uidNow()
              ? () =>
                  upsertEventRemote({
                    eventId: stamped.id,
                    name: stamped.name,
                    flavour: stamped.flavour,
                    city: stamped.city,
                    venue: stamped.venue,
                    room: stamped.room,
                    address: stamped.address,
                    description: stamped.description,
                    shortWhy: stamped.shortWhy,
                    mapsPlaceId: stamped.mapsPlaceId,
                    geo: stamped.geo,
                    coverImage: stamped.coverImage,
                    hostName: stamped.hostName,
                    hostHandle: stamped.hostHandle,
                    hostType: stamped.hostType,
                    businessName: stamped.businessName,
                    businessHandle: stamped.businessHandle,
                    collaboratorHandles: stamped.collaboratorHandles,
                    startsAt: stamped.startsAt,
                    endsAt: stamped.endsAt,
                    status: stamped.status,
                    categoryChips: stamped.categoryChips,
                    ticketPriceCents: stamped.ticketPriceCents,
                    capacity: stamped.capacity,
                    festivalSlug: stamped.festivalSlug || "",
                    track: stamped.track,
                    registrationUrl: stamped.registrationUrl,
                    registrationNote: stamped.registrationNote,
                    speakers: stamped.speakers,
                  })
              : undefined,
        });
        return stamped;
      },
      async confirmEventSchedule() {
        if (!myEvent) return;
        const stamped = {
          ...myEvent,
          scheduleVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        persistEvents([stamped, ...loadEvents().filter((e) => e.id !== stamped.id)]);
        refresh();
        void track("host_activation", {
          tenantId: stamped.organiserUid || "local",
          activationStep: "schedule_verified",
          contextId: stamped.id,
        });
        await sync?.runJob({
          id: `event-schedule-${stamped.id}`,
          label: "Schedule",
          remote:
            liveBackendEnabled() && uidNow()
              ? () =>
                  upsertEventRemote({
                    eventId: stamped.id,
                    name: stamped.name,
                    flavour: stamped.flavour,
                    city: stamped.city,
                    venue: stamped.venue,
                    room: stamped.room,
                    address: stamped.address,
                    description: stamped.description,
                    shortWhy: stamped.shortWhy,
                    mapsPlaceId: stamped.mapsPlaceId,
                    geo: stamped.geo,
                    coverImage: stamped.coverImage,
                    hostName: stamped.hostName,
                    hostHandle: stamped.hostHandle,
                    hostType: stamped.hostType,
                    businessName: stamped.businessName,
                    businessHandle: stamped.businessHandle,
                    collaboratorHandles: stamped.collaboratorHandles,
                    startsAt: stamped.startsAt,
                    endsAt: stamped.endsAt,
                    status: stamped.status,
                    categoryChips: stamped.categoryChips,
                    ticketPriceCents: stamped.ticketPriceCents,
                    capacity: stamped.capacity,
                    festivalSlug: stamped.festivalSlug || "",
                    track: stamped.track,
                    registrationUrl: stamped.registrationUrl,
                    registrationNote: stamped.registrationNote,
                    speakers: stamped.speakers,
                  })
              : undefined,
        });
      },
      async importCsv(eventId, csv) {
        const parsed = parseStallCsv(csv);
        const added: StallRecord[] = parsed.map((row) => ({
          id: `st-${nanoid(6)}`,
          eventId,
          name: row.name,
          category: row.category as StallCategoryId,
          booth: row.booth,
          location: row.location,
          shortWhy: row.shortWhy,
          offer: row.offer,
          handle: row.handle,
          status: "active",
        }));
        persistStalls([...added, ...loadStalls().filter((s) => s.eventId !== eventId)]);
        persistEvents(loadEvents().map((e) => (e.id === eventId ? { ...e, stallCount: added.length } : e)));
        refresh();
        if (liveBackendEnabled() && uidNow()) {
          for (const stall of added) await upsertEventStallRemote(stall);
        }
        return added.length;
      },
      async upsertStall(input) {
        const id = input.id || `st-${nanoid(6)}`;
        const stall: StallRecord = { ...input, id, status: "active" };
        persistStalls([stall, ...loadStalls().filter((s) => s.id !== id)]);
        refresh();
        if (liveBackendEnabled() && uidNow()) await upsertEventStallRemote(stall);
        return stall;
      },
      async saveStall(stall, event) {
        const now = new Date().toISOString();
        const stallSave: SavedStall = {
          stallId: stall.id,
          eventId: stall.eventId,
          name: stall.name,
          category: stall.category,
          booth: stall.booth,
          location: stall.location,
          offer: stall.offer,
          handle: stall.handle,
          savedAt: now,
        };
        const eventSave: SavedEvent = {
          eventId: event.id,
          name: event.name,
          flavour: event.flavour,
          savedAt: now,
        };
        persistSavedStalls([stallSave, ...loadSavedStalls().filter((s) => s.stallId !== stall.id)]);
        persistSavedEvents([eventSave, ...loadSavedEvents().filter((e) => e.eventId !== event.id)]);
        refresh();
        void track("event_save", { eventId: event.id, contextId: event.id, stallId: stall.id });
        const uid = uidNow();
        const db = getFirebaseDb();
        await sync?.runJob({
          id: `save-stall-${stall.id}`,
          label: "Saved stall",
          remote:
            liveBackendEnabled() && uid
              ? async () => {
                  await saveAttendeeStallRemote({ eventId: event.id, stallId: stall.id });
                  if (db) {
                    await setDoc(doc(db, "users", uid, "savedStalls", stall.id), stallSave, { merge: true });
                    await setDoc(doc(db, "users", uid, "savedEvents", event.id), eventSave, { merge: true });
                  }
                }
              : undefined,
        });
      },
      async unsaveStall(stallId) {
        persistSavedStalls(loadSavedStalls().filter((s) => s.stallId !== stallId));
        refresh();
      },
      rescheduleEvent,
      resetEventSchedule,
      exportItinerary(filterMode = "all-saved") {
        let targets = calendarEvents.filter((e) => e.isGoing || e.isInterested);
        if (filterMode === "going") targets = calendarEvents.filter((e) => e.isGoing);
        if (filterMode === "interested") targets = calendarEvents.filter((e) => e.isInterested);

        if (!targets.length) {
          toast.info("No saved events to export yet. Mark events as Going or Interested first!");
          return false;
        }

        downloadMultipleIcs(targets, `airpal-sydney-itinerary-${Date.now().toString().slice(-4)}.ics`);
        toast.success(`Exported ${targets.length} events to your calendar (.ics)!`);
        void track("calendar_export_batch", { count: targets.length, type: filterMode, action: "export" });
        return true;
      },
    }),
    [
      events,
      myEvent,
      refresh,
      savedEvents,
      savedStalls,
      stalls,
      stallsFor,
      sync,
      user,
      calendarEvents,
      remoteNearby,
      remoteLoaded,
      fetchRemoteStalls,
      remoteRecords,
      userStates,
      toggleGoing,
      toggleInterested,
      toggleLiked,
      setEventStatus,
      rescheduleEvent,
      resetEventSchedule,
    ],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents");
  return ctx;
}
