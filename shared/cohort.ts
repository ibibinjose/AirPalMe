/**
 * AirPal Cohort & Institution Domain Models (B2B2C Arrival Layer).
 *
 * Powers institution onboarding (residential colleges, PBSAs, hostels, hotels),
 * cohort-embedded hosted experiences, and institutional Belonging Analytics reports.
 */

export type InstitutionType = "college" | "pbsa" | "hotel" | "hostel" | "coliving" | "corp";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  type: InstitutionType;
  city: string;
  code: string;
  welcomeHeading: string;
  welcomeMessage: string;
  badgeEmoji: string;
  address?: string;
  residentCountEstimate?: number;
}

export interface CohortHostedExperience {
  id: string;
  institutionId: string;
  title: string;
  description: string;
  timeStr: string;
  location: string;
  hostName: string;
  rsvpsCount: number;
  category: "social" | "welcome" | "walk" | "food" | "study";
  isTonight?: boolean;
}

export interface BelongingMetrics {
  institutionId: string;
  institutionName: string;
  period: string;
  totalResidents: number;
  activeResidents: number;
  /** Share of cohort members who completed 1+ experience within 30 days of joining */
  activated30DayPercent: number;
  completedExperiences: number;
  avgExperiencesPerResident: number;
  hostedEventAttendanceRate: number;
  safetyIncidents: number;
  lastUpdated: string;
}

/** Pre-seeded flagship Sydney institution beachheads for Day 1 live cohorts. */
export const SEED_INSTITUTIONS: Institution[] = [
  {
    id: "scape-darling-square",
    name: "Scape Darling Square",
    shortName: "Scape",
    type: "pbsa",
    city: "Sydney",
    code: "SCAPE26",
    welcomeHeading: "Welcome to Scape Darling Square",
    welcomeMessage: "Connect with your fellow residents, discover weekly rooftop dinners, and explore Haymarket with your building.",
    badgeEmoji: "🏢",
    address: "41 Darling Dr, Haymarket NSW 2000",
    residentCountEstimate: 540,
  },
  {
    id: "st-pauls-usyd",
    name: "St Paul's College (USYD)",
    shortName: "St Paul's",
    type: "college",
    city: "Sydney",
    code: "STPAULS",
    welcomeHeading: "Welcome to St Paul's College",
    welcomeMessage: "Your college community hub. Join floor catchups, morning run clubs, and hall dinners in 60 seconds.",
    badgeEmoji: "🏛️",
    address: "9 City Rd, Camperdown NSW 2050",
    residentCountEstimate: 380,
  },
  {
    id: "generator-sydney",
    name: "Generator Sydney",
    shortName: "Generator",
    type: "hostel",
    city: "Sydney",
    code: "GENSYD",
    welcomeHeading: "Welcome to Generator Sydney",
    welcomeMessage: "Solo travel without the solo part. Rooftop drinks, Bondi coastal walks, and tonight's live gigs.",
    badgeEmoji: "✈️",
    address: "55 Wentworth Ave, Surry Hills NSW 2010",
    residentCountEstimate: 210,
  },
  {
    id: "sydney-uni-village",
    name: "Sydney University Village",
    shortName: "SUV",
    type: "pbsa",
    city: "Sydney",
    code: "SUV2026",
    welcomeHeading: "Welcome to Sydney Uni Village",
    welcomeMessage: "Meet your neighbors, form study groups, and find quick coffee walks between lectures.",
    badgeEmoji: "🎓",
    address: "Carillon Ave, Newtown NSW 2042",
    residentCountEstimate: 620,
  },
];

export const SEED_COHORT_EXPERIENCES: Record<string, CohortHostedExperience[]> = {
  "scape-darling-square": [
    {
      id: "scape-exp-1",
      institutionId: "scape-darling-square",
      title: "Rooftop Gelato & Board Games",
      description: "Meet your floor neighbors, grab free Messina gelato, and play Catan on the level 8 deck.",
      timeStr: "Tonight at 7:00 PM",
      location: "Level 8 Rooftop Lounge",
      hostName: "Scape ResLife Team",
      rsvpsCount: 28,
      category: "welcome",
      isTonight: true,
    },
    {
      id: "scape-exp-2",
      institutionId: "scape-darling-square",
      title: "Haymarket Cheap Eats Walk",
      description: "Quick 45-min stroll through Chinatown hidden noodle gems and bubble tea spots.",
      timeStr: "Tomorrow at 6:30 PM",
      location: "Scape Main Lobby",
      hostName: "Alex (Resident Ambassador)",
      rsvpsCount: 14,
      category: "food",
    },
  ],
  "st-pauls-usyd": [
    {
      id: "stpauls-exp-1",
      institutionId: "st-pauls-usyd",
      title: "Newtown Coffee Crawl",
      description: "Discover the best cafes on King St before mid-morning lectures.",
      timeStr: "Tomorrow at 9:00 AM",
      location: "College Quad Archway",
      hostName: "Sarah (Social Convener)",
      rsvpsCount: 19,
      category: "social",
    },
    {
      id: "stpauls-exp-2",
      institutionId: "st-pauls-usyd",
      title: "Evening Lawn Social & Acoustic Sessions",
      description: "Relaxed music, woodfired pizza, and meet incoming exchange students.",
      timeStr: "Tonight at 7:30 PM",
      location: "Warden's Lawn",
      hostName: "St Paul's House Committee",
      rsvpsCount: 42,
      category: "welcome",
      isTonight: true,
    },
  ],
  "generator-sydney": [
    {
      id: "gensyd-exp-1",
      institutionId: "generator-sydney",
      title: "Bondi to Bronte Sunset Stroll",
      description: "Catch the 380 bus together from Central and watch the golden hour over the cliffs.",
      timeStr: "Today at 4:30 PM",
      location: "Generator Reception",
      hostName: "Liam (Experience Host)",
      rsvpsCount: 16,
      category: "walk",
      isTonight: true,
    },
  ],
};

export function findInstitutionByCode(code: string): Institution | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return SEED_INSTITUTIONS.find((inst) => inst.code.toUpperCase() === clean);
}

export function findInstitutionById(id: string): Institution | undefined {
  if (!id) return undefined;
  return SEED_INSTITUTIONS.find((inst) => inst.id === id);
}

export function getBelongingReportData(institutionId: string): BelongingMetrics {
  const inst = findInstitutionById(institutionId) || SEED_INSTITUTIONS[0];
  const total = inst.residentCountEstimate || 500;
  const active = Math.round(total * 0.68);
  const completed = Math.round(active * 2.8);

  return {
    institutionId: inst.id,
    institutionName: inst.name,
    period: "October 2026",
    totalResidents: total,
    activeResidents: active,
    activated30DayPercent: 74, // 74% completed at least 1 real-world experience in 30 days
    completedExperiences: completed,
    avgExperiencesPerResident: 2.8,
    hostedEventAttendanceRate: 88,
    safetyIncidents: 0,
    lastUpdated: new Date().toISOString(),
  };
}
