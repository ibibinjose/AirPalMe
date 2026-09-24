import { describe, expect, it } from "vitest";
import {
  evaluateMateMatch,
  generateSmartPlanSuggestions,
  calculateTrustProfile,
  isDataFresh,
  solveAirPalIntent,
  rankMatesForIntent,
  evaluatePlanHealth,
  generateSafetyGuidance,
  FRESHNESS_SLAS,
} from "./brain";
import type { PublicMate } from "@shared/companion";

describe("AirPal Brain Intelligence Engine", () => {
  const sampleMate: PublicMate = {
    uid: "mate-123",
    firstName: "Maya",
    city: "Sydney",
    suburb: "Surry Hills",
    serviceArea: "Sydney Metro",
    languages: ["English", "Spanish"],
    interests: ["Coffee", "Art", "Coastal Walks", "Food"],
    activities: ["Dining", "Museums", "Sightseeing"],
    availability: ["Weekends", "Flexible"],
    introduction: "Love showing locals and visitors the best hidden coffee spots.",
    roles: ["companion", "friend"],
    photo: "/media/harbour.jpg",
  };

  describe("solveAirPalIntent", () => {
    it("solves natural language query for weekend coffee in Surry Hills", () => {
      const intent = solveAirPalIntent("Looking for a coffee and brunch catchup in Surry Hills on Saturday morning");
      expect(intent.suburb).toBe("Surry Hills");
      expect(intent.category).toBe("coffee");
      expect(intent.timeSlot).toBe("morning");
      expect(intent.stops.length).toBeGreaterThanOrEqual(2);
      expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
      expect(intent.safetyTips.length).toBeGreaterThan(0);
    });

    it("solves evening dining and drinks query in Newtown", () => {
      const intent = solveAirPalIntent("Dinner and drinks in Newtown tonight with friends under $50");
      expect(intent.suburb).toBe("Newtown");
      expect(intent.category).toBe("food");
      expect(intent.budget).toBe("under-50");
      expect(intent.timeSlot).toBe("evening");
    });

    it("adapts to rainy weather by recommending indoor options", () => {
      const intent = solveAirPalIntent("Things to do in CBD on a rainy afternoon", { weather: "rainy" });
      expect(intent.weatherPreference).toBe("indoor");
      expect(intent.stops.every((s) => s.isIndoor === true)).toBe(true);
    });
  });

  describe("generateSmartPlanSuggestions", () => {
    it("generates morning coffee and nature stops", () => {
      const stops = generateSmartPlanSuggestions("The Rocks", "morning");
      expect(stops.length).toBe(2);
      expect(stops[0]!.category).toBe("coffee");
      expect(stops[1]!.category).toBe("nature");
    });

    it("generates evening food and nightlife stops", () => {
      const stops = generateSmartPlanSuggestions("Circular Quay", "evening");
      expect(stops.length).toBe(2);
      expect(stops[0]!.category).toBe("food");
      expect(stops[1]!.category).toBe("nightlife");
    });
  });

  describe("evaluateMateMatch & rankMatesForIntent", () => {
    it("evaluates a strong match with proximity and shared interests", () => {
      const userLoc = { lat: -33.883, lng: 151.216 }; // Surry Hills
      const mateLoc = { lat: -33.885, lng: 151.218 }; // ~300m away

      const result = evaluateMateMatch(
        sampleMate,
        {
          suburb: "Surry Hills",
          useCase: "activities",
          what: "Art & Coffee catchup",
          date: "2026-09-26", // Saturday
        },
        userLoc,
        mateLoc,
      );

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.isAvailable).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.reasons.some((r) => r.type === "distance")).toBe(true);
      expect(result.reasons.some((r) => r.type === "interest")).toBe(true);
    });

    it("ranks a pool of mates accurately based on score", () => {
      const mate2: PublicMate = {
        ...sampleMate,
        uid: "mate-456",
        firstName: "Leo",
        suburb: "Bondi",
        interests: ["Surfing", "Gym"],
        activities: ["Running"],
      };

      const ranked = rankMatesForIntent([mate2, sampleMate], {
        suburb: "Surry Hills",
        what: "Art & Coffee",
      });

      expect(ranked[0]?.mate.uid).toBe("mate-123");
      expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    });
  });

  describe("evaluatePlanHealth", () => {
    it("rates draft plan health accurately", () => {
      const draftHealth = evaluatePlanHealth({
        title: "Coffee catchup",
        location: "",
        date: "2026-09-26",
      });
      expect(draftHealth.healthScore).toBeLessThan(75);
      expect(draftHealth.readyToExperience).toBe(false);
      expect(draftHealth.stage).toBe("draft");
    });

    it("rates ready plan with location, time and mate as ready to experience", () => {
      const readyHealth = evaluatePlanHealth({
        title: "Bondi to Bronte Walk",
        location: "Bondi Icebergs, Notts Ave",
        date: "2026-09-26",
        time: "10:00 AM",
        attendeesCount: 2,
      });
      expect(readyHealth.healthScore).toBe(100);
      expect(readyHealth.readyToExperience).toBe(true);
      expect(readyHealth.stage).toBe("ready");
    });
  });

  describe("generateSafetyGuidance", () => {
    it("generates night-specific safety guidance", () => {
      const tips = generateSafetyGuidance("nightlife", "night");
      expect(tips.some((t) => t.includes("transport"))).toBe(true);
      expect(tips.some((t) => t.includes("public place"))).toBe(true);
    });
  });

  describe("calculateTrustProfile", () => {
    it("awards badges accurately based on completion and rating", () => {
      const profile = calculateTrustProfile({
        isApproved: true,
        hasIdVerification: true,
        completedExperiences: 10,
        cancellationRate: 0.0,
        averageRating: 4.95,
      });

      expect(profile.isIdentityVerified).toBe(true);
      expect(profile.isAirPalApproved).toBe(true);
      expect(profile.isReliable).toBe(true);
      expect(profile.isTopRated).toBe(true);
      expect(profile.badges).toContain("Identity Verified");
      expect(profile.badges).toContain("AirPal Approved");
      expect(profile.badges).toContain("Reliable Mate");
      expect(profile.badges).toContain("Top Rated");
    });
  });

  describe("isDataFresh", () => {
    it("verifies fresh timestamp within SLA threshold", () => {
      const now = Date.now();
      const recentDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
      expect(isDataFresh(recentDate, FRESHNESS_SLAS.hoursVerifiedMs, now)).toBe(true);
    });

    it("flags expired timestamp outside SLA threshold", () => {
      const now = Date.now();
      const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago
      expect(isDataFresh(oldDate, FRESHNESS_SLAS.hoursVerifiedMs, now)).toBe(false);
    });
  });
});
