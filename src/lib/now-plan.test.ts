import { describe, expect, it } from "vitest";
import { defaultPlanTime, moodPlanType, nowPlanHref, suggestionPlanTitle } from "./now-plan";

describe("moodPlanType", () => {
  it("maps every Now mood to a valid plan template", () => {
    expect(moodPlanType("coffee")).toBe("catchup");
    expect(moodPlanType("eat")).toBe("lunch");
    expect(moodPlanType("see")).toBe("walk");
    expect(moodPlanType("shop")).toBe("escape");
    expect(moodPlanType("any")).toBe("nightout");
  });
});

describe("suggestionPlanTitle", () => {
  it("names the mood and place, or just the place for anything", () => {
    expect(suggestionPlanTitle("coffee", "Single O")).toBe("Coffee at Single O");
    expect(suggestionPlanTitle("any", "Single O")).toBe("Single O");
  });
});

describe("defaultPlanTime", () => {
  it("picks 7pm for tonight and the next hour for now", () => {
    expect(defaultPlanTime("tonight", new Date("2026-09-14T12:20:00+10:00"))).toBe("19:00");
    expect(defaultPlanTime("now", new Date("2026-09-14T14:20:00+10:00"))).toBe("15:00");
    expect(defaultPlanTime("now", new Date("2026-09-14T23:50:00+10:00"))).toBe("00:00");
  });
});

describe("nowPlanHref", () => {
  it("carries the suggestion into a prefilled plan link", () => {
    const href = nowPlanHref({
      mood: "coffee",
      when: "now",
      placeName: "Single O",
      address: "60–64 Reservoir St, Surry Hills",
      city: "Sydney",
      date: "2026-09-14",
      now: new Date("2026-09-14T14:20:00+10:00"),
      geo: { lat: -33.884, lng: 151.212 },
    });
    expect(href.startsWith("/plan/new?")).toBe(true);
    const params = new URLSearchParams(href.slice("/plan/new?".length));
    expect(params.get("title")).toBe("Coffee at Single O");
    expect(params.get("type")).toBe("catchup");
    expect(params.get("date")).toBe("2026-09-14");
    expect(params.get("time")).toBe("15:00");
    expect(params.get("dest")).toBe("60–64 Reservoir St, Surry Hills");
    expect(params.get("city")).toBe("Sydney");
    expect(params.get("lat")).toBe("-33.884");
    expect(params.get("lng")).toBe("151.212");
  });

  it("falls back to the place name when no address exists", () => {
    const href = nowPlanHref({
      mood: "any",
      when: "tonight",
      placeName: "Harbour Walk",
      city: "Sydney",
      date: "2026-09-14",
      now: new Date("2026-09-14T14:20:00+10:00"),
      geo: { lat: -33.86, lng: 151.2 },
    });
    const params = new URLSearchParams(href.slice("/plan/new?".length));
    expect(params.get("title")).toBe("Harbour Walk");
    expect(params.get("dest")).toBe("Harbour Walk");
    expect(params.get("time")).toBe("19:00");
  });
});
