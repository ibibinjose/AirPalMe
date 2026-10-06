import type { PropertyInfo } from "@shared/airpal-data";
import { HARBOUR_COLLEGE as CAMPUS } from "@shared/campus";

type StayKind = "none" | "stay" | "marker" | "campus";

export type AnswerItem = { label: string; value: string };

export type QuickAnswers = {
  place: string;
  room: string | null;
  wifi: { network: string; password: string; speed: string };
  checkout: AnswerItem[];
  rules: AnswerItem[];
};

export function buildQuickAnswers(property: PropertyInfo, kind: StayKind, room: string | null): QuickAnswers {
  if (kind === "campus") {
    return {
      place: CAMPUS.name,
      room,
      wifi: CAMPUS.wifi,
      checkout: [
        { label: "Move-out", value: "10:00 AM · term end" },
        { label: "Dining", value: CAMPUS.dining.hours },
        { label: "Library", value: CAMPUS.library },
      ],
      rules: [
        { label: "Gate", value: "Scan the college QR. Keep your swipe on you after 10 PM." },
        { label: "Hall", value: CAMPUS.dining.notes },
        { label: "Quiet", value: "House quiet after 11 PM on weeknights." },
        { label: "Guests", value: "Sign visitors in at the office." },
      ],
    };
  }

  const facilities = property.facilities || [];
  const pool = facilities.find((f) => f && f.name && /pool/i.test(f.name));
  const laundry = facilities.find((f) => f && f.name && /laundry/i.test(f.name));
  const luggage = facilities.find((f) => f && f.name && /luggage/i.test(f.name));
  const bar = facilities.find((f) => f && f.name && /bar/i.test(f.name));
  const wifi = property.wifi || { network: "Ask front desk", password: "", speed: "" };

  return {
    place: property.name || "AirPal Stay",
    room,
    wifi,
    checkout: [
      { label: "Out by", value: property.checkOut || "10:00 AM" },
      { label: "In from", value: property.checkIn || "2:00 PM" },
      { label: "Bags", value: luggage?.details || "Front desk holds bags after checkout." },
      { label: "Late", value: "Ask the host before 8 PM the night before." },
      { label: "Cancel", value: property.cancellationPolicy || "See your booking." },
    ],
    rules: [
      {
        label: "Quiet",
        value: bar ? `Keep it down after ${bar.hours?.split("–").pop()?.trim() || "11 PM"}.` : "Quiet after 10:30 PM.",
      },
      { label: "Smoke", value: "Rooms are smoke-free. Use outdoor terraces." },
      { label: "Pool", value: pool ? `${pool.hours} · ${pool.floor}` : "Ask the desk." },
      { label: "Laundry", value: laundry ? `${laundry.hours} · ${laundry.floor}` : "Ask the desk." },
      { label: "Keys", value: room ? `Room ${room} opens with the stay QR.` : "Your stay QR is your key." },
      { label: "Guests", value: "Extra overnight guests — message the host first." },
    ],
  };
}

export function contactPrefill(property: PropertyInfo, room: string | null) {
  const where = room ? `Room ${room}` : "the property";
  return `Hi, I’m in ${where} at ${property.name}. `;
}
