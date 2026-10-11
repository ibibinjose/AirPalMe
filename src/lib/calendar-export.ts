import type { CalendarEvent } from "@shared/event";

export interface SimpleCalendarPayload {
  id?: string;
  title: string;
  description?: string;
  startsAt: string; // ISO string
  endsAt?: string; // ISO string (defaults to +1 hour)
  venue?: string;
  city?: string;
  meetingLink?: string;
  meetingPlatform?: "in_person" | "google_meet" | "facetime" | "zoom" | string;
}

function platformName(platform?: string, link?: string): string {
  if (platform === "facetime" || link?.includes("facetime.apple.com") || link?.startsWith("facetime"))
    return "FaceTime";
  if (platform === "google_meet" || link?.includes("meet.google.com")) return "Google Meet";
  if (platform === "zoom" || link?.includes("zoom.us")) return "Zoom";
  return "Video Call";
}

function normalizePayload(event: CalendarEvent | SimpleCalendarPayload): {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  meetingLink?: string;
  meetingPlatform?: string;
} {
  const startsAt = event.startsAt || new Date().toISOString();
  let endsAt = event.endsAt;
  if (!endsAt) {
    const d = new Date(startsAt);
    d.setHours(d.getHours() + 1);
    endsAt = d.toISOString();
  }
  const meetingLink = "meetingLink" in event ? event.meetingLink : undefined;
  const meetingPlatform = "meetingPlatform" in event ? event.meetingPlatform : undefined;
  const baseLoc = [event.venue, event.city].filter(Boolean).join(", ");
  const location = meetingLink
    ? baseLoc && baseLoc.toLowerCase() !== "online" && !baseLoc.includes("http")
      ? `${baseLoc} (${meetingLink})`
      : meetingLink
    : baseLoc;

  let desc = event.description || "Organised on AirPal.Me";
  if (meetingLink && !desc.includes(meetingLink)) {
    const pName = platformName(meetingPlatform, meetingLink);
    desc = `${desc}\n\nJoin ${pName}: ${meetingLink}`;
  }

  return {
    id: event.id || `airpal-${Date.now()}`,
    title: event.title || "AirPal Catch Up",
    description: desc,
    startsAt,
    endsAt,
    location,
    meetingLink,
    meetingPlatform,
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

  const lines = [
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
  ];

  if (norm.meetingLink) {
    lines.push(`URL:${norm.meetingLink}`);
  }

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
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

    const lines = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${escapeIcsText(norm.location)}`,
    ];

    if (norm.meetingLink) {
      lines.push(`URL:${norm.meetingLink}`);
    }

    lines.push("STATUS:CONFIRMED", "END:VEVENT");
    return lines.join("\r\n");
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
