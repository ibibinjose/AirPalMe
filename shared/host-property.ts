import type { PropertyInfo, PropertyMemberRole } from "./airpal-data";
import { generatePropertyId, slugifyCity, slugifyHandle } from "./airpal-urls";

/** D3 — commercial stay kinds only. No residential/STRA kinds until legal compliance lands. */
export type HostPropertyKind =
  | "hotel"
  | "motel"
  | "serviced-apartment"
  | "hostel"
  | "boutique"
  | "campus"
  | "venue";

export function parseHostPropertyKind(value?: string | null): HostPropertyKind {
  if (
    value === "motel" ||
    value === "serviced-apartment" ||
    value === "hostel" ||
    value === "boutique" ||
    value === "campus" ||
    value === "venue"
  )
    return value;
  return "hotel";
}

export function propertyKindLabel(kind?: string): string {
  switch (kind) {
    case "motel":
      return "Motel";
    case "serviced-apartment":
      return "Serviced apartment";
    case "hostel":
      return "Hostel";
    case "boutique":
      return "Boutique stay";
    case "campus":
      return "Campus";
    case "venue":
      return "Venue";
    case "hotel":
      return "Hotel";
    default:
      return "Property";
  }
}

export function slugifyPropertyId(name: string): string {
  return slugifyHandle(name);
}

export interface CreateHostPropertyInput {
  propertyName: string;
  ownerEmail: string;
  ownerId?: string;
  kind?: HostPropertyKind;
  city?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  postalCode?: string;
  phoneCountryCode?: string;
  geo?: { lat: number; lng: number };
  wifiNetwork?: string;
  wifiPassword?: string;
  id?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  roomsCount?: number;
  checkIn?: string;
  checkOut?: string;
  breakfastHours?: string;
  breakfastLocation?: string;
  breakfastType?: string;
  breakfastPrice?: string;
  bookingUrl?: string;
  bookingLabel?: string;
}

function defaultsForKind(kind: HostPropertyKind) {
  if (kind === "campus") {
    return {
      tagline: "Residential college companion",
      roomsCount: 80,
      checkIn: "2:00 PM",
      checkOut: "10:00 AM",
      wifiNetwork: "College_Guest",
      wifiPassword: "",
      breakfast: {
        hours: "7:00–9:30 · 12:00–14:00 · 17:30–19:30",
        location: "Dining hall",
        type: "Hall meals",
        price: "Included",
      },
      facilities: [
        {
          name: "College office",
          hours: "8:00 AM – 6:00 PM",
          floor: "Main building",
          details: "Tap Staff in the companion",
          icon: "BellRing",
        },
      ],
    };
  }
  if (kind === "venue") {
    return {
      tagline: "Guest companion for your venue",
      roomsCount: 1,
      checkIn: "Open",
      checkOut: "Close",
      wifiNetwork: "Guest_WiFi",
      wifiPassword: "",
      breakfast: {
        hours: "See venue hours",
        location: "On site",
        type: "Menu",
        price: "Ask host",
      },
      facilities: [
        {
          name: "Host desk",
          hours: "During service",
          floor: "Entrance",
          details: "Tap Staff in the companion",
          icon: "BellRing",
        },
      ],
    };
  }
  if (kind === "hostel") {
    return {
      tagline: "Backpacker companion — beds, kitchen, and the city",
      roomsCount: 40,
      checkIn: "2:00 PM",
      checkOut: "10:00 AM",
      wifiNetwork: "Hostel_Guest",
      wifiPassword: "",
      breakfast: {
        hours: "7:00 AM – 10:00 AM",
        location: "Communal kitchen",
        type: "Self-serve breakfast",
        price: "Included",
      },
      facilities: [
        {
          name: "Front desk",
          hours: "24 Hours",
          floor: "Lobby",
          details: "Tap Staff in the companion",
          icon: "BellRing",
        },
      ],
    };
  }
  return {
    tagline: "Your guest companion",
    roomsCount: 12,
    checkIn: "2:00 PM",
    checkOut: "10:00 AM",
    wifiNetwork: "Guest Wi-Fi",
    wifiPassword: "",
    breakfast: {
      hours: "7:00 AM – 10:30 AM",
      location: "Main dining",
      type: "Breakfast",
      price: "Ask host",
    },
    facilities: [
      { name: "Help desk", hours: "24 Hours", floor: "Lobby", details: "Tap Staff in the companion", icon: "BellRing" },
    ],
  };
}

export function buildHostProperty(input: CreateHostPropertyInput): PropertyInfo {
  const kind = parseHostPropertyKind(input.kind);
  const city = input.city?.trim() || "Your city";
  const preset = defaultsForKind(kind);
  const handle = slugifyHandle(input.propertyName);
  // NEW properties use opaque ids. Callers may still pass legacy slug ids explicitly.
  const id = input.id || generatePropertyId();
  const members: Record<string, PropertyMemberRole> = {};
  if (input.ownerId) members[input.ownerId] = "host_admin";
  const roomsCount = Number(input.roomsCount);
  return {
    id,
    name: input.propertyName.trim() || "My property",
    kind,
    handle,
    slug: handle,
    citySlug: slugifyCity(city),
    vanityKey: `${slugifyCity(city)}/${handle}`,
    tagline: input.tagline?.trim() || preset.tagline,
    destination: city,
    city,
    country: input.country?.trim() || "Australia",
    countryCode: input.countryCode?.trim() || (input.country?.trim() ? undefined : "AU"),
    state: input.state?.trim() || "",
    postalCode: input.postalCode?.trim() || "",
    address: input.address?.trim() || city,
    phone: input.phone?.trim() || "",
    phoneCountryCode: input.phoneCountryCode?.trim() || "",
    geo: input.geo,
    whatsapp: "",
    roomsCount: Number.isFinite(roomsCount) && roomsCount > 0 ? roomsCount : preset.roomsCount,
    status: "trial",
    ownerEmail: input.ownerEmail,
    ownerId: input.ownerId,
    members,
    monthlyRevenue: 0,
    plan: "Starter",
    wifi: {
      network: input.wifiNetwork?.trim() || preset.wifiNetwork,
      password: input.wifiPassword?.trim() || preset.wifiPassword,
      speed: "Wi-Fi",
    },
    checkIn: input.checkIn?.trim() || preset.checkIn,
    checkOut: input.checkOut?.trim() || preset.checkOut,
    breakfast: {
      hours: input.breakfastHours?.trim() || preset.breakfast.hours,
      location: input.breakfastLocation?.trim() || preset.breakfast.location,
      type: input.breakfastType?.trim() || preset.breakfast.type,
      price: input.breakfastPrice?.trim() || preset.breakfast.price,
    },
    facilities: preset.facilities,
    bookingUrl: input.bookingUrl?.trim() || undefined,
    bookingLabel: input.bookingLabel?.trim() || undefined,
  };
}

/** Strip secrets from a property before writing the public Firestore doc. */
export function toPublicPropertyDoc(property: PropertyInfo): PropertyInfo {
  return {
    ...property,
    wifi: {
      network: property.wifi?.network || "",
      password: "",
      speed: property.wifi?.speed || "",
    },
  };
}

export function hostSecretsFromProperty(property: PropertyInfo): {
  wifiPassword: string;
  wifiNetwork: string;
} {
  return {
    wifiPassword: property.wifi?.password || "",
    wifiNetwork: property.wifi?.network || "",
  };
}
