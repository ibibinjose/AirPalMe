export interface TourStop {
  id: string;
  name: string;
  address: string;
  minutesFromPrev: string;
  story: string;
  lat: number;
  lng: number;
}

export interface WalkingTour {
  id: string;
  title: string;
  city: string;
  tagline: string;
  duration: string;
  distance: string;
  from: string;
  language: string;
  stops: TourStop[];
}

export const WALKING_TOURS: WalkingTour[] = [
  {
    id: "rocks-harbour",
    title: "The Rocks to the sails",
    city: "Sydney",
    tagline: "A self-guided harbour walk from the hotel door — sandstone, ferry light, Opera House.",
    duration: "90 min",
    distance: "2.4 km",
    from: "Harbour Hotel",
    language: "English",
    stops: [
      {
        id: "s1",
        name: "Harbour Hotel door",
        address: "64 Argyle Street, The Rocks",
        minutesFromPrev: "Start",
        story: "You are on Cadigal land. The hotel sits above the old Argyle Cut — convict-cut sandstone from the 1840s. Walk downhill toward the cut. Look for the gas lamps.",
        lat: -33.85955,
        lng: 151.20715,
      },
      {
        id: "s2",
        name: "Argyle Cut & Foundation Park",
        address: "Argyle Street, The Rocks",
        minutesFromPrev: "2 min",
        story: "The Cut was blasted and chiselled by convicts to join Sydney Cove to Millers Point. Foundation Park on your left is a skeleton of vanished terrace houses — rooms you can walk through.",
        lat: -33.85905,
        lng: 151.2062,
      },
      {
        id: "s3",
        name: "Cadmans Cottage",
        address: "110 George Street, The Rocks",
        minutesFromPrev: "5 min",
        story: "Sydney’s oldest surviving dwelling, 1816. The water once lapped this wall. John Cadman was a convict coxswain who became superintendent of government boats.",
        lat: -33.85955,
        lng: 151.20935,
      },
      {
        id: "s4",
        name: "Circular Quay ferry board",
        address: "Circular Quay, Sydney",
        minutesFromPrev: "4 min",
        story: "Stand at the rail and watch the ferries. This was the landing of the First Fleet in 1788. Street musicians work the concourse — keep walking east toward the sails.",
        lat: -33.86115,
        lng: 151.2108,
      },
      {
        id: "s5",
        name: "Opera House forecourt",
        address: "Bennelong Point",
        minutesFromPrev: "8 min",
        story: "Utzon’s shells were a scandal and then a masterpiece. Walk the podium, not just the postcard. The steps are public. Sit facing the Bridge for a minute before the last stretch.",
        lat: -33.8573,
        lng: 151.2148,
      },
      {
        id: "s6",
        name: "Mrs Macquaries Chair",
        address: "Mrs Macquaries Rd",
        minutesFromPrev: "12 min",
        story: "Elizabeth Macquarie had this seat cut in 1810 so she could watch ships. Best unobstructed Opera House and Bridge pair in the city. Walk back along the water, or catch the 311 bus.",
        lat: -33.8594,
        lng: 151.2225,
      },
    ],
  },
  {
    id: "hobart-treasures",
    title: "Hidden Treasures of Hobart",
    city: "Hobart",
    tagline: "A self-guided shop walk of Tasmanian-made things — the FreeGuides idea, kept on AirPal.",
    duration: "75 min",
    distance: "1.6 km",
    from: "Salamanca Place",
    language: "English",
    stops: [
      {
        id: "h1",
        name: "Salamanca sandstone",
        address: "Salamanca Place, Hobart",
        minutesFromPrev: "Start",
        story: "Warehouses from the 1830s, now studios and Saturday market. Start at the water side and walk inland. Look up — the stone is from nearby quarries.",
        lat: -42.8869,
        lng: 147.3315,
      },
      {
        id: "h2",
        name: "Lily & Dot",
        address: "Hobart CBD",
        minutesFromPrev: "8 min",
        story: "Tasmanian-made pieces for babies and you. Small makers, wool, wood, and things you will actually pack. Ask what was made this week.",
        lat: -42.8826,
        lng: 147.3302,
      },
      {
        id: "h3",
        name: "Ware Bros Cutlery",
        address: "Hobart CBD",
        minutesFromPrev: "6 min",
        story: "Knives, steel, and the kind of shop that still knows its stock. A proper gift if someone cooks. Do not rush this stop.",
        lat: -42.8821,
        lng: 147.3288,
      },
      {
        id: "h4",
        name: "Cat & Fiddle Arcade",
        address: "Murray Street, Hobart",
        minutesFromPrev: "5 min",
        story: "A covered arcade of independents. Good for rain. Pick one object that could only come from Tasmania — leather, gin, or Huon pine.",
        lat: -42.8816,
        lng: 147.328,
      },
      {
        id: "h5",
        name: "Waterfront return",
        address: "Franklin Wharf, Hobart",
        minutesFromPrev: "10 min",
        story: "End on the working harbour. Fishing boats, kunanyi behind the city. Coffee on the wharf, then the walk is done.",
        lat: -42.8829,
        lng: 147.3334,
      },
    ],
  },
  {
    id: "kochi-fort-heritage",
    title: "Fort Kochi heritage loop",
    city: "Kochi",
    tagline: "Fishing nets, churches, and palace lanes — Kochi's layered port history on foot.",
    duration: "75 min",
    distance: "2.2 km",
    from: "Chinese Fishing Nets",
    language: "English",
    stops: [
      {
        id: "k1",
        name: "Chinese Fishing Nets",
        address: "Fort Kochi Beach, Kochi",
        minutesFromPrev: "Start",
        story: "Cantilever nets from the 1400s, still worked at dawn and dusk. Watch a crew lower one, then buy the catch at the auction beside the beach.",
        lat: 9.966,
        lng: 76.242,
      },
      {
        id: "k2",
        name: "St Francis Church",
        address: "Church Road, Fort Kochi",
        minutesFromPrev: "5 min",
        story: "India's oldest European church (1503). Vasco da Gama was buried here before his remains sailed home to Lisbon.",
        lat: 9.9659,
        lng: 76.2408,
      },
      {
        id: "k3",
        name: "Santa Cruz Basilica",
        address: "Bastion Street, Fort Kochi",
        minutesFromPrev: "4 min",
        story: "A pastel basilica with painted ceilings — pop in for the quiet, then follow the lanes toward Mattancherry.",
        lat: 9.9654,
        lng: 76.2428,
      },
      {
        id: "k4",
        name: "Mattancherry Palace",
        address: "Mattancherry, Kochi",
        minutesFromPrev: "20 min",
        story: "End at the Dutch palace — Kerala murals, royal palanquins, and spice-market streets all around. Tuk back or walk the waterfront home.",
        lat: 9.958,
        lng: 76.259,
      },
    ],
  },
  {
    id: "munnar-tea-trail",
    title: "Munnar tea trail",
    city: "Munnar",
    tagline: "Estate rows, a working tea factory, and the road up to Eravikulam.",
    duration: "2 hr",
    distance: "4 km",
    from: "Tea Gardens viewpoint",
    language: "English",
    stops: [
      {
        id: "m1",
        name: "Tea Gardens viewpoint",
        address: "Nadayar Road, Munnar",
        minutesFromPrev: "Start",
        story: "Morning light on the estate rows. Pick a line of bushes and follow it with your eyes to the valley floor — that is the walk.",
        lat: 10.093,
        lng: 77.063,
      },
      {
        id: "m2",
        name: "Tea factory visit",
        address: "Munnar town estates",
        minutesFromPrev: "25 min",
        story: "See withering, rolling, and grading in one noisy hall, then taste the grades you just watched being made.",
        lat: 10.086,
        lng: 77.058,
      },
      {
        id: "m3",
        name: "Eravikulam viewpoint road",
        address: "Eravikulam, Munnar",
        minutesFromPrev: "40 min",
        story: "Climb toward the national park gates. If the mist lifts you get shola grassland; if not, you get the mist, which is also the point.",
        lat: 10.146,
        lng: 77.072,
      },
    ],
  },
];

export function getWalkingTour(id: string) {
  return WALKING_TOURS.find((tour) => tour.id === id);
}

export function tourSharePath(id: string) {
  return `/tour/${id}`;
}

export type GuideKind = "hotel" | "local" | "campus";

export interface GuideProfile {
  id: string;
  kind: GuideKind;
  name: string;
  city: string;
  country: string;
  bio: string;
  initials: string;
  walks: string;
  followers: string;
  languages: string[];
  tourIds: string[];
  stayPath?: string;
  campusPath?: string;
}

export const GUIDE_PROFILES: GuideProfile[] = [
  {
    id: "harbour-hotel",
    kind: "hotel",
    name: "Harbour Hotel",
    city: "Sydney",
    country: "Australia",
    bio: "The Rocks door to the harbour. Wi-Fi, dining, and walks guests can start from the lobby QR — no app.",
    initials: "HH",
    walks: "1.8k",
    followers: "420",
    languages: ["English", "中文", "日本語"],
    tourIds: ["rocks-harbour"],
    stayPath: "/stay",
  },
  {
    id: "nisha-sydney",
    kind: "local",
    name: "Nisha",
    city: "Sydney",
    country: "Australia",
    bio: "Kerala-raised, Sydney-based. Shop walks, sadhya, and the quiet streets behind Circular Quay.",
    initials: "N",
    walks: "312",
    followers: "89",
    languages: ["English", "മലയാളം", "हिन्दी"],
    tourIds: ["rocks-harbour", "hobart-treasures"],
  },
  {
    id: "harbour-college",
    kind: "campus",
    name: "Harbour College",
    city: "Sydney",
    country: "Australia",
    bio: "Residential college at the University of Sydney. Room R12, Great Hall, and the city walk after house meeting.",
    initials: "HC",
    walks: "640",
    followers: "210",
    languages: ["English"],
    tourIds: ["rocks-harbour"],
    campusPath: "/campus",
  },
];

export function getGuideProfile(id: string) {
  return GUIDE_PROFILES.find((row) => row.id === id) || GUIDE_PROFILES[0];
}
