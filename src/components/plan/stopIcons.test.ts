import { describe, expect, it } from "vitest";
import { STOP_ICON_OPTIONS, STOP_ICON_CATEGORIES, POPULAR_STOP_ICONS, getStopIconDef } from "./stopIcons";

describe("stopIcons", () => {
  it("includes coffee, food, petrol, and life event options", () => {
    const ids = STOP_ICON_OPTIONS.map((o) => o.id);
    expect(ids).toContain("coffee");
    expect(ids).toContain("food");
    expect(ids).toContain("petrol");
    expect(ids).toContain("drinks");
    expect(ids).toContain("stay");
    expect(ids).toContain("sight");
    expect(ids).toContain("ceremony");
    expect(ids).toContain("cake");
    expect(ids).toContain("toast");
    expect(ids).toContain("gift");
    expect(ids).toContain("speech");
    expect(ids).toContain("home");
    expect(ids).toContain("photo");
  });

  it("retrieves the right definition by ID and falls back gracefully", () => {
    const coffee = getStopIconDef("coffee");
    expect(coffee.label).toBe("Coffee & Brunch");
    expect(coffee.emoji).toBe("☕");

    const cake = getStopIconDef("cake");
    expect(cake.label).toBe("Cake & Dessert");
    expect(cake.emoji).toBe("🎂");

    const ceremony = getStopIconDef("ceremony");
    expect(ceremony.label).toBe("Ceremony & Service");
    expect(ceremony.emoji).toBe("💍");

    const petrol = getStopIconDef("petrol");
    expect(petrol.label).toBe("Petrol / Pitstop");
    expect(petrol.emoji).toBe("⛽");

    const fallback = getStopIconDef("unknown-category");
    expect(fallback.id).toBe("pin");
  });

  it("provides categorized stop icons and popular icons list", () => {
    expect(STOP_ICON_CATEGORIES.length).toBeGreaterThan(0);
    const categoryNames = STOP_ICON_CATEGORIES.map((c) => c.name);
    expect(categoryNames).toContain("Milestones");
    expect(categoryNames).toContain("Dining & Drinks");
    expect(categoryNames).toContain("Activities & Vibes");
    expect(categoryNames).toContain("Places & Logistics");

    expect(POPULAR_STOP_ICONS).toContain("food");
    expect(POPULAR_STOP_ICONS).toContain("drinks");
    expect(POPULAR_STOP_ICONS).toContain("coffee");
    expect(POPULAR_STOP_ICONS).toContain("pin");
  });
});
