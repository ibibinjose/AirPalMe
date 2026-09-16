import { describe, expect, it } from "vitest";
import { emptyWalkthrough, walkthroughValid } from "./studio";

describe("studio walkthroughs", () => {
  it("accepts a complete booking", () => {
    expect(
      walkthroughValid({
        ...emptyWalkthrough(),
        name: "Sam Chen",
        business: "Harbour View Hotel",
        email: "sam@harbourhotel.com.au",
        phone: "0412 345 678",
      }),
    ).toBe(true);
  });

  it("rejects incomplete bookings", () => {
    expect(walkthroughValid({ ...emptyWalkthrough(), name: "Sam", business: "H", email: "x", phone: "1" })).toBe(false);
    expect(
      walkthroughValid({
        ...emptyWalkthrough(),
        name: "Sam Chen",
        business: "Harbour View Hotel",
        email: "sam@harbourhotel.com.au",
        phone: "0412 345 678",
        kind: "Spaceship",
      }),
    ).toBe(false);
  });
});
