import {
  type EventRecord,
  type SavedEvent,
  type SavedStall,
  type StallRecord,
  type UserEventState,
} from "@shared/event";

const EVENTS_KEY = "airpal.events.v1";
const STALLS_KEY = "airpal.event-stalls.v1";
const SAVED_EVENTS_KEY = "airpal.saved-events.v1";
const SAVED_STALLS_KEY = "airpal.saved-stalls.v1";
const CALENDAR_STATES_KEY = "airpal.calendar-state.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Device-local organiser events only. No bundled seeds — empty DB means empty lists. */
export function loadEvents(): EventRecord[] {
  const extra = readJson<EventRecord[]>(EVENTS_KEY, []);
  const byId = new Map<string, EventRecord>();
  for (const row of extra) {
    if (row && typeof row.id === "string" && typeof row.name === "string") byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

export function loadStalls(): StallRecord[] {
  const extra = readJson<StallRecord[]>(STALLS_KEY, []);
  const byId = new Map<string, StallRecord>();
  for (const row of extra) {
    if (row && typeof row.id === "string" && typeof row.name === "string") byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

export function persistEvents(rows: EventRecord[]) {
  writeJson(EVENTS_KEY, rows);
}

export function persistStalls(rows: StallRecord[]) {
  writeJson(STALLS_KEY, rows);
}

export function loadSavedEvents(): SavedEvent[] {
  return readJson(SAVED_EVENTS_KEY, []);
}

export function loadSavedStalls(): SavedStall[] {
  return readJson(SAVED_STALLS_KEY, []);
}

export function persistSavedEvents(rows: SavedEvent[]) {
  writeJson(SAVED_EVENTS_KEY, rows);
}

export function persistSavedStalls(rows: SavedStall[]) {
  writeJson(SAVED_STALLS_KEY, rows);
}

export function loadUserEventStates(): Record<string, UserEventState> {
  return readJson<Record<string, UserEventState>>(CALENDAR_STATES_KEY, {});
}

export function persistUserEventStates(states: Record<string, UserEventState>) {
  writeJson(CALENDAR_STATES_KEY, states);
}
