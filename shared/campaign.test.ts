import { describe, expect, it } from "vitest";
import { aud, campaignValid, emptyCampaign, fillRate, isCampaignStatus, projectedRevenue } from "./campaign";

describe("campaigns", () => {
  const good = {
    ...emptyCampaign(),
    businessName: "Harbour View Hotel",
    title: "Rooftop tasting night",
    brief: "Twenty guests, three pours, one harbour sunset. We host, AirPal recruits.",
    suburb: "The Rocks",
    date: "2026-11-07",
    time: "18:00",
  };

  it("accepts a complete campaign brief", () => {
    expect(campaignValid(good)).toBe(true);
  });

  it("rejects thin briefs and bad numbers", () => {
    expect(campaignValid({ ...good, brief: "Wine night" })).toBe(false);
    expect(campaignValid({ ...good, recruitTarget: 30, capacity: 20 })).toBe(false);
    expect(campaignValid({ ...good, category: "Spaceship" })).toBe(false);
  });

  it("guards statuses and money maths", () => {
    expect(isCampaignStatus("live")).toBe(true);
    expect(isCampaignStatus("refunded")).toBe(false);
    expect(aud(100000)).toBe("$1000");
    expect(aud(0)).toBe("Free");
    expect(projectedRevenue(5000, 20)).toBe(100000);
    expect(fillRate(10, 20)).toBe(0.5);
    expect(fillRate(25, 20)).toBe(1);
  });
});
