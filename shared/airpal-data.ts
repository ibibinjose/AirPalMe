export interface PropertyInfo {
  id: string;
  name: string;
  tagline: string;
  kind?: "hotel" | "hostel" | "campus" | "venue";
  destination: string;
  city: string;
  /** ISO 3166-1 alpha-2, e.g. AU, IN. */
  countryCode?: string;
  /** State / region (NSW, Kerala, CA). */
  state?: string;
  /** Postcode, ZIP, or PIN. */
  postalCode?: string;
  country: string;
  address: string;
  phone: string;
  phoneCountryCode?: string;
  /** Host-pinned GPS for Nearby origin and local matching. */
  geo?: { lat: number; lng: number };
  /** Coordinates alias for geo */
  coordinates?: { lat: number; lng: number };
  whatsapp: string;
  wifi: {
    network: string;
    password: string;
    speed: string;
  };
  checkIn: string;
  checkOut: string;
  breakfast: {
    hours: string;
    location: string;
    type: string;
    price: string;
  };
  facilities: FacilityItem[];
  roomTypes?: RoomType[];
  roomsCount?: number;
  status?: "active" | "trial" | "suspended";
  ownerEmail?: string;
  /** Firebase Auth UID of the organisation that owns this property. */
  ownerId?: string;
  /** Host and staff UIDs that may manage this property. Authoritative with custom claims. */
  members?: Record<string, PropertyMemberRole>;
  monthlyRevenue?: number;
  plan?: "Starter" | "Professional" | "Enterprise";
  heroImage?: string;
  galleryImages?: string[];
  rating?: number;
  reviewsCount?: number;
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewsCount?: number;
  googleReviewUrl?: string;
  claimedByOwner?: boolean;
  startingPrice?: number;
  originalPrice?: number;
  inclusions?: string[];
  badge?: string;
  cancellationPolicy?: string;
  /** Public vanity handle (slug). Separate from opaque property id. */
  handle?: string;
  /** Alias of handle for older docs. */
  slug?: string;
  /** token → human room number. Prefer resolving guest ?r= from this map. */
  roomTokens?: Record<string, string>;
  /** Default lobby / entrance marker id for /q/{markerId}. */
  lobbyMarkerId?: string;
  /** Slugified city for vanity URLs. */
  citySlug?: string;
  /** `${citySlug}/${handle}` unique vanity key. */
  vanityKey?: string;
  /** Nearby precinct this property belongs to (e.g. the-rocks). */
  precinctId?: string;
  /** Precinct place ids the host wants guests to see first. */
  recommendedPlaceIds?: string[];
  /**
   * Host opt-in to show same-trade rivals on Nearby.
   * Default false for hotels/venues. Street/precinct markers ignore this.
   */
  allowCompetitors?: boolean;
  /** Direct outbound booking engine or hotel website URL */
  bookingUrl?: string;
  /** Outbound action label (e.g. "Book Direct", "Book Stay", "Reserve on Hotel Site") */
  bookingLabel?: string;
  /** Estimated average booking / stay value in local currency (e.g. $320) for demand attribution calculations */
  avgBookingValue?: number;
  /** Room occupancy and housekeeping statuses from Property Management System (PMS) */
  roomStatuses?: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">;
  /** ISO time the host last saved or confirmed live Wi-Fi. */
  wifiUpdatedAt?: string;
  /** ISO time the host last confirmed check-in, breakfast, or facility hours. */
  hoursVerifiedAt?: string;
}

export interface FacilityItem {
  id?: string;
  name: string;
  hours: string;
  floor: string;
  details?: string;
  description?: string;
  status?: string;
  icon: string;
}

export interface RoomType {
  id: string;
  name: string;
  category: "Standard" | "Deluxe" | "Suite" | "Penthouse" | "Villa";
  capacity: number;
  sizeSqm?: number;
  bedConfig: string;
  totalRooms: number;
  startingPrice?: number;
  features: string[];
  roomNumbers?: string[];
}

export type UserRole = "super_admin" | "host_admin" | "staff" | "guest";
export type PropertyMemberRole = "host_admin" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  propertyIds?: string[];
  createdAt?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  photoURL?: string;
}

export interface MenuItem {
  id: string;
  propertyId?: string;
  name: string;
  category: "Starters" | "Mains" | "Desserts" | "Drinks" | "Breakfast" | "Late Night";
  price: number;
  description: string;
  dietary?: string[];
  popular?: boolean;
  available?: boolean;
}

export interface LocalPlace {
  id: string;
  propertyId?: string;
  name: string;
  category: "Food & Drink" | "Sights & Culture" | "Coffee" | "Nightlife" | "Nature & Walks" | "Family";
  distance: string;
  walkTime: string;
  priceLevel: "Free" | "$" | "$$" | "$$$";
  rating: number;
  whyGo: string;
  staffPick?: boolean;
  staffNote?: string;
  address: string;
  coordinates: { lat: number; lng: number };
  badge?: string;
}

export interface BookableExperience {
  id: string;
  propertyId?: string;
  title: string;
  category: string;
  price: number;
  duration: string;
  spotsLeft: number;
  description: string;
  included: string[];
  provider: string;
  imageAccent: string;
}

export interface UpsellItem {
  id: string;
  propertyId?: string;
  title: string;
  subtitle: string;
  price: number;
  badge: string;
  iconName: string;
  category: "stay" | "dining" | "transport" | "wellness";
}

export interface DealItem extends UpsellItem {
  originalPrice?: number;
  discountBadge?: string;
  active?: boolean;
  expiresAt?: string;
  inventoryLimit?: number;
  soldCount?: number;
}

export interface StaffTicketActivity {
  id: string;
  ticketId: string;
  roomNumber: string;
  guestName: string;
  category: StaffTicket["category"];
  action: "created" | "in_progress" | "resolved" | "replied";
  status: StaffTicket["status"];
  actorName: string;
  actorRole?: string;
  timestamp: string;
  notes?: string;
}

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export const PRIORITY_CONFIG: Record<
  TicketPriority,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    dotColor: string;
    description: string;
  }
> = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    borderClass: "border-rose-400",
    dotColor: "bg-rose-500",
    description: "Requires immediate attention (safety, AC/heat failure, water leak)",
  },
  high: {
    label: "High",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    borderClass: "border-amber-300",
    dotColor: "bg-amber-500",
    description: "High priority (maintenance, lockout, luggage dispatch)",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    borderClass: "border-sky-300",
    dotColor: "bg-sky-500",
    description: "Standard guest inquiry, dining order, or late checkout",
  },
  low: {
    label: "Low",
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    borderClass: "border-stone-200",
    dotColor: "bg-stone-400",
    description: "Routine housekeeping or amenity request",
  },
};

export type StaffDutyStatus = "available" | "busy" | "on_break" | "off_shift";

export interface StaffPresence {
  id: string;
  name: string;
  role: string;
  status: StaffDutyStatus;
  statusNote?: string;
  updatedAt: string;
  propertyId?: string;
  avatar?: string;
  assignedRoom?: string;
}

export const STAFF_STATUS_CONFIG: Record<
  StaffDutyStatus,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
    ringColor: string;
    iconName: string;
    isAwayOrBusy: boolean;
  }
> = {
  available: {
    label: "Available",
    description: "On duty · Ready for guest requests",
    color: "emerald",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-800",
    borderColor: "border-emerald-300",
    dotColor: "bg-emerald-500",
    ringColor: "ring-emerald-400/30",
    iconName: "CheckCircle2",
    isAwayOrBusy: false,
  },
  busy: {
    label: "Busy",
    description: "Assisting guest or working on ticket",
    color: "orange",
    bgColor: "bg-orange-50",
    textColor: "text-orange-900",
    borderColor: "border-orange-300",
    dotColor: "bg-orange-500",
    ringColor: "ring-orange-400/30",
    iconName: "Clock",
    isAwayOrBusy: true,
  },
  on_break: {
    label: "On Break",
    description: "Temporarily away · Meal or scheduled rest",
    color: "amber",
    bgColor: "bg-amber-50",
    textColor: "text-amber-900",
    borderColor: "border-amber-300",
    dotColor: "bg-amber-500",
    ringColor: "ring-amber-400/30",
    iconName: "Coffee",
    isAwayOrBusy: true,
  },
  off_shift: {
    label: "Off Shift",
    description: "Off duty / Clocked out",
    color: "stone",
    bgColor: "bg-stone-100",
    textColor: "text-stone-700",
    borderColor: "border-stone-300",
    dotColor: "bg-stone-400",
    ringColor: "ring-stone-400/20",
    iconName: "Moon",
    isAwayOrBusy: true,
  },
};

export const INITIAL_STAFF_PRESENCE: StaffPresence[] = [
  {
    id: "staff-sarah",
    name: "Sarah Miller",
    role: "Duty Manager",
    status: "available",
    statusNote: "Stationed at front desk reception",
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    avatar: "SM",
    propertyId: "harbour-hotel",
  },
  {
    id: "staff-liam",
    name: "Liam O'Connor",
    role: "Concierge & Luggage",
    status: "busy",
    statusNote: "Handling luggage dispatch for Room 402 arrival",
    updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    avatar: "LO",
    assignedRoom: "402",
    propertyId: "harbour-hotel",
  },
  {
    id: "staff-elena",
    name: "Elena Rostova",
    role: "Housekeeping Lead",
    status: "on_break",
    statusNote: "Afternoon meal break · back at 2:45 PM",
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    avatar: "ER",
    propertyId: "harbour-hotel",
  },
  {
    id: "staff-marcus",
    name: "Marcus Vance",
    role: "Maintenance Engineer",
    status: "off_shift",
    statusNote: "Morning shift concluded · on-call for HVAC or plumbing",
    updatedAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    avatar: "MV",
    propertyId: "harbour-hotel",
  },
];

export function resolveTicketPriority(ticket: {
  priority?: TicketPriority;
  urgency?: "normal" | "urgent";
  category?: StaffTicket["category"] | string;
  details?: string;
}): TicketPriority {
  if (ticket.priority) return ticket.priority;
  if (ticket.urgency === "urgent") return "urgent";
  if (ticket.category === "maintenance") return "high";
  if (ticket.category === "late_checkout" || ticket.category === "dining") return "medium";
  if (ticket.category === "reception") return "medium";
  return "low";
}

export interface StaffInternalNote {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface StaffTicket {
  id: string;
  propertyId?: string;
  roomNumber: string;
  guestName: string;
  category: "reception" | "housekeeping" | "maintenance" | "dining" | "late_checkout";
  details: string;
  staffReply?: string;
  status: "pending" | "in_progress" | "resolved";
  createdAt: string;
  urgency: "normal" | "urgent";
  priority?: TicketPriority;
  resolvedBy?: string;
  resolvedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  activityLog?: StaffTicketActivity[];
  internalNotes?: StaffInternalNote[];
}

export interface TicketSlaStatus {
  isSlaBreached: boolean;
  hoursOpen: number;
  formattedDuration: string;
  slaWarningLabel: string;
}

/**
 * Calculates if an open or in_progress ticket has exceeded the 4-hour SLA response threshold.
 */
export function getTicketSlaStatus(ticket: StaffTicket): TicketSlaStatus {
  // If ticket is resolved, no SLA breach warning applies
  if (ticket.status === "resolved") {
    return {
      isSlaBreached: false,
      hoursOpen: 0,
      formattedDuration: "",
      slaWarningLabel: "",
    };
  }

  let hoursOpen = 0;
  const now = Date.now();

  // Attempt 1: Parse createdAt if it is an ISO or timestamp string
  if (ticket.createdAt) {
    const parsedMs = Date.parse(ticket.createdAt);
    if (!isNaN(parsedMs) && parsedMs > 0) {
      hoursOpen = Math.max(0, (now - parsedMs) / (1000 * 60 * 60));
    } else {
      // Attempt 2: Parse human relative strings such as "5 hours ago", "4.5h ago", "1 day ago", "yesterday"
      const str = ticket.createdAt.toLowerCase().trim();
      const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:days?|d)\s*ago/);
      if (dayMatch) {
        hoursOpen = parseFloat(dayMatch[1]) * 24;
      } else if (str.includes("yesterday")) {
        hoursOpen = 24;
      } else {
        const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\s*ago/);
        if (hourMatch) {
          hoursOpen = parseFloat(hourMatch[1]);
        } else {
          const minMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?|m)\s*ago/);
          if (minMatch) {
            hoursOpen = parseFloat(minMatch[1]) / 60;
          }
        }
      }
    }
  }

  // Attempt 3: If hoursOpen is still 0 and ticket has activityLog, inspect creation timestamp
  if (hoursOpen === 0 && ticket.activityLog && ticket.activityLog.length > 0) {
    const createAct =
      ticket.activityLog.find((a) => a.action === "created") || ticket.activityLog[ticket.activityLog.length - 1];
    if (createAct && createAct.timestamp) {
      const actMs = Date.parse(createAct.timestamp);
      if (!isNaN(actMs) && actMs > 0) {
        hoursOpen = Math.max(0, (now - actMs) / (1000 * 60 * 60));
      } else {
        const str = createAct.timestamp.toLowerCase();
        const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/);
        if (hourMatch) hoursOpen = parseFloat(hourMatch[1]);
        const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:days?|d)/);
        if (dayMatch) hoursOpen = parseFloat(dayMatch[1]) * 24;
      }
    }
  }

  const isSlaBreached = hoursOpen >= 4.0;
  let formattedDuration = "";
  if (hoursOpen >= 24) {
    const days = Math.floor(hoursOpen / 24);
    const remHours = Math.round(hoursOpen % 24);
    formattedDuration = remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  } else if (hoursOpen >= 1) {
    const wholeHours = Math.floor(hoursOpen);
    const mins = Math.round((hoursOpen - wholeHours) * 60);
    formattedDuration = mins > 0 ? `${wholeHours}h ${mins}m` : `${wholeHours}h`;
  } else {
    const mins = Math.round(hoursOpen * 60);
    formattedDuration = `${Math.max(1, mins)}m`;
  }

  return {
    isSlaBreached,
    hoursOpen: Math.round(hoursOpen * 10) / 10,
    formattedDuration,
    slaWarningLabel: `Open for ${formattedDuration} (>4h SLA Breach Warning)`,
  };
}

export interface ItineraryStop {
  time: string;
  title: string;
  duration: string;
  type: string;
  cost: string;
  description: string;
  weatherSensitive?: boolean;
  indoorAlternative?: {
    title: string;
    type: string;
    description: string;
  };
}

export const CURRENT_PROPERTY: PropertyInfo = {
  id: "harbour-hotel",
  name: "Harbour Hotel Sydney",
  tagline: "Your Boutique Sanctuary by the Rocks",
  destination: "Sydney Harbour",
  city: "Sydney",
  country: "Australia",
  kind: "hotel",
  handle: "harbour-hotel",
  slug: "harbour-hotel",
  citySlug: "sydney",
  vanityKey: "sydney/harbour-hotel",
  precinctId: "the-rocks",
  lobbyMarkerId: "97a4e8add3a8c668",
  ownerId: "seed-harbour-hotel",
  countryCode: "AU",
  state: "NSW",
  postalCode: "2000",
  address: "64 Argyle Street, The Rocks, NSW 2000",
  geo: { lat: -33.85955, lng: 151.20715 },
  coordinates: { lat: -33.85955, lng: 151.20715 },
  recommendedPlaceIds: [
    "fine-food-store",
    "little-marionette",
    "mca-cafe",
    "foundation-park",
    "first-fleet-park",
    "dawes-point",
    "mca",
    "argyle-cut",
    "pylon-lookout",
  ],
  phone: "+61 2 9251 4000",
  whatsapp: "+61 488 912 345",
  roomsCount: 84,
  roomTokens: { "tok-101-demo": "101" },
  status: "active",
  ownerEmail: "marcus@harbourhotelsydney.com.au",
  monthlyRevenue: 34200,
  plan: "Professional",
  heroImage: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
  galleryImages: [
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  ],
  rating: 4.94,
  reviewsCount: 148,
  googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
  googleRating: 4.9,
  googleReviewsCount: 148,
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
  claimedByOwner: true,
  startingPrice: 320,
  originalPrice: 380,
  bookingUrl: "https://www.harbourhotelsydney.com.au/reservations",
  bookingLabel: "Book Direct with Hotel",
  avgBookingValue: 320,
  badge: "Harbour Landmark · Top Rated",
  inclusions: [
    "Fast 250 Mbps Wi-Fi",
    "Rooftop Plunge Pool Access",
    "AirPal Self-Guided Rocks Audio Tour",
    "Complimentary Espresso & Tea",
  ],
  cancellationPolicy: "Free cancellation up to 48 hours before check-in",
  wifi: {
    network: "HarbourHotel_Guest",
    password: "",
    speed: "250 Mbps High-Speed Fibre",
  },
  checkIn: "2:00 PM",
  checkOut: "10:00 AM",
  breakfast: {
    hours: "6:30 AM – 10:30 AM",
    location: "Ground Floor Atrium Restaurant",
    type: "Artisan Buffet & Made-to-Order Hot Dishes",
    price: "$28 (or pre-book for $22)",
  },
  facilities: [
    {
      name: "Rooftop Plunge Pool",
      hours: "6:00 AM – 10:00 PM",
      floor: "Level 7",
      details: "Heated water, panoramic harbour & bridge views",
      icon: "Waves",
    },
    {
      name: "Fitness Centre & Sauna",
      hours: "24 Hours (Keycard Access)",
      floor: "Level 2",
      details: "Technogym cardio, free weights & eucalyptus sauna",
      icon: "Dumbbell",
    },
    {
      name: "The Rocks Cellar Bar",
      hours: "4:00 PM – 11:30 PM",
      floor: "Ground Floor",
      details: "Australian natural wines & craft cocktails",
      icon: "Wine",
    },
    {
      name: "Luggage Storage",
      hours: "24/7 Front Desk",
      floor: "Lobby",
      details: "Complimentary secure luggage holding pre-checkin & post-checkout",
      icon: "Luggage",
    },
    {
      name: "Guest Laundry & Steamer",
      hours: "7:00 AM – 9:00 PM",
      floor: "Level 3",
      details: "Self-service Miele washers & dryers, dry cleaning available",
      icon: "Shirt",
    },
  ],
  roomTypes: [
    {
      id: "deluxe-king",
      name: "Deluxe King Harbour View",
      category: "Deluxe",
      capacity: 2,
      sizeSqm: 38,
      bedConfig: "1 King Bed",
      totalRooms: 42,
      startingPrice: 320,
      features: ["Harbour & Bridge View", "Rain Shower", "Espresso Machine", "Smart TV"],
      roomNumbers: [
        "101",
        "102",
        "103",
        "104",
        "105",
        "106",
        "107",
        "108",
        "201",
        "202",
        "203",
        "204",
        "205",
        "206",
        "207",
        "208",
      ],
    },
    {
      id: "executive-suite",
      name: "Executive Sanctuary Suite",
      category: "Suite",
      capacity: 3,
      sizeSqm: 56,
      bedConfig: "1 King Bed + Lounge",
      totalRooms: 28,
      startingPrice: 480,
      features: ["Deep Soaking Tub", "Complimentary Mini-Bar", "Balcony", "Lounge Area"],
      roomNumbers: ["301", "302", "303", "304", "305", "401", "402", "403", "404", "405"],
    },
    {
      id: "penthouse-sky",
      name: "The Rocks Panoramic Penthouse",
      category: "Penthouse",
      capacity: 4,
      sizeSqm: 95,
      bedConfig: "2 King Bedrooms",
      totalRooms: 14,
      startingPrice: 850,
      features: ["Private Rooftop Terrace", "Full Kitchen", "Butler Service", "Unrestricted Skyline Views"],
      roomNumbers: ["501", "502", "503", "504", "505", "506", "507", "508"],
    },
  ],
  roomStatuses: {
    "402": "occupied",
    "312": "occupied",
    "104": "occupied",
    "201": "occupied",
    "305": "vacant",
    "108": "vacant",
    "204": "occupied",
    "101": "occupied",
    "102": "vacant",
    "103": "occupied",
    "202": "vacant",
    "203": "occupied",
    "301": "occupied",
    "302": "vacant",
    "401": "vacant",
    "501": "occupied",
  },
};

export const ALL_PROPERTIES: PropertyInfo[] = [
  CURRENT_PROPERTY,
  {
    id: "bondi-breeze-suites",
    name: "Bondi Breeze Boutique Suites",
    tagline: "Coastal Luxury & Ocean Panorama",
    destination: "Bondi Beach",
    city: "Bondi Beach",
    country: "Australia",
    address: "18 Campbell Parade, Bondi Beach, NSW 2026",
    phone: "+61 2 9130 8800",
    whatsapp: "+61 488 234 567",
    roomsCount: 28,
    status: "active",
    ownerEmail: "sophie@bondibreezesuites.com.au",
    monthlyRevenue: 18400,
    plan: "Starter",
    heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    ],
    rating: 4.88,
    reviewsCount: 96,
    startingPrice: 245,
    originalPrice: 295,
    badge: "Oceanfront · Surfer's Haven",
    inclusions: [
      "Free Surfboard & Wetsuit Vault",
      "Sunrise Rooftop Yoga",
      "Ultra-Fast 350 Mbps Wi-Fi",
      "Organic Breakfast Acai Bowl",
    ],
    cancellationPolicy: "Free cancellation up to 48 hours before check-in",
    wifi: {
      network: "BondiBreeze_UltraFast",
      password: "",
      speed: "350 Mbps Fibre",
    },
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    breakfast: {
      hours: "7:00 AM – 11:00 AM",
      location: "Ocean Deck Café",
      type: "Acai Bowls, Organic Sourdough & Specialty Coffee",
      price: "$24 per person",
    },
    facilities: [
      {
        name: "Surfboard & Wetsuit Vault",
        hours: "6:00 AM – 8:00 PM",
        floor: "Basement",
        details: "Complimentary custom foamies & beach cruiser bikes",
        icon: "Waves",
      },
      {
        name: "Rooftop Yoga Terrace",
        hours: "6:30 AM Sunrise Sessions",
        floor: "Level 4",
        details: "Mats and instructor included for all house guests",
        icon: "Sun",
      },
      {
        name: "Outdoor Saltwater Pool",
        hours: "7:00 AM – 9:00 PM",
        floor: "Grounds",
        details: "Heated year-round with coastal cabanas",
        icon: "Waves",
      },
    ],
    roomTypes: [
      {
        id: "ocean-studio",
        name: "Oceanfront Sunlit Studio",
        category: "Deluxe",
        capacity: 2,
        sizeSqm: 34,
        bedConfig: "1 King or 2 Singles",
        totalRooms: 16,
        startingPrice: 245,
        features: ["Pacific Ocean Views", "Private Sun Balcony", "Breville Espresso", "Beach Bag & Towels"],
      },
      {
        id: "bondi-suite",
        name: "Bondi Horizon Terrace Suite",
        category: "Suite",
        capacity: 3,
        sizeSqm: 52,
        bedConfig: "1 King Bed + Daybed",
        totalRooms: 12,
        startingPrice: 390,
        features: ["Wrap-Around Balcony", "Kitchenette", "Outdoor Dining", "Bose Sound System"],
      },
    ],
  },
  {
    id: "blue-mountains-lodge",
    name: "The Blue Mountains Heritage Lodge",
    tagline: "Eucalyptus Mist & Fireside Comfort",
    destination: "Blue Mountains",
    city: "Katoomba",
    country: "Australia",
    address: "42 Cliff Drive, Katoomba, NSW 2780",
    phone: "+61 2 4782 1100",
    whatsapp: "+61 488 789 012",
    roomsCount: 16,
    status: "active",
    ownerEmail: "edward@heritagebluemountains.com",
    monthlyRevenue: 9800,
    plan: "Starter",
    heroImage: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    ],
    rating: 4.96,
    reviewsCount: 112,
    startingPrice: 195,
    originalPrice: 240,
    badge: "Fireside Retreat · Nature Haven",
    inclusions: [
      "Cedar Wood Hot Tub Session",
      "Complimentary Port & Whiskey Tasting",
      "Gourmet Farmhouse Breakfast",
      "Starlink Satellite High-Speed Wi-Fi",
    ],
    cancellationPolicy: "Free cancellation up to 48 hours before check-in",
    wifi: {
      network: "HeritageLodge_Guest",
      password: "",
      speed: "150 Mbps Starlink",
    },
    checkIn: "2:00 PM",
    checkOut: "10:30 AM",
    breakfast: {
      hours: "7:30 AM – 10:00 AM",
      location: "The Great Hearth Dining Room",
      type: "Country Farmhouse Cooked Breakfast & Local Berry Compote",
      price: "$26 included in select rates",
    },
    facilities: [
      {
        name: "Library & Whiskey Lounge",
        hours: "12:00 PM – Midnight",
        floor: "Main Hall",
        details: "Log fireplace with over 80 single malt selections",
        icon: "BookOpen",
      },
      {
        name: "Cedar Wood Hot Tubs",
        hours: "8:00 AM – 10:00 PM",
        floor: "Garden Walk",
        details: "Private forest-view cedar spas bookable by the hour",
        icon: "Bath",
      },
    ],
    roomTypes: [
      {
        id: "fireside-room",
        name: "Heritage Fireside Suite",
        category: "Deluxe",
        capacity: 2,
        sizeSqm: 40,
        bedConfig: "1 King Four-Poster Bed",
        totalRooms: 10,
        startingPrice: 195,
        features: ["Wood-Burning Fireplace", "Clawfoot Bath", "Forest Panorama", "Wool Blankets & Slippers"],
      },
      {
        id: "valley-loft",
        name: "Jamison Valley View Loft",
        category: "Suite",
        capacity: 3,
        sizeSqm: 58,
        bedConfig: "1 King + 1 Queen Loft",
        totalRooms: 6,
        startingPrice: 310,
        features: ["Cathedral Ceilings", "Private Timber Deck", "Stargazing Skylight", "Full Tea Collection"],
      },
    ],
  },
  {
    id: "melbourne-laneway-suites",
    name: "Flinders Laneway Boutique Stays",
    tagline: "Culture, Espresso & Modern Urban Loft Living",
    destination: "Melbourne CBD",
    city: "Melbourne",
    country: "Australia",
    address: "142 Flinders Lane, Melbourne, VIC 3000",
    phone: "+61 3 9654 2200",
    whatsapp: "+61 488 345 678",
    roomsCount: 32,
    status: "active",
    ownerEmail: "stay@flinderslaneway.com.au",
    monthlyRevenue: 24500,
    plan: "Professional",
    heroImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
    ],
    rating: 4.91,
    reviewsCount: 134,
    startingPrice: 215,
    originalPrice: 260,
    badge: "Arts & Dining Hub · Downtown",
    inclusions: [
      "Complimentary Melbourne Specialty Roasters Coffee",
      "Rooftop Laneway Sunset Cinema Access",
      "High-Speed 400 Mbps Wi-Fi",
      "AirPal Curated Street Art Audio Guide",
    ],
    cancellationPolicy: "Free cancellation up to 48 hours before check-in",
    wifi: {
      network: "FlindersLaneway_Guest",
      password: "",
      speed: "400 Mbps Fibre",
    },
    checkIn: "2:00 PM",
    checkOut: "11:00 AM",
    breakfast: {
      hours: "7:00 AM – 11:30 AM",
      location: "The Roastery Ground Bar",
      type: "Artisan Croissants, Poached Eggs & Single-Origin Pour Over",
      price: "$22 per guest",
    },
    facilities: [
      {
        name: "Rooftop Cinema Lounge",
        hours: "6:00 PM – 11:00 PM",
        floor: "Level 6",
        details: "Nightly indie films, craft beers and deckchairs",
        icon: "Tv",
      },
      {
        name: "Laneway Espresso Bar",
        hours: "6:30 AM – 4:00 PM",
        floor: "Ground",
        details: "World-class baristas & fresh pastries",
        icon: "Coffee",
      },
    ],
    roomTypes: [
      {
        id: "laneway-loft",
        name: "Designer Industrial Loft",
        category: "Deluxe",
        capacity: 2,
        sizeSqm: 36,
        bedConfig: "1 King Bed",
        totalRooms: 20,
        startingPrice: 215,
        features: ["Exposed Brick", "Vinyl Record Player", "Smeg Appliances", "Dyson Supersonic"],
      },
      {
        id: "rooftop-studio",
        name: "Skyline Terrace Studio",
        category: "Suite",
        capacity: 2,
        sizeSqm: 48,
        bedConfig: "1 King Bed",
        totalRooms: 12,
        startingPrice: 340,
        features: ["City Skyline View", "Private Terrace", "Cocktail Station", "Custom Bath Salts"],
      },
    ],
  },
  {
    id: "byron-bay-sanctuary",
    name: "Cape Byron Coastal Eco-Sanctuary",
    tagline: "Sub-Tropical Lush Reserve & Ocean Sounds",
    destination: "Byron Bay",
    city: "Byron Bay",
    country: "Australia",
    address: "88 Lighthouse Road, Byron Bay, NSW 2481",
    phone: "+61 2 6685 9900",
    whatsapp: "+61 488 456 789",
    roomsCount: 20,
    status: "active",
    ownerEmail: "aloha@byronsanctuary.com.au",
    monthlyRevenue: 22000,
    plan: "Professional",
    heroImage: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    ],
    rating: 4.97,
    reviewsCount: 162,
    startingPrice: 265,
    originalPrice: 320,
    badge: "Eco-Luxury · Wellness Sanctuary",
    inclusions: [
      "Daily Morning Sound Bath & Meditation",
      "Private Rainforest Plunge Pool Access",
      "Organic Farm-to-Table Breakfast Basket",
      "Complimentary Electric Beach Cruiser Bikes",
    ],
    cancellationPolicy: "Free cancellation up to 48 hours before check-in",
    wifi: {
      network: "ByronSanctuary_Solar",
      password: "",
      speed: "200 Mbps Fibre",
    },
    checkIn: "2:00 PM",
    checkOut: "11:00 AM",
    breakfast: {
      hours: "7:00 AM – 10:30 AM",
      location: "Rainforest Pavilion",
      type: "Local Tropical Fruits, Cold-Pressed Juices & Artisan Sourdough",
      price: "$25 included",
    },
    facilities: [
      {
        name: "Rainforest Wellness Pavilion",
        hours: "7:00 AM – 7:00 PM",
        floor: "Grounds",
        details: "Sound healing, yoga mats, and herbal tea station",
        icon: "Heart",
      },
      {
        name: "Mineral Cold Plunge & Cedar Sauna",
        hours: "8:00 AM – 9:00 PM",
        floor: "Garden Path",
        details: "Electrolyte infusions and magnesium baths",
        icon: "Waves",
      },
    ],
    roomTypes: [
      {
        id: "garden-villa",
        name: "Rainforest Garden Pavilion Villa",
        category: "Villa",
        capacity: 2,
        sizeSqm: 50,
        bedConfig: "1 King Daybed & Master Bed",
        totalRooms: 12,
        startingPrice: 265,
        features: ["Outdoor Stone Bath", "Rainforest Canopy Views", "Organic Toiletries", "Hammock Terrace"],
      },
      {
        id: "lighthouse-suite",
        name: "Cape Panorama Ocean Suite",
        category: "Suite",
        capacity: 3,
        sizeSqm: 68,
        bedConfig: "1 King + Daybed",
        totalRooms: 8,
        startingPrice: 420,
        features: ["Ocean & Lighthouse View", "Private Sun Deck", "Outdoor Shower", "Complimentary Prosecco"],
      },
    ],
  },
  {
    id: "harbour-college",
    name: "Harbour College",
    tagline: "Residential College · University of Sydney",
    kind: "campus",
    destination: "Camperdown",
    city: "Sydney",
    country: "Australia",
    address: "1 College Crescent, Camperdown NSW 2050",
    phone: "+61 2 9351 3300",
    whatsapp: "+61 488 935 100",
    roomsCount: 140,
    status: "active",
    ownerEmail: "warden@harbourcollege.edu.au",
    monthlyRevenue: 42000,
    plan: "Enterprise",
    heroImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
    ],
    rating: 4.95,
    reviewsCount: 184,
    startingPrice: 180,
    originalPrice: 220,
    badge: "University Residence · Heritage Quad",
    inclusions: [
      "All Great Hall Meals Included",
      "24/7 Library & Acoustic Pod Access",
      "Ultra-Fast eduroam 1 Gbps Wi-Fi",
      "Basement Laundry & Night Safety Walks",
    ],
    cancellationPolicy: "Residential semester contract with flexible break leave",
    wifi: {
      network: "HarbourCollege_Eduroam",
      password: "",
      speed: "eduroam · 1 Gbps Fibre",
    },
    checkIn: "2:00 PM (Move-in Sunday)",
    checkOut: "10:00 AM (Term end)",
    breakfast: {
      hours: "7:00 AM – 9:30 AM (Sun 9:00–11:30 AM)",
      location: "Great Hall",
      type: "Full Hot Buffet, Halal & Vegetarian Stations, Barista Coffee",
      price: "Included for Residents",
    },
    facilities: [
      {
        id: "f-dining",
        name: "Great Hall Dining",
        floor: "Ground Floor",
        hours: "7:00 AM – 7:30 PM",
        status: "open",
        icon: "Utensils",
        description: "Catered dining with halal and dietary counters",
      },
      {
        id: "f-library",
        name: "College 24h Study Library",
        floor: "River Wing L1",
        hours: "24/7 Swipe Access",
        status: "open",
        icon: "BookOpen",
        description: "Silent study carrels, group desks and monitors",
      },
      {
        id: "f-pods",
        name: "Innovation Lab & Study Pods",
        floor: "Ground Floor Tech Block",
        hours: "6:00 AM – Midnight",
        status: "open",
        icon: "Laptop",
        description: "Soundproof pods with 4K screens & USB-C 100W",
      },
      {
        id: "f-laundry",
        name: "Resident Laundry Room",
        floor: "Basement River Wing",
        hours: "24/7",
        status: "open",
        icon: "Shirt",
        description: "4 Commercial Washers (free) & 4 Dryers ($2)",
      },
      {
        id: "f-gym",
        name: "USYD Sports & Fitness",
        floor: "Camperdown Centre",
        hours: "6:00 AM – 10:00 PM",
        status: "open",
        icon: "Dumbbell",
        description: "Olympic pool, gym & cardio suites on student membership",
      },
      {
        id: "f-security",
        name: "24/7 Campus Security & Safety Walks",
        floor: "Gatehouse",
        hours: "24/7",
        status: "open",
        icon: "Shield",
        description: "Safety patrols and night safety walks from Fisher Library",
      },
    ],
  },
];

export const DEMO_USERS: UserProfile[] = [
  {
    uid: "u-superadmin",
    email: "admin@airpal.me",
    displayName: "Elena Vance (Platform Director)",
    role: "super_admin",
    propertyIds: ["harbour-hotel", "bondi-breeze-suites", "blue-mountains-lodge"],
    createdAt: "2026-01-10",
  },
  {
    uid: "u-host",
    email: "host@harbourhotel.com.au",
    displayName: "Marcus Sterling (Harbour Hotel Owner)",
    role: "host_admin",
    propertyIds: ["harbour-hotel"],
    createdAt: "2026-02-01",
  },
  {
    uid: "u-staff",
    email: "staff@harbourhotel.com.au",
    displayName: "Liam Chen (Front Desk Duty Manager)",
    role: "staff",
    propertyIds: ["harbour-hotel"],
    createdAt: "2026-02-15",
  },
  {
    uid: "u-guest",
    email: "guest@airpal.me",
    displayName: "Bibin Jose (Room 508)",
    role: "guest",
    propertyIds: ["harbour-hotel"],
    createdAt: "2026-03-01",
  },
];

export const DEFAULT_DEALS: DealItem[] = [
  {
    id: "deal_sunset_cruise",
    propertyId: "harbour-hotel",
    title: "Exclusive Sunset Sailing & Champagne Special",
    subtitle: "2-hour luxury catamaran cruise with free-flowing Veuve Clicquot and Sydney Rock Oysters.",
    price: 95,
    originalPrice: 140,
    discountBadge: "Save 32%",
    badge: "Limited Daily Deal",
    iconName: "Compass",
    category: "wellness",
    active: true,
    inventoryLimit: 6,
    soldCount: 4,
    expiresAt: "Tonight 6:00 PM",
  },
  {
    id: "deal_late_checkout",
    propertyId: "harbour-hotel",
    title: "VIP Guaranteed 4:00 PM Late Check-out",
    subtitle: "Keep your room and shower before your evening flight. Normal check-out is 10:00 AM.",
    price: 45,
    originalPrice: 65,
    discountBadge: "Save $20",
    badge: "Best Seller",
    iconName: "Clock",
    category: "stay",
    active: true,
    inventoryLimit: 10,
    soldCount: 8,
  },
  {
    id: "deal_artisan_breakfast",
    propertyId: "harbour-hotel",
    title: "Artisan Buffet & Barista Coffee Pre-book",
    subtitle: "Unlimited gourmet hot breakfast, Sonoma pastries, and specialty barista coffee.",
    price: 22,
    originalPrice: 28,
    discountBadge: "Save $6/day",
    badge: "Breakfast Deal",
    iconName: "Coffee",
    category: "dining",
    active: true,
    inventoryLimit: 50,
    soldCount: 34,
  },
  {
    id: "deal_airport_chauffeur",
    propertyId: "harbour-hotel",
    title: "Private Executive Airport Chauffeur",
    subtitle: "Mercedes E-Class sedan direct from hotel lobby to Sydney Airport terminal with luggage assist.",
    price: 65,
    originalPrice: 85,
    discountBadge: "Fixed Fare",
    badge: "Stress-Free",
    iconName: "Car",
    category: "transport",
    active: true,
    inventoryLimit: 8,
    soldCount: 3,
  },
  {
    id: "deal_spa_remedial",
    propertyId: "harbour-hotel",
    title: "60-Min In-Room Organic Remedial Massage",
    subtitle: "Certified therapist brings organic aromatic oils and heated stone treatment to your room.",
    price: 125,
    originalPrice: 160,
    discountBadge: "Save $35",
    badge: "Wellness Treat",
    iconName: "Sparkles",
    category: "wellness",
    active: true,
    inventoryLimit: 4,
    soldCount: 2,
  },
];

export const IN_ROOM_DINING_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Harbour Wagyu Smash Burger",
    category: "Mains",
    price: 26,
    description: "Double grass-fed patty, aged cheddar, pickles, smoked aioli on milk bun with truffle fries",
    dietary: ["Halal available"],
    popular: true,
  },
  {
    id: "m2",
    name: "Barramundi Fillet & Charred Greens",
    category: "Mains",
    price: 34,
    description: "Crispy skin Australian ocean barramundi, lemon myrtle butter, roasted asparagus",
    dietary: ["GF"],
    popular: true,
  },
  {
    id: "m3",
    name: "Artisan Sourdough & Whipped Ricotta",
    category: "Starters",
    price: 16,
    description: "Warm Sonoma sourdough, truffled honeycomb, sea salt flakes",
    dietary: ["V"],
  },
  {
    id: "m4",
    name: "Sydney Rock Oysters (Half Dozen)",
    category: "Starters",
    price: 28,
    description: "Freshly shucked with finger lime mignonette and ponzu",
    dietary: ["GF", "DF"],
  },
  {
    id: "m5",
    name: "Wild Mushroom & Truffle Pappardelle",
    category: "Mains",
    price: 28,
    description: "Hand-rolled pasta, pine mushrooms, shaved pecorino, thyme",
    dietary: ["V", "Vegetarian"],
  },
  {
    id: "m6",
    name: "Warm Valrhona Chocolate Lava Tart",
    category: "Desserts",
    price: 17,
    description: "70% dark molten center with vanilla bean gelato & macadamia crumb",
    dietary: ["V"],
  },
  {
    id: "m7",
    name: "Artisan Breakfast Bowl",
    category: "Breakfast",
    price: 22,
    description: "Organic poached eggs, avocado fan, Danish feta, blistered truss tomatoes on seeded sourdough",
    dietary: ["V", "GF available"],
  },
  {
    id: "m8",
    name: "Cold-Pressed Native Juice",
    category: "Drinks",
    price: 9,
    description: "Green apple, cucumber, kale, ginger and Davidson plum",
    dietary: ["Vegan", "GF"],
  },
];

export const LOCAL_PLACES: LocalPlace[] = [
  {
    id: "p1",
    name: "The Glenmore Rooftop",
    category: "Food & Drink",
    distance: "300m",
    walkTime: "4 min walk",
    priceLevel: "$$",
    rating: 4.8,
    whyGo:
      "Unmatched 180° vista of Sydney Opera House and Circular Quay without tourist trap markups. Arrive at 5:45 PM for golden hour.",
    staffPick: true,
    staffNote: "Our concierge Mark recommends the grilled halloumi sliders and local Balter IPA.",
    address: "96 Cumberland St, The Rocks",
    coordinates: { lat: -33.8587, lng: 151.2076 },
    badge: "Best Sunset View",
  },
  {
    id: "p2",
    name: "Edition Coffee Roasters",
    category: "Coffee",
    distance: "650m",
    walkTime: "8 min walk",
    priceLevel: "$$",
    rating: 4.9,
    whyGo: "Nordic-Japanese inspired single-origin coffee and soufflé pancakes. Pure sanctuary away from the hustle.",
    staffPick: true,
    staffNote: "Try the El Fenix batch brew and matcha tiramisu.",
    address: "60 Darling Dr, Haymarket (or near Barangaroo branch)",
    coordinates: { lat: -33.864, lng: 151.201 },
    badge: "Staff Coffee Pick",
  },
  {
    id: "p3",
    name: "Spice Alley & Kensington St",
    category: "Food & Drink",
    distance: "1.8km",
    walkTime: "12 min light rail",
    priceLevel: "$",
    rating: 4.7,
    whyGo:
      "Hawker-style vibrant open-air laneway with Singaporean, Malaysian, Vietnamese and Thai stalls. Incredible flavours under $20.",
    staffPick: true,
    staffNote: "Kopitiam's roti canai and Alex Lee Kitchen's laksa are phenomenal.",
    address: "Kensington St, Chippendale",
    coordinates: { lat: -33.886, lng: 151.201 },
    badge: "Best Cheap Eats",
  },
  {
    id: "p4",
    name: "The Rocks Secret Historic Laneways",
    category: "Nature & Walks",
    distance: "100m",
    walkTime: "1 min walk",
    priceLevel: "Free",
    rating: 4.9,
    whyGo: "Cobblestone alleys dating back to 1788 with hidden sandstone stairwells, gas lamps, and ghost stories.",
    staffPick: true,
    staffNote: "Head down Foundation Park and Suez Canal alleyway right behind the hotel.",
    address: "Argyle Cut & Foundation Park",
    coordinates: { lat: -33.859, lng: 151.206 },
    badge: "Hidden Gem",
  },
  {
    id: "p5",
    name: "Museum of Contemporary Art (MCA)",
    category: "Sights & Culture",
    distance: "400m",
    walkTime: "5 min walk",
    priceLevel: "Free",
    rating: 4.7,
    whyGo:
      "World-class contemporary Australian & Indigenous art directly on the waterfront. Free entry to permanent galleries.",
    address: "140 George St, The Rocks",
    coordinates: { lat: -33.8598, lng: 151.209 },
    badge: "Rainy Day Hero",
  },
  {
    id: "p6",
    name: "Maybe Sammy Cocktail Bar",
    category: "Nightlife",
    distance: "450m",
    walkTime: "6 min walk",
    priceLevel: "$$$",
    rating: 4.9,
    whyGo:
      "Voted World's 50 Best Bars. 1950s Rat Pack glamour, theatrical mixology, and flamingo pink velvet banquettes.",
    staffPick: true,
    staffNote: "Book or arrive right at 4:30 PM for aperitivo hour miniature cocktails.",
    address: "115 Harrington St, The Rocks",
    coordinates: { lat: -33.861, lng: 151.207 },
    badge: "World's Top 50 Bars",
  },
];

export const BOOKABLE_EXPERIENCES: BookableExperience[] = [
  {
    id: "exp1",
    title: "Sydney Harbour Sunset Kayak Tour",
    category: "Adventure & Views",
    price: 54,
    duration: "90 mins",
    spotsLeft: 4,
    description:
      "Paddle under the Sydney Harbour Bridge as twilight bathes the Opera House in pink and gold. Guided by local marine experts.",
    included: [
      "Double kayak & paddle",
      "Life jacket",
      "Safety briefing",
      "High-res photos taken by guide",
      "Hot tea afterwards",
    ],
    provider: "Sydney Kayak Expeditions (AirPal Partner)",
    imageAccent: "sunset",
  },
  {
    id: "exp2",
    title: "The Rocks Secret Food & History Trail",
    category: "Food & Culture",
    price: 68,
    duration: "2.5 hours",
    spotsLeft: 6,
    description:
      "A culinary journey through 5 historic pubs and artisan eateries, tasting craft beer, Sydney rock oysters, and handmade chocolates.",
    included: ["5 food and drink tastings", "Expert historian guide", "Historic venue access", "Small group max 10"],
    provider: "Taste of Sydney",
    imageAccent: "food",
  },
  {
    id: "exp3",
    title: "Opera House Behind-the-Scenes Tour",
    category: "Culture",
    price: 45,
    duration: "60 mins",
    spotsLeft: 8,
    description:
      "Step inside the iconic sails, hear acoustic secrets, and visit dressing rooms where world legends prepared.",
    included: ["Fast-track entry", "Live audio headset", "Authorized heritage guide"],
    provider: "Sydney Opera House Trust",
    imageAccent: "culture",
  },
];

export const HOTEL_UPSELLS: UpsellItem[] = [
  {
    id: "up_late_checkout",
    title: "Late Check-out until 4:00 PM",
    subtitle: "Flight later today? Relax, shower, and keep your room until late afternoon.",
    price: 45,
    badge: "Popular Upsell",
    iconName: "Clock",
    category: "stay",
  },
  {
    id: "up_breakfast",
    title: "Artisan Breakfast Package",
    subtitle: "Unlimited gourmet buffet + barista flat white at the Ground Floor Atrium.",
    price: 22,
    badge: "Save $6 vs Walk-in",
    iconName: "Coffee",
    category: "dining",
  },
  {
    id: "up_airport_transfer",
    title: "Sydney Airport Private Chauffeur",
    subtitle: "Mercedes E-Class executive sedan direct from hotel lobby to terminal.",
    price: 65,
    badge: "Fixed Price · No Surge",
    iconName: "Car",
    category: "transport",
  },
  {
    id: "up_harbour_upgrade",
    title: "Room Upgrade to Opera View Suite",
    subtitle: "Direct unobstructed harbour balcony view with complimentary welcome champagne.",
    price: 85,
    badge: "Subject to Availability",
    iconName: "Sparkles",
    category: "stay",
  },
];

export const WHAT_TO_DO_NOW_RECOMMENDATIONS = {
  morning: [
    {
      id: "now_m1",
      title: "Harbour Bridge Viewpoint Walk",
      timeEstimate: "45 mins",
      cost: "Free",
      whyNow: "Crisp morning air, no tourist crowds, and golden light bouncing off the sails.",
      actionLabel: "Start Walking Route",
      category: "Nature",
    },
    {
      id: "now_m2",
      title: "Artisan Coffee at Edition Roasters",
      timeEstimate: "30 mins",
      cost: "$7",
      whyNow: "Fresh morning batch brew and warm soufflé pancakes 8 min away.",
      actionLabel: "View Menu & Directions",
      category: "Coffee",
    },
    {
      id: "now_m3",
      title: "Rocks Heritage Sandstone Trail",
      timeEstimate: "60 mins",
      cost: "Free",
      whyNow: "Quiet cobblestone alleys right behind the hotel before shops open.",
      actionLabel: "Open Audio Guide",
      category: "Culture",
    },
  ],
  afternoon: [
    {
      id: "now_a1",
      title: "Museum of Contemporary Art (MCA)",
      timeEstimate: "90 mins",
      cost: "Free Entry",
      whyNow: "Air-conditioned creative sanctuary 5 minutes away, featuring rooftop sculpture terrace.",
      actionLabel: "Get Walking Route",
      category: "Culture",
    },
    {
      id: "now_a2",
      title: "Chinatown & Spice Alley Lunch Trail",
      timeEstimate: "75 mins",
      cost: "$15–$20",
      whyNow: "Vibrant lunch rush with hot fresh laksa, dumplings, and iced teh tarik.",
      actionLabel: "See Hawker Stalls",
      category: "Food",
    },
    {
      id: "now_a3",
      title: "Royal Botanic Garden Foreshore Stroll",
      timeEstimate: "60 mins",
      cost: "Free",
      whyNow: "Shaded coastal path leading past Mrs Macquarie’s Chair with harbour breeze.",
      actionLabel: "Start Walk",
      category: "Nature",
    },
  ],
  evening: [
    {
      id: "now_e1",
      title: "Glenmore Rooftop Sunset Drinks",
      timeEstimate: "60 mins",
      cost: "$$",
      whyNow: "Sun begins dipping behind the bridge right now. 4 min walk from lobby.",
      actionLabel: "View Rooftop Guide",
      category: "Drinks",
    },
    {
      id: "now_e2",
      title: "Sydney Harbour Sunset Kayak",
      timeEstimate: "90 mins",
      cost: "$54",
      whyNow: "2 spots remaining for tonight's 6:00 PM harbour twilight paddle.",
      actionLabel: "Reserve Spot",
      category: "Adventure",
    },
    {
      id: "now_e3",
      title: "Maybe Sammy Cocktail Hour",
      timeEstimate: "45 mins",
      cost: "$$$",
      whyNow: "World's Top 50 bar just opened its doors. Perfect time before queues form.",
      actionLabel: "Get Directions",
      category: "Cocktails",
    },
  ],
};

export const INITIAL_STAFF_TICKETS: StaffTicket[] = [
  {
    id: "t-101",
    roomNumber: "508",
    guestName: "Bibin Jose",
    category: "maintenance",
    details: "Air conditioning in bedroom making a low humming rattle. Temperature stuck at 24°C.",
    status: "in_progress",
    createdAt: "15 mins ago",
    urgency: "urgent",
    priority: "urgent",
    updatedBy: "Dave K. (Engineering)",
    updatedAt: "10 mins ago",
    internalNotes: [
      {
        id: "note-101-1",
        text: "Dave inspected fan motor on Level 5 roof plant; replacement capacitor ordered from Pyrmont supplier.",
        author: "Sarah Miller (Duty Manager)",
        timestamp: "12 mins ago",
      },
    ],
    activityLog: [
      {
        id: "act-101-2",
        ticketId: "t-101",
        roomNumber: "508",
        guestName: "Bibin Jose",
        category: "maintenance",
        action: "in_progress",
        status: "in_progress",
        actorName: "Dave K. (Engineering)",
        actorRole: "Maintenance Engineer",
        timestamp: "10 mins ago",
        notes: "Started work on compressor valve and thermostat sensor.",
      },
      {
        id: "act-101-1",
        ticketId: "t-101",
        roomNumber: "508",
        guestName: "Bibin Jose",
        category: "maintenance",
        action: "created",
        status: "pending",
        actorName: "Bibin Jose",
        actorRole: "Guest (In-Room Companion)",
        timestamp: "15 mins ago",
        notes: "Submitted urgent maintenance request.",
      },
    ],
  },
  {
    id: "t-104",
    roomNumber: "402",
    guestName: "Elena Rostova",
    category: "reception",
    details: "Digital keycard reader flashing red; guest locked out outside room with luggage.",
    status: "pending",
    createdAt: "8 mins ago",
    urgency: "normal",
    priority: "high",
    activityLog: [
      {
        id: "act-104-1",
        ticketId: "t-104",
        roomNumber: "402",
        guestName: "Elena Rostova",
        category: "reception",
        action: "created",
        status: "pending",
        actorName: "Elena Rostova",
        actorRole: "Guest (In-Room Companion)",
        timestamp: "8 mins ago",
        notes: "Reported digital keycard lock out.",
      },
    ],
  },
  {
    id: "t-102",
    roomNumber: "312",
    guestName: "Sarah Jenkins",
    category: "late_checkout",
    details: "Requested late checkout until 3:00 PM for flight QF11.",
    status: "resolved",
    createdAt: "45 mins ago",
    urgency: "normal",
    priority: "medium",
    resolvedBy: "Sarah Miller (Duty Manager)",
    resolvedAt: "30 mins ago",
    staffReply: "Approved late checkout until 3:00 PM. Housekeeping notified.",
    activityLog: [
      {
        id: "act-102-3",
        ticketId: "t-102",
        roomNumber: "312",
        guestName: "Sarah Jenkins",
        category: "late_checkout",
        action: "resolved",
        status: "resolved",
        actorName: "Sarah Miller (Duty Manager)",
        actorRole: "Front Desk Duty Manager",
        timestamp: "30 mins ago",
        notes: "Marked as resolved after issuing revised digital room key pass.",
      },
      {
        id: "act-102-2",
        ticketId: "t-102",
        roomNumber: "312",
        guestName: "Sarah Jenkins",
        category: "late_checkout",
        action: "replied",
        status: "in_progress",
        actorName: "Sarah Miller (Duty Manager)",
        actorRole: "Front Desk Duty Manager",
        timestamp: "35 mins ago",
        notes: "Replied: 'Approved late checkout until 3:00 PM. Housekeeping notified.'",
      },
      {
        id: "act-102-1",
        ticketId: "t-102",
        roomNumber: "312",
        guestName: "Sarah Jenkins",
        category: "late_checkout",
        action: "created",
        status: "pending",
        actorName: "Sarah Jenkins",
        actorRole: "Guest (In-Room Companion)",
        timestamp: "45 mins ago",
        notes: "Requested late checkout for flight QF11.",
      },
    ],
  },
  {
    id: "t-103",
    roomNumber: "204",
    guestName: "Liam Evans",
    category: "housekeeping",
    details: "Extra feather pillows and hypoallergenic duvet requested.",
    status: "pending",
    createdAt: "Just now",
    urgency: "normal",
    priority: "low",
    activityLog: [
      {
        id: "act-103-1",
        ticketId: "t-103",
        roomNumber: "204",
        guestName: "Liam Evans",
        category: "housekeeping",
        action: "created",
        status: "pending",
        actorName: "Liam Evans",
        actorRole: "Guest (In-Room Companion)",
        timestamp: "Just now",
        notes: "Housekeeping request received.",
      },
    ],
  },
  {
    id: "t-105",
    roomNumber: "305",
    guestName: "David Chen",
    category: "maintenance",
    details: "Balcony sliding door track is jammed shut. Guest cannot lock the door or access outdoor terrace safely.",
    status: "in_progress",
    createdAt: "5 hours ago",
    urgency: "urgent",
    priority: "high",
    updatedBy: "Marcus Vance",
    updatedAt: "4 hours ago",
    internalNotes: [
      {
        id: "note-105-1",
        text: "Specialist glazier contractor contacted at 11:30 AM. Delayed in traffic crossing Harbour Bridge.",
        author: "Marcus Vance",
        timestamp: "4 hours ago",
      },
      {
        id: "note-105-2",
        text: "SLA threshold exceeded (>4h open). Duty manager notified. Concierge to deliver complimentary rooftop tasting voucher upon guest return.",
        author: "Sarah Miller (Duty Manager)",
        timestamp: "30 mins ago",
      },
    ],
    activityLog: [
      {
        id: "act-105-2",
        ticketId: "t-105",
        roomNumber: "305",
        guestName: "David Chen",
        category: "maintenance",
        action: "in_progress",
        status: "in_progress",
        actorName: "Marcus Vance",
        actorRole: "Maintenance Engineer",
        timestamp: "4 hours ago",
        notes: "Assessed sliding track mechanism. Awaiting replacement roller bearing.",
      },
      {
        id: "act-105-1",
        ticketId: "t-105",
        roomNumber: "305",
        guestName: "David Chen",
        category: "maintenance",
        action: "created",
        status: "pending",
        actorName: "David Chen",
        actorRole: "Guest (In-Room Companion)",
        timestamp: "5 hours ago",
        notes: "Submitted urgent door maintenance request.",
      },
    ],
  },
];

export const TRANSPORT_OPTIONS = [
  {
    id: "airport",
    title: "Airport transfer",
    detail: "Private chauffeur 35–45 min to SYD · $65 fixed",
    action: "Book transfer",
  },
  {
    id: "train",
    title: "Train & light rail",
    detail: "Circular Quay station 6 min walk · Opal card at hotel desk",
    action: "View routes",
  },
  {
    id: "ferry",
    title: "Harbour ferries",
    detail: "Manly, Taronga Zoo and Watsons Bay from Circular Quay",
    action: "Open timetable",
  },
  {
    id: "rideshare",
    title: "Taxi & rideshare",
    detail: "Uber, DiDi and 13cabs pickup at Argyle Street porte-cochère",
    action: "Request pickup",
  },
];

export const HOTEL_EVENTS = [
  {
    id: "ev1",
    time: "7:30 PM",
    date: "2026-09-15",
    title: "Rooftop film club",
    detail: "Under the stars on Level 7 · 8 spots left",
    price: "Free for in-house guests",
  },
  {
    id: "ev2",
    time: "5:00 PM",
    date: "2026-09-15",
    title: "Australian wine hour",
    detail: "The Rocks Cellar Bar · complimentary tasting flight",
    price: "Included",
  },
  {
    id: "ev3",
    time: "10:00 AM",
    date: "2026-09-16",
    title: "The Rocks walking tour",
    detail: "Meet in lobby · 75 minutes of hidden sandstone lanes",
    price: "$18",
  },
];

export const SAFETY_AND_EMERGENCY_DATA = {
  hotelEmergency: {
    frontDeskInternal: "Dial '9' on your in-room telephone",
    directEmergencyNumber: "+61 2 9251 4099",
    dutyManager24_7: "+61 488 999 111",
    assemblyPoint: "First Fleet Park (Green lawn directly opposite MCA on George St)",
    defibrillatorLocation: "Lobby Front Desk & Level 7 Pool Entry",
  },
  destinationEmergency: [
    {
      name: "Emergency Services (Police / Fire / Ambulance)",
      phone: "000",
      desc: "National emergency dialer in Australia",
    },
    { name: "Sydney Hospital & Eye Hospital (24/7 ER)", phone: "+61 2 9382 7111", desc: "8 Macquarie St (7 min taxi)" },
    { name: "The Rocks Police Station", phone: "+61 2 8220 6399", desc: "132 George St, The Rocks (300m walk)" },
    {
      name: "Late Night Chemist (Chemist Warehouse Circular Quay)",
      phone: "+61 2 9247 1827",
      desc: "Open until 9:00 PM (100 George St)",
    },
    {
      name: "Consular Services Direct",
      phone: "+61 2 6261 3305",
      desc: "Australian Government consular assistance for international travelers",
    },
  ],
};

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    welcome: "Welcome to",
    tagline: "Your intelligent guest & destination companion",
    askAirPal: "Ask AirPal",
    whatToDoNow: "What should I do now?",
    yourStay: "Your Stay",
    localDiscovery: "Local Discovery",
    experiences: "Experiences",
    hotelServices: "Services",
    emergency: "Safety & Emergency",
    wifiPassword: "Wi-Fi Password",
    copy: "Copy",
    copied: "Copied to clipboard!",
    reception: "Reception",
    housekeeping: "Housekeeping",
    dining: "Order Food",
    planMyTrip: "Plan My Trip",
    lateCheckout: "Late Check-out",
    book: "Book Now",
    callHotel: "Call Front Desk",
    familyMode: "Family Mode",
    seniorMode: "Senior Mode",
  },
  zh: {
    welcome: "欢迎来到",
    tagline: "您的智能酒店与目的地数字伴侣",
    askAirPal: "向 AirPal 提问",
    whatToDoNow: "我现在该做什么？",
    yourStay: "您的入住",
    localDiscovery: "当地探索",
    experiences: "体验项目",
    hotelServices: "酒店服务",
    emergency: "安全与紧急联系",
    wifiPassword: "Wi-Fi 密码",
    copy: "复制",
    copied: "已复制到剪贴板！",
    reception: "前台服务",
    housekeeping: "客房清洁",
    dining: "点餐服务",
    planMyTrip: "行程规划",
    lateCheckout: "延迟退房",
    book: "立即预订",
    callHotel: "致电前台",
    familyMode: "亲子模式",
    seniorMode: "长者关怀模式",
  },
  ja: {
    welcome: "ようこそ",
    tagline: "あなただけのスマート滞在＆街歩きコンパニオン",
    askAirPal: "AirPalに質問する",
    whatToDoNow: "今何をするべき？",
    yourStay: "ご滞在情報",
    localDiscovery: "ローカル体験",
    experiences: "アクティビティ",
    hotelServices: "ホテルサービス",
    emergency: "安全・緊急情報",
    wifiPassword: "Wi-Fi パスワード",
    copy: "コピー",
    copied: "コピーしました！",
    reception: "フロント",
    housekeeping: "ハウスキーピング",
    dining: "ルームサービス",
    planMyTrip: "旅行プラン作成",
    lateCheckout: "レイトチェックアウト",
    book: "予約する",
    callHotel: "フロントに電話",
    familyMode: "ファミリーモード",
    seniorMode: "シニアモード",
  },
  es: {
    welcome: "Bienvenido a",
    tagline: "Tu compañero digital de estancia y destino",
    askAirPal: "Preguntar a AirPal",
    whatToDoNow: "¿Qué debería hacer ahora?",
    yourStay: "Tu Estancia",
    localDiscovery: "Descubrimiento Local",
    experiences: "Experiencias",
    hotelServices: "Servicios del Hotel",
    emergency: "Seguridad y Emergencias",
    wifiPassword: "Clave Wi-Fi",
    copy: "Copiar",
    copied: "¡Copiado al portapapeles!",
    reception: "Recepción",
    housekeeping: "Limpieza",
    dining: "Pedir Comida",
    planMyTrip: "Planear Mi Viaje",
    lateCheckout: "Salida Tardía",
    book: "Reservar Ahora",
    callHotel: "Llamar a Recepción",
    familyMode: "Modo Familia",
    seniorMode: "Modo Senior",
  },
  fr: {
    welcome: "Bienvenue à",
    tagline: "Votre compagnon de séjour et de destination intelligent",
    askAirPal: "Demander à AirPal",
    whatToDoNow: "Que faire maintenant ?",
    yourStay: "Votre Séjour",
    localDiscovery: "Découvertes Locales",
    experiences: "Expériences",
    hotelServices: "Services de l'Hôtel",
    emergency: "Sécurité & Urgences",
    wifiPassword: "Mot de passe Wi-Fi",
    copy: "Copier",
    copied: "Copié dans le presse-papiers !",
    reception: "Réception",
    housekeeping: "Ménage",
    dining: "Commander à manger",
    planMyTrip: "Planifier mon séjour",
    lateCheckout: "Départ tardif",
    book: "Réserver",
    callHotel: "Appeler la réception",
    familyMode: "Mode Famille",
    seniorMode: "Mode Senior",
  },
  de: {
    welcome: "Willkommen im",
    tagline: "Ihr intelligenter Hotel- und Reisebegleiter",
    askAirPal: "AirPal fragen",
    whatToDoNow: "Was soll ich jetzt tun?",
    yourStay: "Ihr Aufenthalt",
    localDiscovery: "Lokale Entdeckungen",
    experiences: "Erlebnisse",
    hotelServices: "Hotelservices",
    emergency: "Sicherheit & Notfall",
    wifiPassword: "WLAN-Passwort",
    copy: "Kopieren",
    copied: "In die Zwischenablage kopiert!",
    reception: "Rezeption",
    housekeeping: "Zimmerservice",
    dining: "Essen bestellen",
    planMyTrip: "Trip planen",
    lateCheckout: "Später Check-out",
    book: "Jetzt buchen",
    callHotel: "Rezeption anrufen",
    familyMode: "Familienmodus",
    seniorMode: "Seniorenmodus",
  },
  hi: {
    welcome: "स्वागत है",
    tagline: "आपका व्यक्तिगत डिजिटल होटल और यात्रा साथी",
    askAirPal: "AirPal से पूछें",
    whatToDoNow: "मुझे अभी क्या करना चाहिए?",
    yourStay: "आपका प्रवास",
    localDiscovery: "स्थानीय खोज",
    experiences: "अनुभव और पर्यटन",
    hotelServices: "होटल सेवाएँ",
    emergency: "सुरक्षा और आपातकालीन",
    wifiPassword: "वाई-फ़ाई पासवर्ड",
    copy: "कॉपी करें",
    copied: "कॉपी कर लिया गया!",
    reception: "रिसेप्शन",
    housekeeping: "हाउसकीपिंग",
    dining: "खाना ऑर्डर करें",
    planMyTrip: "यात्रा योजना बनाएं",
    lateCheckout: "लेट चेक-आउट",
    book: "अभी बुक करें",
    callHotel: "होटल को कॉल करें",
    familyMode: "पारिवारिक मोड",
    seniorMode: "वरिष्ठ मोड",
  },
  ar: {
    welcome: "مرحباً بكم في",
    tagline: "رفيقك الذكي للإقامة واستكشاف المدينة",
    askAirPal: "اسأل AirPal",
    whatToDoNow: "ماذا يجب أن أفعل الآن؟",
    yourStay: "إقامتك",
    localDiscovery: "اكتشاف الأماكن المحلية",
    experiences: "التجارب والأنشطة",
    hotelServices: "خدمات الفندق",
    emergency: "الأمان والطوارئ",
    wifiPassword: "كلمة سر الواي فاي",
    copy: "نسخ",
    copied: "تم النسخ!",
    reception: "الاستقبال",
    housekeeping: "خدمة الغرف",
    dining: "طلب الطعام",
    planMyTrip: "خطط لرحلتي",
    lateCheckout: "تسجيل خروج متأخر",
    book: "احجز الآن",
    callHotel: "اتصال بالاستقبال",
    familyMode: "الوضع العائلي",
    seniorMode: "وضع كبار السن",
  },
};

export type PartnerCategory =
  | "restaurant"
  | "bar"
  | "club"
  | "shop"
  | "money_exchange"
  | "massage"
  | "hospital"
  | "laundry"
  | "museum_art"
  | "resort_service";

export interface CategoryMeta {
  id: PartnerCategory;
  label: string;
  iconName: string;
  badgeTone: string;
  description: string;
}

export const PARTNER_CATEGORIES: CategoryMeta[] = [
  {
    id: "museum_art",
    label: "Museums & Art Galleries",
    iconName: "Landmark",
    badgeTone: "bg-violet-50 text-violet-700 border-violet-200",
    description: "Waterfront museums, contemporary galleries & cultural exhibitions",
  },
  {
    id: "restaurant",
    label: "Restaurants & Dining",
    iconName: "Utensils",
    badgeTone: "bg-orange-50 text-orange-700 border-orange-200",
    description: "Cafes, fine dining, quick bites & local flavours",
  },
  {
    id: "bar",
    label: "Bars & Pubs",
    iconName: "Wine",
    badgeTone: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Craft cocktail lounges, historic pubs & wine cellars",
  },
  {
    id: "club",
    label: "Clubs & Nightlife",
    iconName: "Music",
    badgeTone: "bg-pink-50 text-pink-700 border-pink-200",
    description: "Late-night dance venues, DJs & live music halls",
  },
  {
    id: "shop",
    label: "Shops & Boutiques",
    iconName: "ShoppingBag",
    badgeTone: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Local artisan crafts, fashion, souvenirs & groceries",
  },
  {
    id: "money_exchange",
    label: "Money Exchange & ATMs",
    iconName: "Banknote",
    badgeTone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Foreign currency exchange, global ATMs & zero-fee conversion",
  },
  {
    id: "massage",
    label: "Massage & Wellness Spas",
    iconName: "Sparkles",
    badgeTone: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Deep tissue massage, organic day spas & reflexology",
  },
  {
    id: "hospital",
    label: "Hospitals & Medical Clinics",
    iconName: "Cross",
    badgeTone: "bg-red-50 text-red-700 border-red-200",
    description: "24/7 Emergency centres, travel doctors & pharmacies",
  },
  {
    id: "laundry",
    label: "Laundromats & Dry Cleaning",
    iconName: "Shirt",
    badgeTone: "bg-sky-50 text-sky-700 border-sky-200",
    description: "Express wash & fold, self-service laundromats & room valet",
  },
  {
    id: "resort_service",
    label: "Hotel & Resort Services",
    iconName: "Compass",
    badgeTone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Airport transfers, luxury boat charters & tour concierge",
  },
];

export interface EventScheduleItem {
  time: string;
  title: string;
  location: string;
  status: "completed" | "happening_now" | "up_next" | "later";
  description?: string;
  duration?: string;
}

export interface ConnectedService {
  name: string;
  category: string;
  distance: string;
  perk?: string;
  actionLabel: string;
  actionTarget: string;
  iconName: string;
}

export interface EventWaypoint {
  id: string;
  name: string;
  zone: string;
  description: string;
  iconName: string;
  highlight?: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  venueName: string;
  venueAddress: string;
  category: "art_gallery" | "museum" | "hotel" | "culture" | "music" | "festival";
  categoryLabel: string;
  date: string;
  time: string;
  timeRange: string;
  price: string;
  distance: string;
  walkTime: string;
  heroImage: string;
  description: string;
  badge?: string;
  curatorNote?: string;
  checkInCount: number;
  // Where is What
  waypoints: EventWaypoint[];
  // What is Next
  schedule: EventScheduleItem[];
  // What Service is Available & Connected
  connectedServices: ConnectedService[];
}

export interface PartnerVenue {
  id: string;
  name: string;
  category: PartnerCategory;
  categoryLabel: string;
  destination: string;
  city: string;
  nearbyHotelIds: string[];
  distance: string;
  walkTime: string;
  address: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  hours: string;
  priceLevel: "$" | "$$" | "$$$" | "Emergency 24/7" | "Standard";
  rating: number;
  reviewsCount: number;
  heroImage: string;
  guestPerk?: string;
  description: string;
  tags: string[];
  coordinates: { lat: number; lng: number };
  status: "verified" | "pending" | "instant_active";
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewsCount?: number;
  googleReviewUrl?: string;
  claimedByOwner?: boolean;
  claimedAt?: string;
  claimedContact?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  createdAt?: string;
}

export const PARTNER_VENUES: PartnerVenue[] = [
  // RESTAURANTS
  {
    id: "cut-bar-grill",
    name: "The Cut Bar & Grill",
    category: "restaurant",
    categoryLabel: "Steakhouse & Fine Dining",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "150m",
    walkTime: "2 min walk",
    address: "16 Argyle St, The Rocks NSW 2000",
    phone: "+61 2 9259 5695",
    whatsapp: "+61 488 123 789",
    hours: "12:00 PM – 10:30 PM Daily",
    priceLevel: "$$$",
    rating: 4.8,
    reviewsCount: 342,
    heroImage: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Complimentary sommelier welcome flute with dinner reservation",
    description:
      "Historic subterranean heritage cellar serving premium dry-aged Australian beef and sustainable harbour seafood.",
    tags: ["Fine Dining", "AirPal Partner", "Wine Cellar", "Reservations Recommended"],
    coordinates: { lat: -33.8596, lng: 151.2081 },
    status: "verified",
  },
  {
    id: "pancakes-on-rocks",
    name: "Pancakes On The Rocks",
    category: "restaurant",
    categoryLabel: "Casual Dining & Ribs",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "210m",
    walkTime: "3 min walk",
    address: "4 Hickson Rd, The Rocks NSW 2000",
    phone: "+61 2 9247 6371",
    hours: "7:00 AM – Midnight Daily",
    priceLevel: "$$",
    rating: 4.6,
    reviewsCount: 890,
    heroImage: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80",
    guestPerk: "10% off bill when showing active AirPal Room Key",
    description:
      "Beloved Sydney institution famous for buttermilk pancakes, slow-cooked pork ribs, gourmet pizzas, and all-day breakfast.",
    tags: ["Family Friendly", "Late Night", "AirPal Discount", "All-Day Breakfast"],
    coordinates: { lat: -33.8587, lng: 151.2093 },
    status: "verified",
  },

  // BARS & PUBS
  {
    id: "doss-house",
    name: "The Doss House",
    category: "bar",
    categoryLabel: "Heritage Whisky Bar",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "110m",
    walkTime: "1 min walk",
    address: "77/79 George St, The Rocks NSW 2000",
    phone: "+61 2 9241 4055",
    hours: "4:00 PM – 1:00 AM Daily",
    priceLevel: "$$",
    rating: 4.9,
    reviewsCount: 420,
    heroImage: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Priority table seating for hotel guests before 8:00 PM",
    description:
      "Intimate underground heritage cocktail haven inside 1840s sandstone walls featuring over 150 whiskies and artisanal charcuterie boards.",
    tags: ["Cocktails", "Whisky Lounge", "Sandstone Cellar", "AirPal Partner"],
    coordinates: { lat: -33.8592, lng: 151.2088 },
    status: "verified",
  },

  // CLUBS & NIGHTLIFE
  {
    id: "argyle-nightclub",
    name: "The Argyle Nightclub & Courtyard",
    category: "club",
    categoryLabel: "Club & Live DJs",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "230m",
    walkTime: "3 min walk",
    address: "18 Argyle St, The Rocks NSW 2000",
    phone: "+61 2 9247 5500",
    hours: "Wed–Sun 5:00 PM – 3:00 AM",
    priceLevel: "$$",
    rating: 4.5,
    reviewsCount: 650,
    heroImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free express VIP door entry before 10:30 PM with Room Key pass",
    description:
      "Massive iconic dual-level sandstone nightclub with premier open-air cobblestone courtyard, resident international DJs, and VIP lounge.",
    tags: ["Nightclub", "Live DJs", "VIP Entry", "Outdoor Courtyard"],
    coordinates: { lat: -33.8598, lng: 151.2078 },
    status: "verified",
  },

  // SHOPS & BOUTIQUES
  {
    id: "rocks-opal-crafts",
    name: "The Rocks Artisan Opal & Indigenous Craft Guild",
    category: "shop",
    categoryLabel: "Australian Gems & Crafts",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "120m",
    walkTime: "2 min walk",
    address: "88 George St, The Rocks NSW 2000",
    phone: "+61 2 9241 1234",
    hours: "9:30 AM – 6:30 PM Daily",
    priceLevel: "$$",
    rating: 4.9,
    reviewsCount: 215,
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free gem authenticity certificate & 15% off certified Australian black opals",
    description:
      "Direct-from-miner Australian black opal jewellery, authentic Aboriginal paintings, eucalyptus oils, and bespoke handcrafted gifts.",
    tags: ["Tax-Free Tourist Shopping", "AirPal Partner", "Authentic Opals", "Gift Wrapping"],
    coordinates: { lat: -33.8589, lng: 151.2091 },
    status: "verified",
  },
  {
    id: "george-street-pantry",
    name: "George Street Gourmet Pantry & Travel Essentials",
    category: "shop",
    categoryLabel: "Convenience & Groceries",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "180m",
    walkTime: "2 min walk",
    address: "102 George St, The Rocks NSW 2000",
    phone: "+61 2 9251 7720",
    hours: "6:00 AM – Midnight Daily",
    priceLevel: "$",
    rating: 4.7,
    reviewsCount: 310,
    heroImage: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Complimentary reusable tote bag on purchases over $25",
    description:
      "Fresh cold drinks, Australian boutique snacks, adapters, sunscreen, toiletries, and organic grab-and-go deli snacks.",
    tags: ["Open Early & Late", "Travel Adapters", "Snacks & Drinks", "Organic Deli"],
    coordinates: { lat: -33.8595, lng: 151.2085 },
    status: "verified",
  },

  // MONEY EXCHANGE & ATMS
  {
    id: "travelex-rocks",
    name: "Travelex Global Currency Exchange & 24/7 ATM",
    category: "money_exchange",
    categoryLabel: "Foreign Exchange & ATM",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "210m",
    walkTime: "3 min walk",
    address: "107 George St, The Rocks NSW 2000",
    phone: "+61 2 9252 2800",
    hours: "ATM: 24/7 · Counter: 8:30 AM – 7:00 PM Daily",
    priceLevel: "Standard",
    rating: 4.8,
    reviewsCount: 180,
    heroImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Zero commission fee on FX exchange when showing AirPal Hotel Key",
    description:
      "Official foreign exchange booth with over 50 global currencies in cash stock, multi-currency cash cards, and secure 24/7 bank ATM.",
    tags: ["0% Commission for Guests", "50+ Currencies", "Secure 24/7 ATM", "AirPal Partner"],
    coordinates: { lat: -33.8597, lng: 151.209 },
    status: "verified",
  },

  // MASSAGE & WELLNESS SPAS
  {
    id: "endota-spa-rocks",
    name: "Endota Day Spa & Organic Wellness The Rocks",
    category: "massage",
    categoryLabel: "Day Spa & Massage",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "280m",
    walkTime: "4 min walk",
    address: "Shop 6, 66–70 Harrington St, The Rocks NSW 2000",
    phone: "+61 2 9241 1382",
    whatsapp: "+61 412 888 999",
    hours: "9:00 AM – 7:00 PM Daily",
    priceLevel: "$$$",
    rating: 4.9,
    reviewsCount: 360,
    heroImage: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    guestPerk: "$25 spa voucher toward any 60+ min remedial massage or facial treatment",
    description:
      "Peaceful haven offering remedial massage, organic soothing facials, native Australian botanical scrubs, and couple's relaxation suites.",
    tags: ["Remedial Massage", "Couples Suites", "AirPal Voucher", "Health Fund Rebates"],
    coordinates: { lat: -33.8601, lng: 151.2075 },
    status: "verified",
  },
  {
    id: "thai-healing-sanctuary",
    name: "Boutique Thai Healing Massage & Reflexology",
    category: "massage",
    categoryLabel: "Traditional Thai & Deep Tissue",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "190m",
    walkTime: "2 min walk",
    address: "32 Argyle St, The Rocks NSW 2000",
    phone: "+61 2 9247 2210",
    hours: "10:00 AM – 9:30 PM Daily",
    priceLevel: "$$",
    rating: 4.8,
    reviewsCount: 290,
    heroImage: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free 15-minute herbal foot steam with any 1-hour full body massage",
    description:
      "Authentic certified Thai practitioners specializing in deep tissue tension release, hot aromatic coconut oil, and travel fatigue relief.",
    tags: ["Deep Tissue", "Walk-ins Welcome", "Hot Oil Massage", "Foot Reflexology"],
    coordinates: { lat: -33.8604, lng: 151.2071 },
    status: "verified",
  },

  // HOSPITALS & CLINICS
  {
    id: "sydney-hospital-er",
    name: "Sydney Hospital & Sydney Eye Hospital Emergency",
    category: "hospital",
    categoryLabel: "Hospital & 24/7 Emergency",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "850m",
    walkTime: "10 min walk · 3 min drive",
    address: "8 Macquarie St, Sydney NSW 2000",
    phone: "+61 2 9382 7111",
    hours: "Open 24/7 / 365 Days",
    priceLevel: "Emergency 24/7",
    rating: 4.7,
    reviewsCount: 512,
    heroImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Direct hospital dispatch and coordination via AirPal Safe Button",
    description:
      "Premier state-run hospital providing comprehensive 24/7 emergency medical care, trauma centre, eye clinic, and specialist facilities.",
    tags: ["24/7 Emergency", "Public Hospital", "English & Multilingual", "Trauma Care"],
    coordinates: { lat: -33.8682, lng: 151.2131 },
    status: "verified",
  },
  {
    id: "rocks-medical-clinic",
    name: "The Rocks Medical & Travel Doctor Clinic",
    category: "hospital",
    categoryLabel: "GP & Travel Medicine",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "240m",
    walkTime: "3 min walk",
    address: "Suite 2, 40 Gloucester St, The Rocks NSW 2000",
    phone: "+61 2 9247 3888",
    hours: "Mon–Fri 8:00 AM – 6:00 PM · Sat 9:00 AM – 2:00 PM",
    priceLevel: "$$",
    rating: 4.9,
    reviewsCount: 165,
    heroImage: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Priority same-day appointment booking for registered hotel guests",
    description:
      "Accredited general practitioners offering non-emergency medical consultations, prescription refills, travel vaccines, and sickness certificates.",
    tags: ["Same-Day GP", "Prescription Refill", "Travel Doctor", "Travel Insurance Accepted"],
    coordinates: { lat: -33.8602, lng: 151.2069 },
    status: "verified",
  },

  // LAUNDRY & DRY CLEANING
  {
    id: "harbour-valet-laundry",
    name: "Harbour Express Valet Laundry & Dry Cleaners",
    category: "laundry",
    categoryLabel: "Express Wash & Dry Cleaning",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "290m",
    walkTime: "4 min walk",
    address: "24 Cumberland St, The Rocks NSW 2000",
    phone: "+61 2 9241 2980",
    whatsapp: "+61 499 555 123",
    hours: "7:00 AM – 7:00 PM Daily",
    priceLevel: "$$",
    rating: 4.9,
    reviewsCount: 220,
    heroImage: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free hotel room doorstep pickup & return on same-day wash & fold",
    description:
      "Fast 3-hour turnaround wash, tumble dry, and steam pressing. Eco-friendly organic detergents suitable for sensitive skin.",
    tags: ["Hotel Pickup Available", "3-Hour Express", "Organic Detergent", "AirPal Partner"],
    coordinates: { lat: -33.8599, lng: 151.2062 },
    status: "verified",
  },

  // HOTEL & RESORT SERVICES
  {
    id: "airpal-luxury-charter",
    name: "AirPal Luxury Yacht & Harbour Boat Charters",
    category: "resort_service",
    categoryLabel: "Private Boat Charters",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "300m",
    walkTime: "4 min walk to Pier 4",
    address: "Wharf 4, Circular Quay West, The Rocks NSW 2000",
    phone: "+61 2 9251 9900",
    whatsapp: "+61 400 333 777",
    hours: "8:00 AM – 9:00 PM Daily",
    priceLevel: "$$$",
    rating: 5.0,
    reviewsCount: 148,
    heroImage: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Complimentary bottle of Veuve Clicquot champagne on 2+ hour private cruises",
    description:
      "Luxury private catamaran and yacht charters on Sydney Harbour. Includes captain, crew, swim stops, and catering options.",
    tags: ["Private Charter", "Sydney Harbour Cruise", "AirPal Exclusive", "Champagne Included"],
    coordinates: { lat: -33.8582, lng: 151.2105 },
    status: "verified",
  },
  {
    id: "executive-airport-transfer",
    name: "Executive Airport EV & Chauffeured Concierge",
    category: "resort_service",
    categoryLabel: "Private Airport Transfers",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "0m",
    walkTime: "Hotel Lobby Pickup",
    address: "64 Argyle St, Hotel Concierge Desk, The Rocks NSW 2000",
    phone: "+61 2 9251 4000",
    whatsapp: "+61 488 912 345",
    hours: "24/7 On-Demand Service",
    priceLevel: "$$",
    rating: 4.9,
    reviewsCount: 390,
    heroImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Flat $85 AUD fixed rate to Sydney Kingsford Smith Airport (no surge pricing)",
    description:
      "Premium Mercedes and Tesla airport chauffeur service directly from the hotel lobby. Flight monitoring and luggage assistance included.",
    tags: ["Fixed Rate $85", "Zero Surge", "Lobby Doorstep", "EV Luxury Fleet"],
    coordinates: { lat: -33.8596, lng: 151.2081 },
    status: "verified",
  },

  // MUSEUMS & ART GALLERIES
  {
    id: "mca-australia",
    name: "Museum of Contemporary Art Australia (MCA)",
    category: "museum_art",
    categoryLabel: "Contemporary Art Museum",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "380m",
    walkTime: "4 min walk",
    address: "140 George St, The Rocks NSW 2000",
    phone: "+61 2 9245 2400",
    hours: "Tue–Sun 10:00 AM – 5:00 PM · Fri open late until 9:00 PM",
    priceLevel: "Standard",
    rating: 4.8,
    reviewsCount: 1240,
    heroImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free AirPal audio guide + 15% discount at MCA Rooftop Sculpture Cafe & Store",
    description:
      "Australia's premier museum dedicated to living artists. Features dramatic harbourfront sandstone and black glass architecture, cutting-edge Aboriginal and Torres Strait Islander art, and an iconic rooftop sculpture terrace overlooking Sydney Opera House.",
    tags: ["Free General Admission", "Rooftop Cafe & Bar", "Indigenous Art", "AirPal Partner"],
    coordinates: { lat: -33.8598, lng: 151.209 },
    status: "verified",
  },
  {
    id: "art-gallery-nsw",
    name: "Art Gallery of New South Wales & Sydney Modern",
    category: "museum_art",
    categoryLabel: "Fine Art & Modern Pavilion",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "1.2km",
    walkTime: "12 min scenic park walk",
    address: "Art Gallery Rd, The Domain, Sydney NSW 2000",
    phone: "+61 2 9225 1700",
    hours: "Daily 10:00 AM – 5:00 PM · Wed open late until 10:00 PM",
    priceLevel: "Standard",
    rating: 4.9,
    reviewsCount: 2150,
    heroImage: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Complimentary exhibition map, audio guide pass & priority cloakroom bag drop",
    description:
      "One of Australia's flagship art museums. Features the SANAA-designed Sydney Modern glass and stone pavilions, the subterranean WWII oil tank art installation space, and historic European, Asian, and First Nations Australian collections.",
    tags: ["Free General Admission", "Architecture Icon", "Aboriginal Art", "The Tank Soundscape"],
    coordinates: { lat: -33.8688, lng: 151.2173 },
    status: "verified",
  },
  {
    id: "rocks-discovery-museum",
    name: "The Rocks Discovery Museum",
    category: "museum_art",
    categoryLabel: "Heritage & Archaeological Museum",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "140m",
    walkTime: "2 min walk",
    address: "Kendall Ln, The Rocks NSW 2000",
    phone: "+61 2 9240 8680",
    hours: "Daily 10:00 AM – 5:00 PM",
    priceLevel: "Standard",
    rating: 4.7,
    reviewsCount: 380,
    heroImage: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free admission & interactive archaeological sandstone touch-screen tour",
    description:
      "Housed inside a restored 1850s sandstone warehouse. Traces Sydney from pre-1788 Gadigal Aboriginal times, early British convict colony settlement, maritime trade, through to the 1970s Green Bans that saved The Rocks.",
    tags: ["Free Admission", "Heritage Sandstone", "Interactive Exhibits", "History Trail"],
    coordinates: { lat: -33.8593, lng: 151.2084 },
    status: "verified",
  },
  {
    id: "customs-house-gallery",
    name: "Customs House Gallery & Sydney City Model",
    category: "museum_art",
    categoryLabel: "Civic Architecture & City Scale Model",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "420m",
    walkTime: "5 min walk",
    address: "31 Alfred St, Circular Quay NSW 2000",
    phone: "+61 2 9242 8555",
    hours: "Mon–Fri 8:00 AM – 7:00 PM · Sat–Sun 10:00 AM – 4:00 PM",
    priceLevel: "Standard",
    rating: 4.8,
    reviewsCount: 520,
    heroImage: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Free access to 1:500 Sydney glass-floor scale model + quiet reading room & Wi-Fi",
    description:
      "Historic Victorian landmark overlooking Circular Quay ferries. The grand atrium features an astonishing 1:500 scale architectural 3D model of central Sydney beneath a reinforced glass floor, plus contemporary photo exhibitions on upper levels.",
    tags: ["Free Entry", "Glass Floor Model", "Harbour History", "Quiet Workspaces"],
    coordinates: { lat: -33.8615, lng: 151.2105 },
    status: "verified",
  },
  {
    id: "sydney-observatory",
    name: "Sydney Observatory & Heritage Astronomy Museum",
    category: "museum_art",
    categoryLabel: "Astronomy & Science Museum",
    destination: "Sydney Harbour",
    city: "Sydney",
    nearbyHotelIds: ["harbour-hotel"],
    distance: "320m",
    walkTime: "4 min walk",
    address: "1003 Upper Fort St, Millers Point NSW 2000",
    phone: "+61 2 9217 0111",
    hours: "Wed–Sat 11:00 AM – 5:00 PM · Night Tours 7:00 PM & 8:30 PM",
    priceLevel: "Standard",
    rating: 4.9,
    reviewsCount: 680,
    heroImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
    guestPerk: "Priority standby tickets for evening telescope stargazing & harbour sunset lawn access",
    description:
      "Crown jewel perched on Observatory Hill with 360° sweeping panoramas of Sydney Harbour Bridge and Darling Harbour. Historic copper-domed telescopes, meteorological instruments, and romantic picnic lawns.",
    tags: ["Panoramic Views", "Telescope Viewing", "Astronomy", "Sunset Hill Picnic"],
    coordinates: { lat: -33.8596, lng: 151.2046 },
    status: "verified",
  },
];

export const RICH_EVENTS: EventItem[] = [
  {
    id: "ev-mca-friday",
    title: "MCA Friday Nights: Contemporary Art, Rooftop DJ & Sculpture Terrace",
    venueName: "Museum of Contemporary Art Australia (MCA)",
    venueAddress: "140 George St, The Rocks NSW 2000",
    category: "art_gallery",
    categoryLabel: "Art & Rooftop Music",
    date: "Tonight · Friday",
    time: "6:00 PM – 9:00 PM",
    timeRange: "Active Now · Free Entry",
    price: "Free Admission",
    distance: "380m",
    walkTime: "4 min walk",
    heroImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    description:
      "After-hours access to all contemporary galleries, live ambient vinyl DJ set on the Level 4 rooftop sculpture terrace overlooking Sydney Opera House, and curator-led spotlights.",
    badge: "Tonight's Highlight",
    curatorNote:
      "Arrive before 7:15 PM to catch sunset reflections on the Opera House sails from the rooftop sculpture deck.",
    checkInCount: 142,
    waypoints: [
      {
        id: "wp1",
        name: "Level 1: Aboriginal & Torres Strait Art",
        zone: "Gallery Wing A",
        description: "Ochre bark paintings and contemporary video installations",
        iconName: "Palette",
        highlight: true,
      },
      {
        id: "wp2",
        name: "Level 3: Global Sculpture Pavilion",
        zone: "Gallery Wing B",
        description: "Immersive kinetic installations and light corridors",
        iconName: "Layers",
      },
      {
        id: "wp3",
        name: "Level 4: Rooftop Bar & Sculpture Deck",
        zone: "Harbour Terrace",
        description: "Open-air cocktail bar, resident DJ, and unhindered Opera House views",
        iconName: "Wine",
        highlight: true,
      },
      {
        id: "wp4",
        name: "Ground Floor: Cloakroom & Bag Storage",
        zone: "Atrium",
        description: "Free secure luggage and umbrella storage for visitors",
        iconName: "Luggage",
      },
      {
        id: "wp5",
        name: "Accessible Lift & Braille Guides",
        zone: "Central Core",
        description: "Elevator servicing all floors and complimentary audio sets",
        iconName: "CheckCircle2",
      },
    ],
    schedule: [
      {
        time: "6:00 PM",
        title: "Doors Open & Complimentary Entry",
        location: "Ground Floor Atrium",
        status: "completed",
        description: "Gallery wings open with free admission",
      },
      {
        time: "6:45 PM",
        title: "Curator Spotlight: Voices in Sandstone",
        location: "Level 1 Gallery",
        status: "happening_now",
        duration: "30 mins",
        description: "Brief 15-minute introductory talk by senior curator",
      },
      {
        time: "7:30 PM",
        title: "Sunset Ambient Vinyl & Rooftop Drinks",
        location: "Level 4 Sculpture Terrace",
        status: "up_next",
        duration: "75 mins",
        description: "Chilled downtempo beats as city lights illuminate the harbour",
      },
      {
        time: "8:45 PM",
        title: "Interactive Light & Sound Projection Finale",
        location: "Harbour Façade",
        status: "later",
        duration: "15 mins",
        description: "Exterior light wall display synchronised to acoustic score",
      },
    ],
    connectedServices: [
      {
        name: "Travelex Currency Exchange & ATM",
        category: "Money Exchange",
        distance: "180m",
        perk: "0% commission FX & 24/7 ATM",
        actionLabel: "Directions",
        actionTarget: "Travelex",
        iconName: "Banknote",
      },
      {
        name: "The Cut Bar & Grill",
        category: "Dining",
        distance: "210m",
        perk: "10% off bill for event attendees",
        actionLabel: "Reserve Table",
        actionTarget: "The Cut",
        iconName: "Utensils",
      },
      {
        name: "Harbour Valet Laundry & Cloak",
        category: "Service",
        distance: "290m",
        perk: "Free event coat check",
        actionLabel: "View Cloak",
        actionTarget: "Harbour Valet",
        iconName: "Shirt",
      },
      {
        name: "The Rocks Medical Clinic",
        category: "Medical",
        distance: "240m",
        perk: "On-call travel doctor",
        actionLabel: "Emergency Call",
        actionTarget: "Rocks Medical",
        iconName: "Cross",
      },
      {
        name: "Executive Airport & Chauffeur EV",
        category: "Transport",
        distance: "120m",
        perk: "Wharf 4 Portico Pickup",
        actionLabel: "Book Chauffeur",
        actionTarget: "Chauffeur",
        iconName: "Car",
      },
    ],
  },
  {
    id: "ev-sydney-modern",
    title: "Sydney Modern Pavilion: The Underground Tank Acoustic Experience",
    venueName: "Art Gallery of New South Wales",
    venueAddress: "Art Gallery Rd, The Domain, Sydney NSW 2000",
    category: "art_gallery",
    categoryLabel: "Underground Acoustic Art",
    date: "Tomorrow · Saturday",
    time: "11:00 AM – 4:00 PM",
    timeRange: "Guided Slots Every Hour",
    price: "Free Registration",
    distance: "1.2km",
    walkTime: "12 min park walk",
    heroImage: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80",
    description:
      "Step 12 metres underground into a repurposed WWII naval oil tank transformed into an echoing subterranean temple of sound, shadow, and kinetic architectural projections.",
    badge: "Architectural Marvel",
    curatorNote: "The temperature underground is a constant 19°C. Light jacket recommended.",
    checkInCount: 98,
    waypoints: [
      {
        id: "wp-sm1",
        name: "The Tank Descent Stairway",
        zone: "Subterranean Level",
        description: "Echo chamber entry tunnel leading into the oil storage pillars",
        iconName: "Compass",
        highlight: true,
      },
      {
        id: "wp-sm2",
        name: "Naala Badu Welcome Plaza",
        zone: "Ground Level",
        description: "Glass entry pavilion designed by Pritzker prize winners SANAA",
        iconName: "Building2",
      },
      {
        id: "wp-sm3",
        name: "Yiribana First Nations Gallery",
        zone: "Lower Level 1",
        description: "Dedicated 1,100sqm space celebrating Indigenous Australian storytelling",
        iconName: "Palette",
        highlight: true,
      },
      {
        id: "wp-sm4",
        name: "Gallery Members & Visitor Lounge",
        zone: "Mezzanine",
        description: "Barista coffee bar, bookshop and device charging lockers",
        iconName: "Coffee",
      },
    ],
    schedule: [
      {
        time: "11:00 AM",
        title: "Morning Descent & Ambient Reverberation",
        location: "The Tank",
        status: "completed",
        description: "Acoustic spatial test with native eucalyptus flutes",
      },
      {
        time: "1:00 PM",
        title: "Artist In-Depth Lecture & Acoustic Walk",
        location: "The Tank Sound Chamber",
        status: "happening_now",
        duration: "45 mins",
        description: "Acoustic physics and sound sculpture walkthrough",
      },
      {
        time: "2:30 PM",
        title: "First Nations Weaving & Story Session",
        location: "Yiribana Gallery",
        status: "up_next",
        duration: "60 mins",
        description: "Traditional pandanus weaving circle open to all guests",
      },
      {
        time: "4:00 PM",
        title: "Twilight Native Garden Botanic Walk",
        location: "Art Garden Lawn",
        status: "later",
        duration: "30 mins",
        description: "Guided stroll through the rooftop endemic Sydney plants",
      },
    ],
    connectedServices: [
      {
        name: "Executive Airport & City EV",
        category: "Transport",
        distance: "Lobby Doorstep",
        perk: "$15 fixed hotel drop-off",
        actionLabel: "Request Car",
        actionTarget: "Executive Transfer",
        iconName: "Car",
      },
      {
        name: "Pancakes on the Rocks",
        category: "Dining",
        distance: "900m",
        perk: "10% off with AirPal Room Key",
        actionLabel: "View Menu",
        actionTarget: "Pancakes",
        iconName: "Utensils",
      },
      {
        name: "Sydney Hospital Emergency (24/7)",
        category: "Hospital",
        distance: "600m",
        perk: "Comprehensive Emergency Ward",
        actionLabel: "Directions",
        actionTarget: "Sydney Hospital",
        iconName: "Cross",
      },
    ],
  },
  {
    id: "ev-rocks-heritage",
    title: "The Rocks Sandstone & Aboriginal Art Discovery Walk",
    venueName: "The Rocks Discovery Museum",
    venueAddress: "Kendall Ln, The Rocks NSW 2000",
    category: "culture",
    categoryLabel: "Heritage & Living Culture",
    date: "Daily",
    time: "10:30 AM & 2:30 PM",
    timeRange: "75 Minutes · Small Group",
    price: "$18 (Free for Hotel In-House Guests)",
    distance: "140m",
    walkTime: "2 min walk",
    heroImage: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80",
    description:
      "Explore secret courtyard ruins, 1840s convict jail cells, and hidden cobblestone corridors. Meet local Aboriginal artists demonstrating ochre painting and traditional sandstone stonecarving.",
    badge: "AirPal Signature Walk",
    curatorNote:
      "Comfortable walking shoes recommended. Includes access to private archaeological courtyards normally locked to the public.",
    checkInCount: 230,
    waypoints: [
      {
        id: "wp-rh1",
        name: "Stop 1: Restored 1850s Sandstone Vault",
        zone: "Museum Entrance",
        description: "Original Gadigal fishing tools and early colonial pottery",
        iconName: "Landmark",
        highlight: true,
      },
      {
        id: "wp-rh2",
        name: "Stop 2: Foundation Park Ruins",
        zone: "Gloucester Alley",
        description: "Sunken brick floors and suspended iron table artwork",
        iconName: "Compass",
      },
      {
        id: "wp-rh3",
        name: "Stop 3: Artisan Opal & Craft Guild",
        zone: "George St Guild",
        description: "Live opal polishing and certified Indigenous wood carving",
        iconName: "ShoppingBag",
        highlight: true,
      },
      {
        id: "wp-rh4",
        name: "Stop 4: Dawes Point Bridge Overlook",
        zone: "Harbour Foreshore",
        description: "Direct view straight up into the steel arches of Sydney Harbour Bridge",
        iconName: "MapPin",
      },
    ],
    schedule: [
      {
        time: "10:30 AM",
        title: "Assemble at Sandstone Museum Foyer",
        location: "Kendall Lane",
        status: "completed",
        description: "Check in with guide & receive wireless audio receiver",
      },
      {
        time: "11:00 AM",
        title: "Foundation Park Archeological Secrets",
        location: "Foundation Park",
        status: "happening_now",
        duration: "30 mins",
        description: "Explore the sunken 1870s housing ruins",
      },
      {
        time: "11:35 AM",
        title: "Indigenous Ochre & Opal Demonstration",
        location: "Artisan Opal Guild",
        status: "up_next",
        duration: "20 mins",
        description: "Hands-on ochre painting and gemstone authenticity session",
      },
      {
        time: "12:00 PM",
        title: "Harbour Bridge Pylon Tasting & Finish",
        location: "Dawes Point Reserve",
        status: "later",
        duration: "15 mins",
        description: "Complimentary native tea and historic photo opportunity",
      },
    ],
    connectedServices: [
      {
        name: "The Rocks Artisan Opal Guild",
        category: "Shop",
        distance: "50m",
        perk: "15% off certified Australian black opals",
        actionLabel: "View Shop",
        actionTarget: "Opal Guild",
        iconName: "ShoppingBag",
      },
      {
        name: "The Doss House Whisky Bar",
        category: "Bar",
        distance: "80m",
        perk: "Complimentary artisanal snack with drink",
        actionLabel: "View Bar",
        actionTarget: "Doss House",
        iconName: "Wine",
      },
      {
        name: "Travelex Currency Exchange",
        category: "Money Exchange",
        distance: "150m",
        perk: "Zero fee currency trade",
        actionLabel: "Exchange",
        actionTarget: "Travelex",
        iconName: "Banknote",
      },
    ],
  },
  {
    id: "ev-stargazing-observatory",
    title: "Observatory Hill Night Sky & Southern Cross Telescope Tour",
    venueName: "Sydney Observatory",
    venueAddress: "1003 Upper Fort St, Millers Point NSW 2000",
    category: "culture",
    categoryLabel: "Stargazing & Heritage Science",
    date: "Tonight",
    time: "8:00 PM – 9:30 PM",
    timeRange: "Night Session · Clear Skies",
    price: "$24 · AirPal Guest Priority",
    distance: "320m",
    walkTime: "4 min walk up scenic stairs",
    heroImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
    description:
      "Peer through Australia's oldest functioning telescope dome. View Saturn's rings, the moons of Jupiter, and the glittering jewels of the Southern Cross under the guidance of resident astronomers.",
    badge: "Clear Sky Guaranteed",
    curatorNote: "Telescope dome is open to the night air. Bring a light layer.",
    checkInCount: 65,
    waypoints: [
      {
        id: "wp-so1",
        name: "Historic South Dome Telescope",
        zone: "Upper Level",
        description: "1874 brass refractor telescope focused on deep space clusters",
        iconName: "Sparkles",
        highlight: true,
      },
      {
        id: "wp-so2",
        name: "3D Space Planetarium Theatre",
        zone: "Pavilion",
        description: "Digital simulation of the Milky Way and Aboriginal star lore",
        iconName: "Layers",
      },
      {
        id: "wp-so3",
        name: "Observatory Lawn Panorama",
        zone: "Hilltop Lawn",
        description: "Best night-time view of Sydney Harbour Bridge and ferry lights",
        iconName: "MapPin",
        highlight: true,
      },
    ],
    schedule: [
      {
        time: "8:00 PM",
        title: "Welcome & Aboriginal Star Constellation Lore",
        location: "Planetarium Theatre",
        status: "completed",
        description: "The Celestial Emu in the Milky Way explained",
      },
      {
        time: "8:30 PM",
        title: "Live South Dome Telescope Viewing",
        location: "Dome 1",
        status: "happening_now",
        duration: "35 mins",
        description: "Direct optical viewing of Moon craters and Saturn's rings",
      },
      {
        time: "9:10 PM",
        title: "Harbour Lights Photography & Stargazing Wrap",
        location: "Observatory Hilltop",
        status: "up_next",
        duration: "20 mins",
        description: "Night skyline photo opportunity with astronomer Q&A",
      },
    ],
    connectedServices: [
      {
        name: "Harbour Hotel Lobby Concierge",
        category: "Hotel",
        distance: "320m",
        perk: "Warm herbal tea waiting in lobby",
        actionLabel: "Contact Desk",
        actionTarget: "Harbour Hotel",
        iconName: "Coffee",
      },
      {
        name: "The Cut Bar & Grill",
        category: "Dining",
        distance: "280m",
        perk: "Late night supper & cocktails",
        actionLabel: "View Menu",
        actionTarget: "The Cut",
        iconName: "Utensils",
      },
    ],
  },
];
