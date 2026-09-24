import { describe, expect, it } from "vitest";
import {
  canAcceptRequest,
  canLeaveReview,
  emptyMateRequest,
  isRequestStatus,
  isUseCase,
  matchAssignmentValid,
  matchReasons,
  mateRequestValid,
  reviewValid,
} from "./mate-request";

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
    expect(mateRequestValid({ ...emptyMateRequest(), what: "Concert buddy", date: "tomorrow", suburb: "CBD" })).toBe(
      false,
    );
    expect(
      mateRequestValid({
        ...emptyMateRequest(),
        what: "Concert buddy",
        date: "2026-10-03",
        suburb: "CBD",
        partySize: 99,
      }),
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

  it("lists understandable match reasons, never a score", () => {
    expect(
      matchReasons({
        suburb: "Surry Hills",
        date: "2026-10-04",
        time: "19:00",
        mateKind: "someone who likes live music",
        useCase: "events",
      }),
    ).toEqual([
      "In Surry Hills",
      "2026-10-04 at 19:00",
      "Looking for someone who likes live music",
      "Someone to come to this event with",
    ]);
    expect(matchReasons({ suburb: "  ", date: "", time: "", mateKind: "", useCase: "social" })).toEqual([
      "Go out, not alone",
    ]);
  });

  it("only allows reviews after the request is completed", () => {
    expect(canLeaveReview("completed")).toBe(true);
    expect(canLeaveReview("matched")).toBe(false);
    expect(canLeaveReview("open")).toBe(false);
  });

  it("guards the accept claim before the transaction", () => {
    expect(canAcceptRequest({ status: "open", ownerUid: "owner-1" }, "mate-1", true)).toBe(null);
    expect(canAcceptRequest({ status: "matched", ownerUid: "owner-1" }, "mate-1", true)).toBe(
      "This request is no longer open.",
    );
    expect(canAcceptRequest({ status: "open", ownerUid: "mate-1" }, "mate-1", true)).toBe(
      "You can't accept your own request.",
    );
    expect(canAcceptRequest({ status: "open", ownerUid: "owner-1" }, "mate-1", false)).toBe(
      "Only approved Mates can accept requests.",
    );
    expect(canAcceptRequest({ status: "open", ownerUid: "owner-1" }, "", true)).toBe(
      "Sign in as an approved Mate to accept.",
    );
  });
});
