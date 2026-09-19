import type { CalendarEvent } from "@shared/event";

export interface SimpleCalendarPayload {
  id?: string;
  title: string;
  description?: string;
  startsAt: string; // ISO string
  endsAt?: string; // ISO string (defaults to +1 hour)
  venue?: string;
  city?: string;
}

function normalizePayload(event: CalendarEvent | SimpleCalendarPayload): {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
} {
  const startsAt = event.startsAt || new Date().toISOString();
  let endsAt = event.endsAt;
  if (!endsAt) {
    const d = new Date(startsAt);
    d.setHours(d.getHours() + 1);
    endsAt = d.toISOString();
  }
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  return {
    id: event.id || `airpal-${Date.now()}`,
    title: event.title || "AirPal Catch Up",
    description: event.description || "Organised on AirPal.Me",
    startsAt,
    endsAt,
    location,
  };
}

function formatIcsDate(isoString: string): string {
  const date = new Date(isoString);
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcs(event: CalendarEvent | SimpleCalendarPayload): string {
  const norm = normalizePayload(event);
  const dtStart = formatIcsDate(norm.startsAt);
  const dtEnd = formatIcsDate(norm.endsAt);
  const dtStamp = formatIcsDate(new Date().toISOString());
  const summary = escapeIcsText(norm.title);
  const description = escapeIcsText(norm.description);
  const uid = `${norm.id}@airpal.me`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AirPal//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeIcsText(norm.location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function generateMultipleIcs(
  events: (CalendarEvent | SimpleCalendarPayload)[],
  calendarTitle = "AirPal Stay Itinerary",
): string {
  const dtStamp = formatIcsDate(new Date().toISOString());
  const vEvents = events.map((event) => {
    const norm = normalizePayload(event);
    const dtStart = formatIcsDate(norm.startsAt);
    const dtEnd = formatIcsDate(norm.endsAt);
    const summary = escapeIcsText(norm.title);
    const description = escapeIcsText(norm.description);
    const uid = `${norm.id}-${Date.now()}@airpal.me`;

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${escapeIcsText(norm.location)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AirPal//Event Itinerary//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarTitle)}`,
    ...vEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event: CalendarEvent | SimpleCalendarPayload): void {
  const norm = normalizePayload(event);
  const icsContent = generateIcs(norm);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${norm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMultipleIcs(
  events: (CalendarEvent | SimpleCalendarPayload)[],
  filename = "airpal-itinerary.ics",
): void {
  if (!events.length) return;
  const icsContent = generateMultipleIcs(events);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Google Calendar Web link */
export function getGoogleCalendarUrl(event: CalendarEvent | SimpleCalendarPayload): string {
  const norm = normalizePayload(event);
  const dtStart = formatIcsDate(norm.startsAt);
  const dtEnd = formatIcsDate(norm.endsAt);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: norm.title,
    dates: `${dtStart}/${dtEnd}`,
    details: norm.description,
    location: norm.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Microsoft Outlook Live / Hotmail Web link */
export function getOutlookLiveCalendarUrl(event: CalendarEvent | SimpleCalendarPayload): string {
  const norm = normalizePayload(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: norm.title,
    startdt: norm.startsAt,
    enddt: norm.endsAt,
    body: norm.description,
    location: norm.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Microsoft 365 / Office Work & School Calendar link */
export function getOffice365CalendarUrl(event: CalendarEvent | SimpleCalendarPayload): string {
  const norm = normalizePayload(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: norm.title,
    startdt: norm.startsAt,
    enddt: norm.endsAt,
    body: norm.description,
    location: norm.location,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Yahoo Calendar Web link */
export function getYahooCalendarUrl(event: CalendarEvent | SimpleCalendarPayload): string {
  const norm = normalizePayload(event);
  const dtStart = formatIcsDate(norm.startsAt);
  const dtEnd = formatIcsDate(norm.endsAt);

  const params = new URLSearchParams({
    v: "60",
    view: "d",
    type: "20",
    title: norm.title,
    st: dtStart,
    et: dtEnd,
    desc: norm.description,
    in_loc: norm.location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}
