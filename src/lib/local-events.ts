import type { NearbyEvent } from "@shared/nearby";
import { isOpenAt, parseHoursWindow } from "./hours";
import { DEFAULT_TZ, deviceTimeZone, minutesOfDay, zonedWeekdayIndex } from "./local-time";

const EVENING_START = 16 * 60;

function eventHoursText(event: NearbyEvent): string {
  const bits = [event.when, event.startTime, event.endTime].filter(Boolean);
  if (event.startTime && event.endTime && !event.when) {
    return `${event.startTime}–${event.endTime}`;
  }
  return bits[0] || "";
}

export function isEventOnToday(event: NearbyEvent, now: Date, timeZone = deviceTimeZone()): boolean {
  if (event.status !== "active") return false;
  const hours = eventHoursText(event);
  const window = hours ? parseHoursWindow(hours) : "unknown";
  const day = zonedWeekdayIndex(now, timeZone);
  if (window !== "always" && window !== "unknown" && window.days && !window.days.includes(day)) {
    return false;
  }
  if (event.isEnded) {
    const stillOpen = isOpenAt(hours, now, timeZone);
    if (stillOpen === false || stillOpen == null) return false;
  }
  if (/tonight|today/i.test(event.when || "")) return true;
  if (window !== "always" && window !== "unknown" && window.days) return window.days.includes(day);
  return true;
}

export function isEventLiveNow(event: NearbyEvent, now: Date, timeZone = deviceTimeZone()): boolean {
  if (event.status !== "active") return false;
  if (!isEventOnToday(event, now, timeZone)) return false;
  const hours = eventHoursText(event);
  const open = isOpenAt(hours, now, timeZone);
  if (open === true) return true;
  if (open === false) return false;
  if (event.isEnded) return false;
  return Boolean(event.isLiveNow);
}

/** Happening today and not finished — used for the Tonight chip. */
export function isEventTonight(event: NearbyEvent, now: Date, timeZone = deviceTimeZone()): boolean {
  if (!isEventOnToday(event, now, timeZone)) return false;
  const hours = eventHoursText(event);
  const window = hours ? parseHoursWindow(hours) : "unknown";
  const mins = minutesOfDay(now, timeZone);
  if (window !== "always" && window !== "unknown") {
    const end = window.end <= window.start ? window.end + 24 * 60 : window.end;
    if (mins > end + 20) return false;
  }
  if (event.isEnded && isOpenAt(hours, now, timeZone) === false) return false;
  if (/tonight/i.test(event.when || "") && mins < EVENING_START && window === "unknown") return true;
  return true;
}

export function eventsLiveNow(events: NearbyEvent[], now: Date, timeZone = DEFAULT_TZ): NearbyEvent[] {
  return events.filter((e) => isEventLiveNow(e, now, timeZone));
}

export function eventsTonight(events: NearbyEvent[], now: Date, timeZone = DEFAULT_TZ): NearbyEvent[] {
  return events.filter((e) => isEventTonight(e, now, timeZone));
}
