import { describe, expect, it } from "vitest";
import {
  interestOverlap,
  myInterestProfile,
  PLAN_TYPES,
  PLAN_COVER_PRESETS,
  PLAN_THEMES,
  buildStopChangeMessage,
  formatTime12h,
  reorderStops,
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


