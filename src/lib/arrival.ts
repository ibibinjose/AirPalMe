export type ArrivalPhase = "later" | "today" | "soon" | "early" | "open" | "in";

const TZ = "Australia/Sydney";

export function parseCheckInClock(label: string): { hours: number; minutes: number } {
  const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return { hours: 14, minutes: 0 };
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const mer = match[3]?.toLowerCase();
  if (mer === "pm" && hours < 12) hours += 12;
  if (mer === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

function tzParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return map;
}

export function checkInOnDay(now: Date, hours: number, minutes: number, timeZone = TZ, dayOffset = 0): Date {
  const base = new Date(now.getTime() + dayOffset * 86400000);
  const parts = tzParts(base, timeZone);
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const probe = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  const shown = tzParts(probe, timeZone);
  const shownH = Number(shown.hour);
  const driftHours = hours - shownH;
  return new Date(probe.getTime() + driftHours * 3600000);
}

export function defaultCheckInAt(checkInLabel: string, now: Date, hasRoom: boolean, timeZone = TZ): Date {
  const clock = parseCheckInClock(checkInLabel);
  const today = checkInOnDay(now, clock.hours, clock.minutes, timeZone, 0);
  if (hasRoom) return today;
  if (now.getTime() < today.getTime()) return today;
  return checkInOnDay(now, clock.hours, clock.minutes, timeZone, 1);
}

export function arrivalPhase(now: Date, checkInAt: Date, hasRoom: boolean): ArrivalPhase {
  const delta = checkInAt.getTime() - now.getTime();
  const hour = 3600000;
  if (hasRoom && delta < -0.5 * hour) return "in";
  if (delta > 12 * hour) return "later";
  if (delta > 2 * hour) return "today";
  if (delta > 0) return "soon";
  if (delta > -3 * hour && !hasRoom) return "early";
  if (delta > -4 * hour) return "open";
  return "in";
}

export function countdownLabel(deltaMs: number) {
  const abs = Math.abs(deltaMs);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const rh = hours % 24;
  return rh ? `${days}d ${rh}h` : `${days}d`;
}

export function formatWhen(date: Date, timeZone = TZ) {
  return date.toLocaleString("en-AU", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
