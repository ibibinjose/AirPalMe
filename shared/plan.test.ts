import { describe, expect, it } from "vitest";
import {
  hasTripItinerary,
  interestOverlap,
  isSoldOut,
  isTicketed,
  myInterestProfile,
  scheduleDays,
  PLAN_TYPES,
  PLAN_COVER_PRESETS,
  PLAN_THEMES,
  buildStopChangeMessage,
  canCompletePlanStatus,
  formatTime12h,
  reorderStops,
  spotsLeft,
  stopChangeRecipients,
} from "./plan";

describe("interest matching", () => {
  it("counts shared tags case-insensitively", () => {
    expect(interestOverlap(["food", "music"], ["Music", "sport"])).toBe(1);
    expect(interestOverlap(undefined, ["food"])).toBe(0);
    expect(interestOverlap([], [])).toBe(0);
  });

  it("builds a profile from the user's own plans", () => {
    const plans = [
      { interests: ["Food", "music"], attendees: [{ id: "u1" }], creator: { uid: "u1" } },
      { interests: ["sport"], attendees: [], creator: {} },
    ];
    expect(myInterestProfile(plans, "u1").sort()).toEqual(["food", "music"]);
  });
});

describe("plan occasions", () => {
  it("includes weekend escape in PLAN_TYPES with required fields", () => {
    expect(PLAN_TYPES.escape).toBeDefined();
    expect(PLAN_TYPES.escape.id).toBe("escape");
    expect(PLAN_TYPES.escape.label).toBe("Weekend Escape");
    expect(PLAN_TYPES.escape.defaultTitle).toContain("Weekend Escape");
    expect(PLAN_TYPES.escape.suggestedStops.length).toBeGreaterThanOrEqual(2);
  });

  it("exports curated plan cover presets", () => {
    expect(PLAN_COVER_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(PLAN_COVER_PRESETS.some((p) => p.category === "Weekend Escape")).toBe(true);
  });
});

describe("formatTime12h", () => {
  it("converts 24h times to AM/PM", () => {
    expect(formatTime12h("18:30")).toBe("6:30 PM");
    expect(formatTime12h("09:05")).toBe("9:05 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("00:15")).toBe("12:15 AM");
  });

  it("passes through blanks and existing AM/PM strings", () => {
    expect(formatTime12h(undefined)).toBe("");
    expect(formatTime12h("  ")).toBe("");
    expect(formatTime12h("6:30 PM")).toBe("6:30 PM");
  });
});

describe("reorderStops", () => {
  it("moves a stop from one index to another without mutating", () => {
    const stops = ["a", "b", "c"];
    expect(reorderStops(stops, 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderStops(stops, 2, 0)).toEqual(["c", "a", "b"]);
    expect(stops).toEqual(["a", "b", "c"]);
  });

  it("leaves the list unchanged for same or out-of-range indices", () => {
    expect(reorderStops(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(reorderStops(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(reorderStops(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("stop change notifications", () => {
  it("notifies every attendee and subscriber exactly once", () => {
    const recipients = stopChangeRecipients({
      attendees: [
        { id: "u1", name: "Alex", status: "going", respondedAt: "" },
        { id: "mate@mates.io", name: "Mate", status: "maybe", respondedAt: "" },
      ],
      subscribers: ["mate@mates.io", "follower@mates.io"],
    });
    expect(recipients.sort()).toEqual(["follower@mates.io", "mate@mates.io", "u1"]);
  });

  it("builds a message for each stop change action", () => {
    expect(buildStopChangeMessage("added", "Rooftop", "Alex")).toContain("Rooftop");
    expect(buildStopChangeMessage("updated", "Rooftop", "Alex")).toContain("Alex");
    expect(buildStopChangeMessage("removed", "Rooftop")).toContain("Rooftop");
    expect(buildStopChangeMessage("reordered", "", "Alex")).toContain("order");
  });
});

describe("invitation themes", () => {
  it("offers a Holographic VIP theme with full card styling", () => {
    expect(PLAN_THEMES.holographic).toBeDefined();
    expect(PLAN_THEMES.holographic.id).toBe("holographic");
    expect(PLAN_THEMES.holographic.name).toBe("Holographic VIP");
    expect(PLAN_THEMES.holographic.bgClass).toBeTruthy();
    expect(PLAN_THEMES.holographic.badgeClass).toBeTruthy();
    expect(PLAN_THEMES.holographic.accentColor).toBeTruthy();
    expect(PLAN_THEMES.holographic.foilGlow).toBeTruthy();
  });

  it("offers Hot Pink, Fluro Green, and Jet Black themes", () => {
    expect(PLAN_THEMES.hotpink.name).toBe("Hot Pink");
    expect(PLAN_THEMES.fluro.name).toBe("Fluro Green");
    expect(PLAN_THEMES.jetblack.name).toBe("Jet Black");
  });

  it("gives every theme a full-colour background plus readable foregrounds", () => {
    for (const theme of Object.values(PLAN_THEMES)) {
      expect(theme.bgClass).toBeTruthy();
      expect(theme.onThemeClass).toBeTruthy();
      expect(theme.onThemeMutedClass).toBeTruthy();
    }
    // Fluro's neon background needs dark text; the rest use white.
    expect(PLAN_THEMES.fluro.onThemeClass).toContain("zinc-950");
    expect(PLAN_THEMES.jetblack.onThemeClass).toBe("text-white");
  });
});

describe("ticketed events", () => {
  it("treats a priced experience as a ticket, not a free RSVP", () => {
    expect(isTicketed({ isExperience: true, pricePerPerson: 25, pricingModel: "fixed" })).toBe(true);
    expect(isTicketed({ isExperience: true, pricePerPerson: 0, pricingModel: "free" })).toBe(false);
    expect(isTicketed({ isExperience: false, pricePerPerson: 40, pricingModel: "fixed" })).toBe(false);
  });

  it("counts remaining tickets against capacity", () => {
    expect(spotsLeft({ capacity: 10, spotsBooked: 6 })).toBe(4);
    expect(isSoldOut({ capacity: 10, spotsBooked: 10 })).toBe(true);
    expect(isSoldOut({ capacity: 10, spotsBooked: 3 })).toBe(false);
    expect(spotsLeft({ capacity: 0, spotsBooked: 2 })).toBe(null);
  });
});

describe("trip itinerary", () => {
  const day = (dayNumber: number, title: string) => ({ dayNumber, title, description: "", stops: [] });
  it("orders days and renumbers without gaps", () => {
    expect(scheduleDays(undefined)).toEqual([]);
    expect(
      scheduleDays([day(3, "Coast"), day(1, "City"), { dayNumber: 0, title: "Nowhere", description: "", stops: [] }, day(2, "  ")]).map(
        (d) => [d.dayNumber, d.title],
      ),
    ).toEqual([
      [1, "City"],
      [2, "Coast"],
    ]);
  });
  it("renders only for trip/escape plans with a schedule", () => {
    expect(hasTripItinerary({ type: "trip", multiDaySchedule: [day(1, "City")] })).toBe(true);
    expect(hasTripItinerary({ type: "escape", multiDaySchedule: [day(1, "Coast")] })).toBe(true);
    expect(hasTripItinerary({ type: "trip", multiDaySchedule: [] })).toBe(false);
    expect(hasTripItinerary({ type: "nightout", multiDaySchedule: [day(1, "City")] })).toBe(false);
  });
});

describe("plan completion guard", () => {
  it("allows only live plans to close the loop", () => {
    expect(canCompletePlanStatus("open")).toBe(true);
    expect(canCompletePlanStatus("confirmed")).toBe(true);
    expect(canCompletePlanStatus("draft")).toBe(false);
    expect(canCompletePlanStatus("completed")).toBe(false);
    expect(canCompletePlanStatus("cancelled")).toBe(false);
  });
});
