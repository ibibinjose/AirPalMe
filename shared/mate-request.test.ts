import { describe, expect, it } from "vitest";
import { emptyMateRequest, isRequestStatus, isUseCase, matchAssignmentValid, mateRequestValid, reviewValid } from "./mate-request";

describe("mate requests", () => {
  it("accepts a complete request", () => {
    expect(
      mateRequestValid({
        ...emptyMateRequest(),
        useCase: "explore",
        what: "Walk the Bondi to Coogee trail",
        date: "2026-10-03",
        suburb: "Bondi",
        partySize: 2,
        budget: 60,
      }),
    ).toBe(true);
  });

  it("rejects vague or malformed requests", () => {
    expect(mateRequestValid({ ...emptyMateRequest(), what: "Hi", date: "2026-10-03", suburb: "Bondi" })).toBe(false);
    expect(
      mateRequestValid({ ...emptyMateRequest(), what: "Concert buddy", date: "tomorrow", suburb: "CBD" }),
    ).toBe(false);
    expect(
      mateRequestValid({ ...emptyMateRequest(), what: "Concert buddy", date: "2026-10-03", suburb: "CBD", partySize: 99 }),
    ).toBe(false);
  });

  it("validates mate assignment", () => {
    expect(matchAssignmentValid("uid-9", "Ava")).toBe(true);
    expect(matchAssignmentValid("", "Ava")).toBe(false);
    expect(matchAssignmentValid("uid-9", "A")).toBe(false);
  });

  it("validates post-meet reviews", () => {
    expect(reviewValid(5, "Ava made the night — on time, great energy.")).toBe(true);
    expect(reviewValid(0, "No show.")).toBe(false);
    expect(reviewValid(4, "")).toBe(true);
  });

  it("guards use cases and statuses", () => {
    expect(isUseCase("events")).toBe(true);
    expect(isUseCase("dating")).toBe(false);
    expect(isRequestStatus("matched")).toBe(true);
    expect(isRequestStatus("refunded")).toBe(false);
  });
});
