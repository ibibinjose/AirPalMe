import { describe, expect, it } from "vitest";
import { bucketEvent, EVENT_BUCKETS } from "./events-categories";

describe("bucketEvent", () => {
  it("defines exactly the three /events buckets", () => {
    expect(EVENT_BUCKETS.map((b) => b.id)).toEqual(["places", "community", "friends"]);
  });

  it("puts people-created events with Friends", () => {
    expect(bucketEvent({ source: "user" })).toBe("friends");
    expect(bucketEvent({ source: "partner", hostType: "individual" })).toBe("friends");
  });

  it("puts community-source and community-category events with Community", () => {
    expect(bucketEvent({ source: "community" })).toBe("community");
    expect(bucketEvent({ source: "partner", category: "community" })).toBe("community");
  });

  it("defaults venue and business events to Places", () => {
    expect(bucketEvent({ source: "partner", category: "music" })).toBe("places");
    expect(bucketEvent({ source: "local", category: "food" })).toBe("places");
    expect(bucketEvent({})).toBe("places");
  });

  it("prioritizes who over where: user source wins over community category", () => {
    expect(bucketEvent({ source: "user", category: "community" })).toBe("friends");
  });
});
