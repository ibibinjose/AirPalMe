import type { PropertyInfo } from "@shared/airpal-data";
import { activePlaces } from "./catalog";

export type AskTonightItem = { title: string; sub: string };

/**
 * On-device concierge answers. Only ever states facts from the live property
 * record, live listings, or an explicitly passed tonight list — never bundled
 * venue content. Missing data degrades to "ask the desk" states.
 */
export function askLocal(
  question: string,
  ctx?: {
    kind?: string;
    room?: string;
    property?: PropertyInfo;
    now?: Date;
    timeZone?: string;
    tonight?: AskTonightItem[];
  },
) {
  const p = ctx?.property;
  const q = question.toLowerCase().trim();
  if (!q) return { title: "Ask", body: "Wi-Fi, food, walks, help." };
  const stayName = p?.name || "your stay";

  if (/wifi|wi-fi|password|network/.test(q)) {
    if (p?.wifi.password) {
      return { title: "Wi-Fi", body: `${p.wifi.network} · ${p.wifi.password}` };
    }
    return {
      title: "Wi-Fi",
      body: p?.wifi.network
        ? `${p.wifi.network}. Scan the room QR or ask the desk for the password.`
        : "Scan the room QR for Wi-Fi details, or ask the desk.",
    };
  }
  if (/breakfast|dining|menu|eat|hungry|food/.test(q)) {
    if (p?.breakfast?.hours || p?.breakfast?.type) {
      return {
        title: "Eat",
        body: `${p.breakfast.hours || "Dining available"} at ${p.breakfast.location || stayName}.`,
      };
    }
    return { title: "Eat", body: `Ask the desk at ${stayName} for dining options nearby.` };
  }
  if (/checkout|check-out|check out/.test(q)) {
    return { title: "Checkout", body: p?.checkOut || `Ask the desk at ${stayName} for checkout time.` };
  }
  if (/check-?in/.test(q)) {
    return { title: "Check-in", body: p?.checkIn || `Ask the desk at ${stayName} for check-in time.` };
  }
  if (/emergency|safe|help|000|police/.test(q)) {
    return {
      title: "Help",
      body: p?.phone ? `${stayName} front desk: ${p.phone} · Emergency: 000` : "Emergency: 000. Ask the front desk for help.",
    };
  }
  if (/pool|gym|laundry|facility/.test(q)) {
    const facilities = p?.facilities || [];
    const f = facilities.find((item) => item.name.toLowerCase().includes(q.split(" ")[0] || "pool")) || facilities[0];
    if (f) return { title: f.name, body: `${f.hours} · ${f.floor}` };
    return { title: stayName, body: "Ask the front desk for available facilities." };
  }
  if (/campus|class|timetable|dining hall/.test(q)) {
    return { title: "Campus", body: "Check your course timetable or ask the campus office for class locations." };
  }
  if (/walk|tour|sights|opera/.test(q)) {
    const near = activePlaces().filter((pl) => pl.geo).slice(0, 3);
    if (near.length) {
      return { title: "Nearby walks", body: near.map((pl) => pl.name).join(" · ") + ". Open Explore for walking times." };
    }
    return { title: "Walks", body: "Open Explore to see walks near you once local places are listed." };
  }
  if (/tonight|now|event/.test(q)) {
    const top = ctx?.tonight?.[0];
    if (top) return { title: top.title, body: top.sub || "See Discover for what’s on today." };
    return { title: "Tonight", body: "See Discover for what’s on near you today." };
  }

  const place = activePlaces().find(
    (pl) => q.includes(pl.name.toLowerCase().split(" ")[0] || "___") || pl.name.toLowerCase().includes(q),
  );
  if (place) return { title: place.name, body: place.insiderTip || place.shortWhy };

  const room = ctx?.room ? `Room ${ctx.room}. ` : "";
  return { title: p?.name || "Ask", body: p?.tagline ? `${room}${p.tagline}` : `${room}Ask the front desk — they know this place best.` };
}
