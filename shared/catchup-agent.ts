/**
 * Quiet catch-up scheduler. It proposes concrete Sydney times and the
 * words for the meeting thread and inbox row. It does not chat.
 */

import { zonedDateStr, zonedTimeToIso } from "./festival";

export const CATCHUP_TIME_ZONE = "Australia/Sydney";

const WINDOWS = ["09:00", "12:30", "16:00", "18:30"] as const;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface CatchUpSlot {
  id: string;
  date: string;
  time: string;
  label: string;
}

export function catchUpTypeLabel(type: string | undefined): string {
  if (type === "meeting") return "meeting";
  if (type === "nightout") return "hangout";
  return "catch-up";
}

export function catchUpSlotId(date: string, time: string): string {
  return `${date}-${time.replace(":", "")}`;
}

export function formatCatchUpSlotLabel(date: string, time: string, timeZone = CATCHUP_TIME_ZONE): string {
  const iso = zonedTimeToIso(date, time, timeZone);
  if (!iso) return `${date} · ${time}`;
  try {
    const when = new Date(iso);
    const day = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(when);
    const clock = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(when);
    return `${day} · ${clock}`;
  } catch {
    return `${date} · ${time}`;
  }
}

function zonedClock(instant: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hour}:${minute}`;
  } catch {
    return "00:00";
  }
}

function slot(date: string, time: string, timeZone: string): CatchUpSlot {
  return { id: catchUpSlotId(date, time), date, time, label: formatCatchUpSlotLabel(date, time, timeZone) };
}

/**
 * Up to three future slots. The requested time leads when it is still ahead.
 * Other options are the next Sydney windows (9:00, 12:30, 16:00, 18:30).
 */
export function proposeCatchUpSlots(input: {
  now: Date;
  requestedDate?: string;
  requestedTime?: string;
  busy?: { date?: string; time?: string }[];
  timeZone?: string;
}): CatchUpSlot[] {
  const timeZone = input.timeZone || CATCHUP_TIME_ZONE;
  const busy = new Set(
    (input.busy || [])
      .filter((row) => row.date && row.time)
      .map((row) => catchUpSlotId(String(row.date), String(row.time))),
  );
  const chosen: CatchUpSlot[] = [];
  const seen = new Set<string>();

  function push(date: string, time: string) {
    if (!TIME_RE.test(time)) return;
    const iso = zonedTimeToIso(date, time, timeZone);
    if (!iso) return;
    if (new Date(iso).getTime() <= input.now.getTime() + 15 * 60 * 1000) return;
    const id = catchUpSlotId(date, time);
    if (seen.has(id) || busy.has(id) || chosen.length >= 3) return;
    seen.add(id);
    chosen.push(slot(date, time, timeZone));
  }

  if (input.requestedDate && input.requestedTime) push(input.requestedDate, input.requestedTime);

  const horizon = input.now.getTime() + 6 * 24 * 60 * 60 * 1000;
  for (let t = input.now.getTime(); t <= horizon && chosen.length < 3; t += 30 * 60 * 1000) {
    const instant = new Date(t);
    const date = zonedDateStr(instant.toISOString(), timeZone);
    const time = zonedClock(instant, timeZone);
    if ((WINDOWS as readonly string[]).includes(time)) push(date, time);
  }

  const [lead, ...rest] = chosen;
  if (!lead) return [];
  const requestedFirst = Boolean(input.requestedDate && input.requestedTime && lead.id === catchUpSlotId(input.requestedDate, input.requestedTime));
  const ordered = requestedFirst
    ? [lead, ...rest.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))]
    : [...chosen].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return ordered;
}

export function catchUpThreadText(input: {
  phase: "proposed" | "scheduled";
  who: string;
  typeLabel: string;
  slots: CatchUpSlot[];
  venue?: string;
}): string {
  const place = input.venue?.trim() ? ` at ${input.venue.trim()}` : "";
  const first = input.slots[0];
  if (input.phase === "scheduled" && first) {
    return `Locked in: ${input.typeLabel} with ${input.who}${place}, ${first.label}. See you there.`;
  }
  const options = input.slots.map((row) => row.label).join(" · ");
  return `${input.who} proposed a ${input.typeLabel}${place}. Suggested times: ${options || "pick a time in this thread"}.`;
}

export function catchUpNotice(input: {
  phase: "proposed" | "scheduled";
  who: string;
  typeLabel: string;
  slot?: CatchUpSlot;
  conversationId: string;
}): { kind: "catchup_proposed" | "catchup_scheduled"; title: string; body: string; href: string } {
  const href = `/me/inbox?chat=${encodeURIComponent(input.conversationId)}`;
  if (input.phase === "scheduled") {
    return {
      kind: "catchup_scheduled",
      title: `${input.typeLabel[0]?.toUpperCase() || ""}${input.typeLabel.slice(1)} locked in`,
      body: input.slot ? `${input.who} · ${input.slot.label}` : `${input.who} confirmed the time.`,
      href,
    };
  }
  return {
    kind: "catchup_proposed",
    title: `${input.who} wants a ${input.typeLabel}`,
    body: input.slot ? `Suggested ${input.slot.label}. Open the thread to lock it in.` : "Open the thread to pick a time.",
    href,
  };
}
