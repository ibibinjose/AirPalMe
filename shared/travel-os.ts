export type TravelMode = "explore" | "travel" | "stay" | "memory";
export type PartyType = "solo" | "couple" | "family" | "business" | "friends";
export type TravelParty = "solo" | "family" | "mates" | "colleagues" | "couple";
export type CompanionRelation = "family" | "mate" | "colleague" | "partner";
export type TripWhen = "past" | "present" | "future";

export interface TripCompanion {
  id: string;
  name: string;
  relation: CompanionRelation;
}
export type TravelStyle = "budget" | "comfortable" | "luxury";
export type TripStatus = "planning" | "upcoming" | "active" | "completed";
export type TripItemKind =
  | "before"
  | "flight"
  | "airport"
  | "transfer"
  | "hotel"
  | "experience"
  | "restaurant"
  | "memory"
  | "note";
export type TripItemStatus = "planned" | "confirmed" | "missing" | "done" | "conflict";
export type WalletKind = "boarding_pass" | "hotel" | "ticket" | "transfer" | "reservation";
export type KnowledgeLayer = "hotel" | "destination" | "business" | "experience" | "faq" | "emergency" | "campus";
export type LocalVoiceKind = "local" | "concierge" | "community" | "hidden";

export interface TravelDna {
  partyType: PartyType;
  interests: string[];
  style: TravelStyle;
  familyFriendly: boolean;
  walkingPreferred: boolean;
  cuisines: string[];
  budgetBand: "$" | "$$" | "$$$";
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  city: string;
  country: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  propertyId?: string;
  status: TripStatus;
  party: TravelParty;
  companions: TripCompanion[];
  tags: string[];
}

export interface TripItem {
  id: string;
  tripId: string;
  kind: TripItemKind;
  title: string;
  subtitle?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  cost?: string;
  status: TripItemStatus;
  confirmation?: string;
  notes?: string;
  weatherSensitive?: boolean;
  tags?: string[];
}

export interface WalletPass {
  id: string;
  kind: WalletKind;
  title: string;
  details: string;
  startsAt?: string;
  code?: string;
  tripId?: string;
}

export interface TravelDocument {
  id: string;
  filename: string;
  rawText: string;
  parsedKind: TripItemKind | "unknown";
  extracted: Record<string, string>;
  createdAt: string;
  linkedItemId?: string;
}

export interface KnowledgeDoc {
  id: string;
  layer: KnowledgeLayer;
  title: string;
  body: string;
  tags: string[];
}

export interface CommunityGroup {
  id: string;
  name: string;
  city: string;
  culture: string;
  members: number;
  events: { id: string; title: string; when: string; where: string; date: string; time?: string }[];
  foodPicks: { name: string; why: string }[];
}

export interface LocalVoice {
  id: string;
  voice: LocalVoiceKind;
  label: string;
  place: string;
  why: string;
  city: string;
}

export interface MemoryItem {
  id: string;
  tripId: string;
  title: string;
  note: string;
  place?: string;
  createdAt: string;
}

export interface HealthCheck {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
  fix?: string;
}

export interface ArrivalBrief {
  headline: string;
  weather: string;
  airport: string;
  transport: string;
  hotel: string;
  evening: string;
}

export const DEFAULT_DNA: TravelDna = {
  partyType: "family",
  interests: ["Food", "Culture", "Hidden places"],
  style: "comfortable",
  familyFriendly: true,
  walkingPreferred: true,
  cuisines: ["Indian", "Local"],
  budgetBand: "$$",
};

export function tripWhen(trip: Pick<Trip, "startDate" | "endDate">, today = "2026-09-06"): TripWhen {
  if (trip.endDate < today) return "past";
  if (trip.startDate > today) return "future";
  return "present";
}

export const SEED_TRIPS: Trip[] = [
  {
    id: "trip-melbourne-2026",
    title: "Melbourne with mates",
    destination: "Melbourne",
    city: "Melbourne",
    country: "Australia",
    countryCode: "AU",
    startDate: "2026-07-11",
    endDate: "2026-07-13",
    status: "completed",
    party: "mates",
    companions: [
      { id: "c-arun", name: "Arun", relation: "mate" },
      { id: "c-dev", name: "Dev", relation: "mate" },
    ],
    tags: ["laneways", "coffee", "mates"],
  },
  {
    id: "trip-goldcoast-2026",
    title: "Gold Coast with colleagues",
    destination: "Gold Coast",
    city: "Gold Coast",
    country: "Australia",
    countryCode: "AU",
    startDate: "2026-09-04",
    endDate: "2026-09-07",
    status: "active",
    party: "colleagues",
    companions: [
      { id: "c-marcus", name: "Marcus", relation: "colleague" },
      { id: "c-priya", name: "Priya", relation: "colleague" },
    ],
    tags: ["work", "beach", "colleagues"],
  },
  {
    id: "trip-sydney-2026",
    title: "Sydney with family",
    destination: "Sydney",
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
    startDate: "2026-09-15",
    endDate: "2026-09-18",
    propertyId: "harbour-hotel",
    status: "upcoming",
    party: "family",
    companions: [
      { id: "c-maya", name: "Maya", relation: "family" },
      { id: "c-appa", name: "Appa", relation: "family" },
    ],
    tags: ["harbour", "family", "indian-food"],
  },
  {
    id: "trip-tokyo-2026",
    title: "Tokyo with mates",
    destination: "Tokyo",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    startDate: "2026-11-08",
    endDate: "2026-11-14",
    status: "planning",
    party: "mates",
    companions: [{ id: "c-leo", name: "Leo", relation: "mate" }],
    tags: ["rail", "food", "mates"],
  },
  {
    id: "trip-harbour-college-2026",
    title: "Harbour College semester",
    destination: "Sydney",
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
    startDate: "2026-09-01",
    endDate: "2026-11-28",
    propertyId: "harbour-college",
    status: "active",
    party: "mates",
    companions: [
      { id: "c-nisha", name: "Nisha", relation: "mate" },
      { id: "c-arjun", name: "Arjun", relation: "mate" },
    ],
    tags: ["college", "usyd", "orientation", "mates"],
  },
];

export const SEED_ITEMS: TripItem[] = [
  {
    id: "ti-pack",
    tripId: "trip-sydney-2026",
    kind: "before",
    title: "Pack & documents",
    subtitle: "Passport, QF boarding pass, Harbour Hotel confirmation",
    startAt: "2026-09-14T20:00:00+10:00",
    status: "confirmed",
  },
  {
    id: "ti-flight",
    tripId: "trip-sydney-2026",
    kind: "flight",
    title: "Melbourne → Sydney",
    subtitle: "QF431 · 1h 25m",
    startAt: "2026-09-15T14:30:00+10:00",
    endAt: "2026-09-15T15:55:00+10:00",
    location: "MEL T1 → SYD T3",
    cost: "Confirmed",
    status: "confirmed",
    confirmation: "QF431",
    tags: ["flight", "family"],
  },
  {
    id: "ti-airport",
    tripId: "trip-sydney-2026",
    kind: "airport",
    title: "Sydney Airport arrival",
    subtitle: "Terminal 3 · baggage carousel 2",
    startAt: "2026-09-15T15:55:00+10:00",
    location: "SYD T3",
    status: "confirmed",
  },
  {
    id: "ti-transfer",
    tripId: "trip-sydney-2026",
    kind: "transfer",
    title: "Airport transfer",
    subtitle: "Not booked yet · train recommended",
    startAt: "2026-09-15T16:20:00+10:00",
    location: "Airport Link to Circular Quay",
    status: "missing",
    notes: "Airport Link 18 min to Circular Quay, then 6 min walk.",
    tags: ["transfer", "airport"],
  },
  {
    id: "ti-hotel",
    tripId: "trip-sydney-2026",
    kind: "hotel",
    title: "Check-in · Harbour Hotel",
    subtitle: "Room 508 · Harbour Suite",
    startAt: "2026-09-15T16:00:00+10:00",
    location: "64 Argyle Street, The Rocks",
    status: "confirmed",
    confirmation: "HH-508-15SEP",
    tags: ["hotel", "family"],
  },
  {
    id: "ti-dinner",
    tripId: "trip-sydney-2026",
    kind: "restaurant",
    title: "Dinner reservation",
    subtitle: "The Spice Room · Circular Quay",
    startAt: "2026-09-15T19:30:00+10:00",
    endAt: "2026-09-15T21:00:00+10:00",
    location: "Circular Quay",
    cost: "$$",
    status: "confirmed",
    confirmation: "SR-1930",
    notes: "Indian community favourite. Conflicts with harbour walk if you linger.",
    tags: ["food", "indian-food", "family"],
  },
  {
    id: "ti-walk",
    tripId: "trip-sydney-2026",
    kind: "experience",
    title: "Harbour walk",
    subtitle: "Opera House foreshore at sunset",
    startAt: "2026-09-15T20:30:00+10:00",
    location: "Circular Quay East",
    cost: "Free",
    status: "conflict",
    weatherSensitive: true,
    notes: "Overlaps dinner. Move to 18:45 or skip.",
    tags: ["outdoor", "harbour", "family"],
  },
  {
    id: "ti-day2-garden",
    tripId: "trip-sydney-2026",
    kind: "experience",
    title: "Royal Botanic Garden",
    subtitle: "Rain expected mid-afternoon",
    startAt: "2026-09-16T14:00:00+10:00",
    location: "Mrs Macquaries Rd",
    cost: "Free",
    status: "planned",
    weatherSensitive: true,
  },
  {
    id: "ti-mel-flight",
    tripId: "trip-melbourne-2026",
    kind: "flight",
    title: "Sydney → Melbourne",
    startAt: "2026-07-11T08:10:00+10:00",
    status: "done",
    confirmation: "JQ503",
  },
  {
    id: "ti-mel-hotel",
    tripId: "trip-melbourne-2026",
    kind: "hotel",
    title: "Ovolo Laneways",
    startAt: "2026-07-11T14:00:00+10:00",
    status: "done",
  },
  {
    id: "ti-mel-food",
    tripId: "trip-melbourne-2026",
    kind: "restaurant",
    title: "Tipo 00",
    startAt: "2026-07-11T19:00:00+10:00",
    status: "done",
    tags: ["food", "mates"],
  },
  {
    id: "ti-gc-stand",
    tripId: "trip-goldcoast-2026",
    kind: "before",
    title: "Sales stand-up",
    subtitle: "Marcus presenting · 09:00",
    startAt: "2026-09-05T09:00:00+10:00",
    status: "done",
    tags: ["work", "colleagues"],
  },
  {
    id: "ti-gc-hotel",
    tripId: "trip-goldcoast-2026",
    kind: "hotel",
    title: "QT Gold Coast",
    subtitle: "Shared twin · colleagues",
    startAt: "2026-09-04T15:00:00+10:00",
    status: "confirmed",
    tags: ["hotel", "colleagues"],
  },
  {
    id: "ti-gc-dinner",
    tripId: "trip-goldcoast-2026",
    kind: "restaurant",
    title: "Team dinner · Rick Shores",
    subtitle: "Priya booked · 19:00",
    startAt: "2026-09-05T19:00:00+10:00",
    status: "confirmed",
    tags: ["food", "colleagues"],
  },
  {
    id: "ti-tokyo-rail",
    tripId: "trip-tokyo-2026",
    kind: "before",
    title: "Buy JR Pass",
    startAt: "2026-11-01T10:00:00+09:00",
    status: "planned",
    tags: ["rail", "mates"],
  },
  {
    id: "ti-tokyo-flight",
    tripId: "trip-tokyo-2026",
    kind: "flight",
    title: "SYD → HND",
    subtitle: "Hold fare · not ticketed",
    startAt: "2026-11-08T09:15:00+11:00",
    status: "planned",
    tags: ["flight", "mates"],
  },
  {
    id: "ti-college-room",
    tripId: "trip-harbour-college-2026",
    kind: "hotel",
    title: "Room R12 · Harbour College",
    subtitle: "River wing · first floor swipe",
    startAt: "2026-09-01T14:00:00+10:00",
    location: "1 College Crescent, Camperdown",
    status: "confirmed",
    confirmation: "HC-R12",
    tags: ["college", "mates"],
  },
  {
    id: "ti-college-brunch",
    tripId: "trip-harbour-college-2026",
    kind: "restaurant",
    title: "College brunch",
    subtitle: "Great Hall · visitors with a resident",
    startAt: "2026-09-06T09:30:00+10:00",
    endAt: "2026-09-06T11:30:00+10:00",
    location: "Great Hall",
    status: "confirmed",
    tags: ["college", "food"],
  },
  {
    id: "ti-college-fair",
    tripId: "trip-harbour-college-2026",
    kind: "experience",
    title: "Clubs & societies fair",
    subtitle: "Malayali, Indian, hiking, debating, football",
    startAt: "2026-09-06T14:00:00+10:00",
    location: "Front lawn",
    status: "confirmed",
    tags: ["college", "mates"],
  },
  {
    id: "ti-college-data",
    tripId: "trip-harbour-college-2026",
    kind: "experience",
    title: "Intro to Data (DATA1001)",
    subtitle: "Lecture · Carslaw LT 175",
    startAt: "2026-09-07T09:00:00+10:00",
    endAt: "2026-09-07T10:00:00+10:00",
    location: "Carslaw LT 175",
    status: "confirmed",
    tags: ["college"],
  },
  {
    id: "ti-college-welcome",
    tripId: "trip-harbour-college-2026",
    kind: "experience",
    title: "International student welcome",
    subtitle: "OSHC, TFN, transport, city safety",
    startAt: "2026-09-08T17:00:00+10:00",
    location: "Wentworth Building",
    status: "confirmed",
    tags: ["college", "international"],
  },
];

export const SEED_WALLET: WalletPass[] = [
  {
    id: "w-qf431",
    kind: "boarding_pass",
    title: "QF431 MEL → SYD",
    details: "15 Sep · 14:30 · Seat 14A · T1",
    startsAt: "2026-09-15T14:30:00+10:00",
    code: "QF431",
    tripId: "trip-sydney-2026",
  },
  {
    id: "w-hotel",
    kind: "hotel",
    title: "Harbour Hotel Sydney",
    details: "Check-in 15 Sep 16:00 · Room 508 · HH-508-15SEP",
    startsAt: "2026-09-15T16:00:00+10:00",
    code: "HH-508-15SEP",
    tripId: "trip-sydney-2026",
  },
  {
    id: "w-spice",
    kind: "reservation",
    title: "The Spice Room",
    details: "15 Sep 19:30 · Table for 3 · Indian, Circular Quay",
    startsAt: "2026-09-15T19:30:00+10:00",
    code: "SR-1930",
    tripId: "trip-sydney-2026",
  },
  {
    id: "w-college-room",
    kind: "hotel",
    title: "Harbour College · R12",
    details: "Swipe building + room key · river wing",
    startsAt: "2026-09-01T14:00:00+10:00",
    code: "HC-R12",
    tripId: "trip-harbour-college-2026",
  },
];

export const SEED_KNOWLEDGE: KnowledgeDoc[] = [
  {
    id: "k-breakfast",
    layer: "hotel",
    title: "Breakfast",
    body: "Breakfast is served 6:30 AM – 10:30 AM in the Ground Floor Atrium Restaurant. Artisan buffet and made-to-order eggs. Pre-book $22 or walk-in $28.",
    tags: ["breakfast", "hours", "food", "atrium"],
  },
  {
    id: "k-wifi",
    layer: "hotel",
    title: "Wi-Fi",
    body: "Network HarbourHotel_Guest. The password is issued on the stay QR, not in this guide. 250 Mbps fibre. No captive portal.",
    tags: ["wifi", "internet", "password"],
  },
  {
    id: "k-checkout",
    layer: "hotel",
    title: "Check-out",
    body: "Standard check-out is 10:00 AM. Late check-out until 4:00 PM is $45. Luggage storage is complimentary at the front desk.",
    tags: ["checkout", "late", "luggage"],
  },
  {
    id: "k-airport",
    layer: "destination",
    title: "Airport to The Rocks",
    body: "Airport Link train from SYD T3 to Circular Quay takes about 18 minutes, then a 6 minute walk to Harbour Hotel. Private chauffeur is $65 fixed. Avoid rideshare surge at 4pm.",
    tags: ["airport", "transfer", "train", "transport"],
  },
  {
    id: "k-weather-day2",
    layer: "destination",
    title: "Sydney day 2 weather",
    body: "Showers likely from 2pm on 16 September. Swap outdoor harbour walks for MCA, QVB Tea Room, or the hotel cellar bar.",
    tags: ["weather", "rain", "indoor"],
  },
  {
    id: "k-emergency",
    layer: "emergency",
    title: "Emergency",
    body: "Australia emergency number is 000. Hotel duty manager +61 488 999 111. Sydney Hospital 8 Macquarie St. Assembly point First Fleet Park.",
    tags: ["emergency", "hospital", "police", "000"],
  },
  {
    id: "k-indian",
    layer: "business",
    title: "Indian food walking distance",
    body: "The Spice Room at Circular Quay is a 6 minute walk and is the hotel's Indian community favourite. Foreign Return in Surry Hills is 8 minutes by light rail.",
    tags: ["indian", "food", "dinner", "community"],
  },
];

export const SEED_COMMUNITIES: CommunityGroup[] = [
  {
    id: "c-malayali",
    name: "Malayali Sydney",
    city: "Sydney",
    culture: "Malayali",
    members: 1840,
    events: [
      { id: "e1", title: "Onam sadhya at Pendle Hill", when: "Sat 12 Sep · 12:00", date: "2026-09-12", time: "12:00", where: "Pendle Hill Community Hall" },
      { id: "e2", title: "Malayalam movie night", when: "Thu 17 Sep · 19:00", date: "2026-09-17", time: "19:00", where: "Event Cinemas George St" },
    ],
    foodPicks: [
      { name: "Taste of Kerala, Harris Park", why: "Appam and stew the way home cooks make it." },
      { name: "Malabar House, Newtown", why: "Late-night porotta after harbour walks." },
    ],
  },
  {
    id: "c-indian",
    name: "Indian Sydney",
    city: "Sydney",
    culture: "Indian",
    members: 6200,
    events: [
      { id: "e3", title: "Harris Park food crawl", when: "Sun 20 Sep · 17:00", date: "2026-09-20", time: "17:00", where: "Marion St, Harris Park" },
    ],
    foodPicks: [
      { name: "The Spice Room, Circular Quay", why: "Hotel concierge + Indian community pick." },
      { name: "Spice Alley, Chippendale", why: "Hawker prices, 12 min light rail." },
    ],
  },
  {
    id: "c-korean",
    name: "Korean Sydney",
    city: "Sydney",
    culture: "Korean",
    members: 2100,
    events: [{ id: "e4", title: "Strathfield night market", when: "Fri 18 Sep · 18:30", date: "2026-09-18", time: "18:30", where: "The Boulevarde" }],
    foodPicks: [{ name: "Mad for Chicken, Haymarket", why: "Late fried chicken after the Opera House." }],
  },
];

export const SEED_VOICES: LocalVoice[] = [
  {
    id: "v1",
    voice: "concierge",
    label: "Hotel concierge pick",
    place: "The Glenmore Rooftop",
    why: "Best sunset from The Rocks without a booking war. Arrive 17:45.",
    city: "Sydney",
  },
  {
    id: "v2",
    voice: "community",
    label: "Indian community favourite",
    place: "The Spice Room",
    why: "Tandoori and dum biryani overlooking the wharf. 6 min walk.",
    city: "Sydney",
  },
  {
    id: "v3",
    voice: "local",
    label: "Recommended by Sydney locals",
    place: "Edition Coffee Roasters",
    why: "Skip hotel espresso. Batch brew and soufflé pancakes.",
    city: "Sydney",
  },
  {
    id: "v4",
    voice: "hidden",
    label: "Hidden gem",
    place: "Suez Canal alleyway",
    why: "Gas-lamp sandstone cut directly behind the hotel. Free, 4 minutes.",
    city: "Sydney",
  },
];

export const SEED_MEMORIES: MemoryItem[] = [
  {
    id: "m1",
    tripId: "trip-melbourne-2026",
    title: "Laneway rain",
    note: "Hid under a Degraves Street awning with a flat white. Keep this energy for Sydney day 2 rain.",
    place: "Degraves St",
    createdAt: "2026-07-12T11:20:00+10:00",
  },
  {
    id: "m2",
    tripId: "trip-melbourne-2026",
    title: "Tipo 00",
    note: "Best pasta of the year. Book next time 6 weeks out.",
    place: "Little Bourke St",
    createdAt: "2026-07-11T21:10:00+10:00",
  },
];

export const EXPLORE_DESTINATIONS = [
  { id: "sydney", name: "Sydney", country: "Australia", blurb: "Harbour walks, The Rocks, and food within 10 minutes of your hotel." },
  { id: "melbourne", name: "Melbourne", country: "Australia", blurb: "Laneways, coffee, and long tables. You already have a passport stamp." },
  { id: "tokyo", name: "Tokyo", country: "Japan", blurb: "Rail-first, food-led, family-capable. Saved as a future trip." },
  { id: "kochi", name: "Kochi", country: "India", blurb: "Home circuit — Malayali food DNA, backwaters, and family stays." },
];
