/* global fetch, URLSearchParams */
/**
 * One-off admin write of the Harbour demo stay into Firestore.
 * Uses the logged-in Firebase CLI OAuth token (never printed).
 *
 *   node scripts/seed-harbour-stay.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";

const PROJECT = "airpalme-app";
const WIFI_PASSWORD = "HarbourGuest26";
const LOBBY_MARKER = "97a4e8add3a8c668";
const NOW = new Date().toISOString();

const FIREBASE_CLI_OAUTH = {
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "jEQXJAhgOVO_N7N5VHFCC-m2",
};

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

const harbour = {
  id: "harbour-hotel",
  name: "Harbour Hotel Sydney",
  tagline: "Your Boutique Sanctuary by the Rocks",
  kind: "hotel",
  destination: "Sydney Harbour",
  city: "Sydney",
  country: "Australia",
  countryCode: "AU",
  state: "NSW",
  postalCode: "2000",
  address: "64 Argyle Street, The Rocks, NSW 2000",
  geo: { lat: -33.85955, lng: 151.20715 },
  coordinates: { lat: -33.85955, lng: 151.20715 },
  phone: "+61 2 9251 4000",
  whatsapp: "+61 488 912 345",
  roomsCount: 84,
  roomTokens: { "tok-101-demo": "101" },
  status: "active",
  ownerEmail: "marcus@harbourhotelsydney.com.au",
  ownerId: "seed-harbour-hotel",
  handle: "harbour-hotel",
  slug: "harbour-hotel",
  citySlug: "sydney",
  vanityKey: "sydney/harbour-hotel",
  precinctId: "the-rocks",
  lobbyMarkerId: LOBBY_MARKER,
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
  claimedByOwner: true,
  startingPrice: 320,
  originalPrice: 380,
  bookingUrl: "https://www.harbourhotelsydney.com.au/reservations",
  bookingLabel: "Book Direct with Hotel",
  badge: "Harbour Landmark · Top Rated",
  inclusions: [
    "Fast 250 Mbps Wi-Fi",
    "Rooftop Plunge Pool Access",
    "AirPal Self-Guided Rocks Audio Tour",
    "Complimentary Espresso & Tea",
  ],
  cancellationPolicy: "Free cancellation up to 48 hours before check-in",
  wifi: { network: "HarbourHotel_Guest", password: "", speed: "250 Mbps High-Speed Fibre" },
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
  wifiUpdatedAt: NOW,
  updatedAt: NOW,
};

const menu = [
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

const markers = [
  {
    id: LOBBY_MARKER,
    kind: "lobby",
    status: "active",
    label: "Harbour Rocks Hotel · Lobby",
    geo: { lat: -33.85945, lng: 151.20835 },
    propertyId: "harbour-rocks-hotel-6cbbce",
    propertyName: "Harbour Rocks Hotel",
    precinctId: "the-rocks",
    city: "Sydney",
    citySlug: "sydney",
    handle: "harbour-rocks-hotel",
    propertyKind: "hotel",
    allowCompetitors: false,
    suppressCategories: ["stay"],
  },
  {
    id: "room-101-harbour-rocks",
    kind: "room",
    status: "active",
    label: "Room 101 · Heritage Suite",
    geo: { lat: -33.85945, lng: 151.20835 },
    propertyId: "harbour-rocks-hotel-6cbbce",
    propertyName: "Harbour Rocks Hotel",
    precinctId: "the-rocks",
    roomToken: "tok-101-demo",
    city: "Sydney",
    citySlug: "sydney",
    handle: "harbour-rocks-hotel",
    propertyKind: "hotel",
    allowCompetitors: false,
    suppressCategories: ["stay"],
  },
];

function variants() {
  const rocks = {
    ...harbour,
    id: "harbour-rocks-hotel-6cbbce",
    name: "Harbour Rocks Hotel",
    tagline: "Heritage stay in The Rocks",
    handle: "harbour-rocks-hotel",
    slug: "harbour-rocks-hotel",
    vanityKey: "sydney/harbour-rocks-hotel",
  };
  return [harbour, rocks];
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) fields[k] = firestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function docWrite(docPath, data) {
  return {
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/${docPath}`,
      fields: firestoreValue(stripUndefined(data)).mapValue.fields,
    },
  };
}

async function googleAccessToken() {
  const cfgPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const tokens = cfg?.tokens || {};
  if (tokens.access_token && Number(tokens.expires_at) > Date.now() + 60_000) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) {
    throw new Error("No Firebase CLI refresh token. Run `firebase login` first.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: FIREBASE_CLI_OAUTH.client_id,
      client_secret: FIREBASE_CLI_OAUTH.client_secret,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Could not refresh Google access token.");
  return json.access_token;
}

async function main() {
  const token = await googleAccessToken();
  const writes = [];

  for (const property of variants()) {
    writes.push(docWrite(`properties/${property.id}`, property));
    writes.push(
      docWrite(`properties/${property.id}/private/hostSecrets`, {
        wifiNetwork: property.wifi.network,
        wifiPassword: WIFI_PASSWORD,
        wifiUpdatedAt: NOW,
        updatedAt: NOW,
      }),
    );
    writes.push(
      docWrite(`properties/${property.id}/private/roomMap`, {
        byToken: property.roomTokens,
        byNumber: { 101: "tok-101-demo" },
        updatedAt: NOW,
      }),
    );
    writes.push(
      docWrite(`properties/${property.id}/qrCodes/tok-101-demo`, {
        type: "room",
        roomNumber: "101",
        roomToken: "tok-101-demo",
        propertyId: property.id,
        updatedAt: NOW,
      }),
    );
    for (const item of menu) {
      writes.push(docWrite(`properties/${property.id}/menu/${item.id}`, { ...item, propertyId: property.id, updatedAt: NOW }));
    }
  }

  for (const marker of markers) {
    writes.push(docWrite(`markers/${marker.id}`, { ...marker, updatedAt: NOW }));
  }

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore commit failed (${res.status}): ${body.slice(0, 500)}`);
  }
  console.log(
    "Wrote Harbour stays: harbour-hotel, harbour-rocks-hotel-6cbbce, lobby + room 101 markers, menu, Wi-Fi secrets.",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
