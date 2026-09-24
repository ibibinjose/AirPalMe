/**
 * AirPal Brain — Core Intelligence & Decision Engine
 *
 * Implements deterministic matching heuristics, natural language intent resolution,
 * context-aware plan synthesis, trust & reliability calculations, and data freshness
 * validation according to docs/AIRPAL_BRAIN.md and AGENTS.md.
 *
 * Principle: Intelligence is quiet, transparent, and grounded in real-world actions.
 * No opaque black-box scores — always provide clear, human-understandable reasons.
 *
 * Loop: Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat
 * North Star: Completed AirPal Experiences per active user.
 */

import type { PublicMate } from "@shared/companion";
import type { MateRequest } from "@shared/mate-request";
import { haversineMeters } from "./geo";

export type BrainCategory =
  | "coffee"
  | "food"
  | "culture"
  | "fitness"
  | "nature"
  | "nightlife"
  | "activity"
  | "exploration"
  | "shopping";

export type BrainTimeSlot = "morning" | "midday" | "afternoon" | "evening" | "night";

export type WeatherVibe = "sunny" | "rainy" | "cloudy" | "hot" | "evening";

export interface MatchReason {
  type: "distance" | "availability" | "interest" | "verification" | "language" | "budget";
  label: string;
  positive: boolean;
}

export interface MateMatchResult {
  mate: PublicMate;
  score: number; // 0 to 100
  reasons: MatchReason[];
  isAvailable: boolean;
  isVerified: boolean;
  matchedInterests: string[];
}

export interface PlanStopSuggestion {
  id: string;
  title: string;
  category: BrainCategory;
  timeSlot: BrainTimeSlot;
  suggestedDurationMins: number;
  reason: string;
  suggestedLocation?: string;
  isIndoor?: boolean;
}

export interface SolvedIntent {
  rawQuery: string;
  title: string;
  category: BrainCategory;
  suburb: string;
  timeSlot: BrainTimeSlot;
  mateKind: "social" | "activity" | "travel" | "experience";
  budget: "free" | "under-25" | "under-50" | "flexible";
  weatherPreference: "indoor" | "outdoor" | "flexible";
  confidence: number; // 0.0 - 1.0
  keywords: string[];
  stops: PlanStopSuggestion[];
  safetyTips: string[];
}

export interface TrustProfile {
  isIdentityVerified: boolean;
  isAirPalApproved: boolean;
  isReliable: boolean;
  isTopRated: boolean;
  completedExperiences: number;
  badges: string[];
}

export interface PlanHealthAssessment {
  healthScore: number; // 0 - 100
  stage: "draft" | "ready" | "confirmed" | "completed";
  checklist: {
    hasLocation: boolean;
    hasTime: boolean;
    hasMates: boolean;
    isSafePublicSpot: boolean;
  };
  nextBestAction: string;
  readyToExperience: boolean;
}

// Known Sydney suburbs for high-precision local intent resolution
const SYDNEY_SUBURBS = [
  "Surry Hills",
  "Bondi",
  "Newtown",
  "Circular Quay",
  "The Rocks",
  "Barangaroo",
  "Manly",
  "Darlinghurst",
  "Paddington",
  "CBD",
  "Marrickville",
  "Coogee",
  "Balmain",
  "Pyrmont",
  "Chinatown",
  "Alexandria",
  "Glebe",
  "Cronulla",
  "Parramatta",
  "Chatswood",
  "North Sydney",
];

// Activity mappings for keyword extraction
const ACTIVITY_KEYWORDS: Record<string, { category: BrainCategory; mateKind: SolvedIntent["mateKind"] }> = {
  coffee: { category: "coffee", mateKind: "social" },
  cafe: { category: "coffee", mateKind: "social" },
  espresso: { category: "coffee", mateKind: "social" },
  brunch: { category: "food", mateKind: "social" },
  lunch: { category: "food", mateKind: "social" },
  dinner: { category: "food", mateKind: "social" },
  dining: { category: "food", mateKind: "social" },
  food: { category: "food", mateKind: "social" },
  drinks: { category: "nightlife", mateKind: "social" },
  bar: { category: "nightlife", mateKind: "social" },
  cocktail: { category: "nightlife", mateKind: "social" },
  beer: { category: "nightlife", mateKind: "social" },
  pub: { category: "nightlife", mateKind: "social" },
  walk: { category: "nature", mateKind: "activity" },
  hike: { category: "nature", mateKind: "activity" },
  coastal: { category: "nature", mateKind: "activity" },
  beach: { category: "nature", mateKind: "activity" },
  run: { category: "fitness", mateKind: "activity" },
  running: { category: "fitness", mateKind: "activity" },
  gym: { category: "fitness", mateKind: "activity" },
  climbing: { category: "fitness", mateKind: "activity" },
  bouldering: { category: "fitness", mateKind: "activity" },
  art: { category: "culture", mateKind: "experience" },
  gallery: { category: "culture", mateKind: "experience" },
  museum: { category: "culture", mateKind: "experience" },
  music: { category: "nightlife", mateKind: "experience" },
  concert: { category: "nightlife", mateKind: "experience" },
  festival: { category: "culture", mateKind: "experience" },
  sightseeing: { category: "exploration", mateKind: "travel" },
  tour: { category: "exploration", mateKind: "travel" },
  explore: { category: "exploration", mateKind: "travel" },
  shopping: { category: "shopping", mateKind: "social" },
  markets: { category: "shopping", mateKind: "social" },
};

/**
 * Natural Language Intent Solver
 * Parses user free-form intent and synthesizes an actionable, multi-stop AirPal plan.
 */
export function solveAirPalIntent(
  query: string,
  options?: {
    weather?: WeatherVibe;
    userLocationSuburb?: string;
  },
): SolvedIntent {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  // 1. Detect Suburb
  let suburb = options?.userLocationSuburb || "Sydney CBD";
  for (const s of SYDNEY_SUBURBS) {
    if (lower.includes(s.toLowerCase())) {
      suburb = s;
      break;
    }
  }

  // 2. Detect Time Slot
  let timeSlot: BrainTimeSlot = "afternoon";
  if (lower.includes("morning") || lower.includes("breakfast") || lower.includes("sunrise") || lower.includes("am")) {
    timeSlot = "morning";
  } else if (lower.includes("lunch") || lower.includes("midday") || lower.includes("noon")) {
    timeSlot = "midday";
  } else if (lower.includes("afternoon") || lower.includes("sunset") || lower.includes("arvo")) {
    timeSlot = "afternoon";
  } else if (lower.includes("dinner") || lower.includes("evening") || lower.includes("dusk")) {
    timeSlot = "evening";
  } else if (lower.includes("night") || lower.includes("late") || lower.includes("club") || lower.includes("gig")) {
    timeSlot = "night";
  }

  // 3. Detect Category & Mate Kind with word boundary and query position priority
  let category: BrainCategory = "exploration";
  let mateKind: SolvedIntent["mateKind"] = "social";
  const matchedKeywords: string[] = [];
  let earliestPos = Number.POSITIVE_INFINITY;

  for (const [kw, meta] of Object.entries(ACTIVITY_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    const match = regex.exec(lower);
    if (match && match.index !== undefined) {
      matchedKeywords.push(kw);
      if (match.index < earliestPos) {
        earliestPos = match.index;
        category = meta.category;
        mateKind = meta.mateKind;
      }
    }
  }

  // 4. Detect Budget
  let budget: SolvedIntent["budget"] = "flexible";
  if (lower.includes("free") || lower.includes("$0") || lower.includes("zero cost")) {
    budget = "free";
  } else if (lower.includes("<$25") || lower.includes("under $25") || lower.includes("cheap") || lower.includes("budget")) {
    budget = "under-25";
  } else if (lower.includes("<$50") || lower.includes("under $50") || lower.includes("mid range")) {
    budget = "under-50";
  }

  // 5. Detect Weather preference
  const isRainy = options?.weather === "rainy" || lower.includes("rain") || lower.includes("indoor");
  const weatherPref: SolvedIntent["weatherPreference"] = isRainy
    ? "indoor"
    : category === "nature" || category === "fitness"
      ? "outdoor"
      : "flexible";

  // 6. Synthesize Multi-Stop Plan
  const stops = generateSmartPlanSuggestions(suburb, timeSlot, {
    category,
    weather: isRainy ? "rainy" : options?.weather || "sunny",
  });

  // 7. Generate Plan Title
  const cleanNoun = matchedKeywords[0] ? matchedKeywords[0].charAt(0).toUpperCase() + matchedKeywords[0].slice(1) : "Outing";
  const title = `${cleanNoun} in ${suburb}`;

  // 8. Confidence estimation
  let confidence = 0.6;
  if (matchedKeywords.length > 0) confidence += 0.2;
  if (SYDNEY_SUBURBS.some((s) => lower.includes(s.toLowerCase()))) confidence += 0.2;

  // 9. Safety tips for this specific plan
  const safetyTips = generateSafetyGuidance(category, timeSlot);

  return {
    rawQuery: raw,
    title,
    category,
    suburb,
    timeSlot,
    mateKind,
    budget,
    weatherPreference: weatherPref,
    confidence: Math.min(1.0, confidence),
    keywords: matchedKeywords,
    stops,
    safetyTips,
  };
}

/**
 * Generate context-aware plan sequence suggestions based on time of day, destination, and weather.
 */
export function generateSmartPlanSuggestions(
  destination: string,
  timeOfDay: BrainTimeSlot = "afternoon",
  context?: {
    category?: BrainCategory;
    weather?: WeatherVibe;
  },
): PlanStopSuggestion[] {
  const dest = destination.trim() || "Nearby";
  const isRainy = context?.weather === "rainy";

  if (isRainy) {
    return [
      {
        id: "indoor-haven",
        title: `Artisan Roastery & Lounge in ${dest}`,
        category: "coffee",
        timeSlot: timeOfDay,
        suggestedDurationMins: 60,
        reason: "Cozy sheltered spot with relaxed atmosphere and great coffee",
        suggestedLocation: dest,
        isIndoor: true,
      },
      {
        id: "indoor-culture",
        title: `Art Gallery, Museum or Heritage Market`,
        category: "culture",
        timeSlot: timeOfDay,
        suggestedDurationMins: 90,
        reason: "Immersive indoor exhibition away from the weather",
        suggestedLocation: dest,
        isIndoor: true,
      },
    ];
  }

  switch (timeOfDay) {
    case "morning":
      return [
        {
          id: "coffee-start",
          title: `Artisan Coffee & Light Bites in ${dest}`,
          category: "coffee",
          timeSlot: "morning",
          suggestedDurationMins: 45,
          reason: "Start the day with quality local brew and catch up",
          suggestedLocation: dest,
          isIndoor: false,
        },
        {
          id: "morning-walk",
          title: `Scenic Coastal or Park Walk`,
          category: "nature",
          timeSlot: "morning",
          suggestedDurationMins: 90,
          reason: "Fresh air and relaxed conversation before midday crowds",
          suggestedLocation: dest,
          isIndoor: false,
        },
      ];

    case "midday":
      return [
        {
          id: "casual-lunch",
          title: `Casual Dining & Brunch in ${dest}`,
          category: "food",
          timeSlot: "midday",
          suggestedDurationMins: 75,
          reason: "Vibrant lunch spot with good atmosphere",
          suggestedLocation: dest,
          isIndoor: false,
        },
        {
          id: "market-visit",
          title: `Local Markets or Gallery Exploration`,
          category: "culture",
          timeSlot: "midday",
          suggestedDurationMins: 60,
          reason: "Explore stalls, local craft, and open exhibitions",
          suggestedLocation: dest,
          isIndoor: true,
        },
      ];

    case "afternoon":
      return [
        {
          id: "afternoon-activity",
          title: `City Exploration & Highlights in ${dest}`,
          category: "activity",
          timeSlot: "afternoon",
          suggestedDurationMins: 90,
          reason: "Prime sightseeing, boutique walks, and local discovery",
          suggestedLocation: dest,
          isIndoor: false,
        },
        {
          id: "sunset-spot",
          title: `Scenic Lookout or Foreshore View`,
          category: "nature",
          timeSlot: "afternoon",
          suggestedDurationMins: 45,
          reason: "Catch golden hour harbour views before dinner",
          suggestedLocation: dest,
          isIndoor: false,
        },
      ];

    case "evening":
    case "night":
      return [
        {
          id: "dinner-spot",
          title: `Dinner at Top Rated Venue in ${dest}`,
          category: "food",
          timeSlot: "evening",
          suggestedDurationMins: 90,
          reason: "Relaxed dining with great food and ambiance",
          suggestedLocation: dest,
          isIndoor: true,
        },
        {
          id: "live-entertainment",
          title: `Live Music, Show or Rooftop Drinks`,
          category: "nightlife",
          timeSlot: "night",
          suggestedDurationMins: 120,
          reason: "Finish the evening with entertainment and good company",
          suggestedLocation: dest,
          isIndoor: true,
        },
      ];
  }
}

/**
 * Deterministically evaluate how well a Mate matches a Mate Request or Intent.
 * Computes a transparent match score (0-100) and clear explanation reasons.
 */
export function evaluateMateMatch(
  mate: PublicMate,
  request: Partial<MateRequest>,
  userLocation?: { lat: number; lng: number },
  mateLocation?: { lat: number; lng: number },
): MateMatchResult {
  const reasons: MatchReason[] = [];
  let score = 50; // base score for approved mates

  // 1. Verification status
  const isVerified = Boolean(mate.roles && mate.roles.length > 0);
  if (isVerified) {
    score += 15;
    reasons.push({ type: "verification", label: "Identity & background verified", positive: true });
  }

  // 2. Location & Distance
  if (userLocation && mateLocation) {
    const meters = haversineMeters(userLocation, mateLocation);
    const km = Math.round(meters / 100) / 10;
    if (meters <= 5000) {
      score += 20;
      reasons.push({ type: "distance", label: `Nearby (${km} km away)`, positive: true });
    } else if (meters <= 15000) {
      score += 10;
      reasons.push({ type: "distance", label: `Within metro area (${km} km)`, positive: true });
    } else {
      score -= 10;
      reasons.push({ type: "distance", label: `${km} km from meeting spot`, positive: false });
    }
  } else if (request.suburb && mate.suburb && mate.suburb.toLowerCase() === request.suburb.toLowerCase()) {
    score += 15;
    reasons.push({ type: "distance", label: `Based in ${mate.suburb}`, positive: true });
  }

  // 3. Shared activities & interests
  const reqWhat = (request.what || "").toLowerCase();
  const reqUseCase = (request.useCase || "").toLowerCase();
  const reqMateKind = (request.mateKind || "").toLowerCase();
  const matchedInterests: string[] = [];

  for (const interest of mate.interests || []) {
    const low = interest.toLowerCase();
    if (reqWhat.includes(low) || low.includes(reqWhat) || reqUseCase.includes(low) || reqMateKind.includes(low)) {
      matchedInterests.push(interest);
    }
  }

  for (const act of mate.activities || []) {
    const low = act.toLowerCase();
    if (reqWhat.includes(low) || low.includes(reqWhat) || reqUseCase.includes(low) || reqMateKind.includes(low)) {
      if (!matchedInterests.includes(act)) matchedInterests.push(act);
    }
  }

  if (matchedInterests.length > 0) {
    score += Math.min(25, matchedInterests.length * 10);
    reasons.push({
      type: "interest",
      label: `Shared activities: ${matchedInterests.slice(0, 3).join(", ")}`,
      positive: true,
    });
  }

  // 4. Availability & Schedule
  let isAvailable = true;
  if (request.date) {
    const reqDay = new Date(`${request.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = reqDay === "Sat" || reqDay === "Sun";
    const availList = (mate.availability || []).map((a) => a.toLowerCase());

    const matchesAvailability =
      availList.includes("flexible") ||
      (isWeekend && availList.includes("weekends")) ||
      (!isWeekend && (availList.includes("weekdays") || availList.includes("weeknights")));

    if (matchesAvailability) {
      score += 10;
      reasons.push({ type: "availability", label: `Available on ${reqDay}`, positive: true });
    } else if (availList.length > 0) {
      isAvailable = false;
      score -= 15;
      reasons.push({ type: "availability", label: `Usually available: ${mate.availability.join(", ")}`, positive: false });
    }
  }

  return {
    mate,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    isAvailable,
    isVerified,
    matchedInterests,
  };
}

/**
 * Rank a list of Mates for a specific Intent or Mate Request.
 */
export function rankMatesForIntent(
  mates: PublicMate[],
  request: Partial<MateRequest>,
  userLocation?: { lat: number; lng: number },
): MateMatchResult[] {
  return mates
    .map((m) => evaluateMateMatch(m, request, userLocation))
    .sort((a, b) => b.score - a.score);
}

/**
 * Assess the health and completion readiness of a plan along the 6-stage loop.
 */
export function evaluatePlanHealth(plan: {
  title?: string;
  location?: string;
  date?: string;
  time?: string;
  attendeesCount?: number;
  isCompleted?: boolean;
}): PlanHealthAssessment {
  const hasLocation = Boolean(plan.location && plan.location.trim().length > 2);
  const hasTime = Boolean(plan.date && plan.time);
  const hasMates = (plan.attendeesCount ?? 0) >= 1;
  const isSafePublicSpot = true; // By default public venue

  if (plan.isCompleted) {
    return {
      healthScore: 100,
      stage: "completed",
      checklist: { hasLocation, hasTime, hasMates, isSafePublicSpot },
      nextBestAction: "Leave a review & save your memories",
      readyToExperience: true,
    };
  }

  let score = 25; // Base for draft
  let nextAction = "Set a meeting place and time";

  if (hasLocation) score += 25;
  if (hasTime) score += 25;
  if (hasMates) score += 25;

  if (!hasLocation || !hasTime) {
    nextAction = "Add meeting point and time";
  } else if (!hasMates) {
    nextAction = "Invite a mate or share your invite link";
  } else {
    nextAction = "Ready! Meet safely at the scheduled time";
  }

  return {
    healthScore: Math.min(100, score),
    stage: score >= 100 ? "ready" : "draft",
    checklist: {
      hasLocation,
      hasTime,
      hasMates,
      isSafePublicSpot,
    },
    nextBestAction: nextAction,
    readyToExperience: score >= 75,
  };
}

/**
 * Generate sensible, reassuring safety guidelines for an activity and time of day.
 */
export function generateSafetyGuidance(category: BrainCategory, timeSlot: BrainTimeSlot): string[] {
  const tips = [
    "Always meet initially in a well-lit, public place (e.g. popular cafe or station concourse).",
    "Keep conversations inside AirPal messaging until you feel comfortable.",
    "Share your live AirPal plan link with a friend or family circle.",
  ];

  if (category === "nature" || category === "fitness") {
    tips.push("Bring appropriate footwear, sunscreen, and water for outdoor activities.");
  } else if (timeSlot === "night" || category === "nightlife") {
    tips.push("Plan your transport home in advance (train, rideshare, or walking in groups).");
  }

  return tips;
}

/**
 * Calculate transparent trust indicators for a user or Mate.
 */
export function calculateTrustProfile(stats: {
  isApproved?: boolean;
  hasIdVerification?: boolean;
  completedExperiences?: number;
  cancellationRate?: number; // 0.0 to 1.0
  averageRating?: number; // 1.0 to 5.0
}): TrustProfile {
  const completed = stats.completedExperiences || 0;
  const cancelRate = stats.cancellationRate ?? 0;
  const rating = stats.averageRating ?? 5.0;
  const badges: string[] = [];

  const isIdentityVerified = Boolean(stats.hasIdVerification);
  if (isIdentityVerified) badges.push("Identity Verified");

  const isAirPalApproved = Boolean(stats.isApproved);
  if (isAirPalApproved) badges.push("AirPal Approved");

  const isReliable = completed >= 3 && cancelRate <= 0.05;
  if (isReliable) badges.push("Reliable Mate");

  const isTopRated = completed >= 5 && rating >= 4.8;
  if (isTopRated) badges.push("Top Rated");

  return {
    isIdentityVerified,
    isAirPalApproved,
    isReliable,
    isTopRated,
    completedExperiences: completed,
    badges,
  };
}

/** Freshness SLA threshold in milliseconds */
export const FRESHNESS_SLAS = {
  hoursVerifiedMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  scheduleVerifiedMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  liveStatusMs: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Check if a timestamp satisfies freshness requirements.
 */
export function isDataFresh(
  isoDateStr: string | null | undefined,
  maxAgeMs: number = FRESHNESS_SLAS.hoursVerifiedMs,
  nowMs: number = Date.now(),
): boolean {
  if (!isoDateStr) return false;
  const t = new Date(isoDateStr).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= maxAgeMs;
}
