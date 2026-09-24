import { describe, expect, it } from "vitest";
import {
  buildPulsePublicPath,
  categoryFromPulseAnswers,
  createPublicToken,
  evaluateLogic,
  isNegativeRating,
  isPulsePublicToken,
  isValidClientKey,
  issueSummaryFromAnswers,
  primaryScoreFromAnswers,
  pulseResponsesToCsv,
  resolvePulseStatusTransition,
  stayDuringStayTemplate,
  validatePulseFollowup,
  validatePulseSubmitPayload,
  visibleQuestions,
  type PulseAnswer,
  type PulseResponse,
} from "./pulse";

describe("pulse tokens", () => {
  it("creates opaque pls_ tokens and rejects lookalikes", () => {
    const token = createPublicToken();
    expect(token.startsWith("pls_")).toBe(true);
    expect(isPulsePublicToken(token)).toBe(true);
    expect(isPulsePublicToken("pls_short")).toBe(false);
    expect(isPulsePublicToken("p_abc")).toBe(false);
    expect(buildPulsePublicPath(token)).toBe(`/pulse/${token}`);
  });
});

describe("stay during-stay template + logic", () => {
  const pulse = stayDuringStayTemplate("harbour-hotel");

  it("starts as draft with gated follow-ups", () => {
    expect(pulse.template).toBe("stay_during");
    expect(pulse.status).toBe("draft");
    expect(pulse.questions.some((q) => q.gated)).toBe(true);
  });

  it("hides gated questions until rating ≤ 2", () => {
    const happy: PulseAnswer[] = [{ questionId: "q_stay", type: "rating_5", value: 5 }];
    expect(visibleQuestions(pulse, happy).map((q) => q.id)).toEqual(["q_stay"]);

    const sad: PulseAnswer[] = [{ questionId: "q_stay", type: "rating_5", value: 2 }];
    const ids = visibleQuestions(pulse, sad).map((q) => q.id);
    expect(ids).toContain("q_wrong");
    expect(ids).toContain("q_help");
    expect(ids).toContain("q_contact");

    const logic = evaluateLogic(pulse.logic, sad);
    expect(logic.createIssue).toBe(true);
  });

  it("flags negative ratings", () => {
    expect(isNegativeRating("rating_5", 2)).toBe(true);
    expect(isNegativeRating("rating_5", 3)).toBe(false);
    expect(isNegativeRating("nps", 6)).toBe(true);
    expect(isNegativeRating("nps", 7)).toBe(false);
  });
});

describe("submit validation", () => {
  const pulse = stayDuringStayTemplate("harbour-hotel");
  const token = createPublicToken();

  it("accepts a happy-path rating-only submit", () => {
    const result = validatePulseSubmitPayload(pulse, {
      publicToken: token,
      answers: [{ questionId: "q_stay", type: "rating_5", value: 5 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.createIssue).toBe(false);
      expect(result.primaryScore).toBe(5);
    }
  });

  it("requires gated category after a low rating", () => {
    const missing = validatePulseSubmitPayload(pulse, {
      publicToken: token,
      answers: [{ questionId: "q_stay", type: "rating_5", value: 1 }],
    });
    expect(missing.ok).toBe(false);

    const full = validatePulseSubmitPayload(pulse, {
      publicToken: token,
      answers: [
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_wrong", type: "single_choice", value: "wifi" },
        { questionId: "q_help", type: "text_short", value: "Router keeps dropping" },
        { questionId: "q_contact", type: "yes_no", value: true },
      ],
      contactRequested: true,
      contactName: "Alex",
      roomNumber: "412",
    });
    expect(full.ok).toBe(true);
    if (full.ok) {
      expect(full.createIssue).toBe(true);
      expect(full.askContact).toBe(true);
      expect(categoryFromPulseAnswers(full.answers)).toBe("wifi");
      expect(issueSummaryFromAnswers(full.answers, full.primaryScore)).toMatch(/wifi/i);
    }
  });

  it("rejects forged question ids", () => {
    const bad = validatePulseSubmitPayload(pulse, {
      publicToken: token,
      answers: [{ questionId: "q_hack", type: "rating_5", value: 1 }],
    });
    expect(bad.ok).toBe(false);
  });
});

describe("status transitions", () => {
  it("pauses, resumes, and archives a live Pulse — and nothing else", () => {
    expect(resolvePulseStatusTransition("live", "paused")).toBe(true);
    expect(resolvePulseStatusTransition("paused", "live")).toBe(true);
    expect(resolvePulseStatusTransition("live", "archived")).toBe(true);
    expect(resolvePulseStatusTransition("paused", "archived")).toBe(true);
    expect(resolvePulseStatusTransition("draft", "archived")).toBe(true);
  });

  it("rejects publish-via-transition, same-state, and archived-exit moves", () => {
    expect(resolvePulseStatusTransition("draft", "live")).toBe(false);
    expect(resolvePulseStatusTransition("live", "live")).toBe(false);
    expect(resolvePulseStatusTransition("archived", "live")).toBe(false);
    expect(resolvePulseStatusTransition("paused", "draft")).toBe(false);
  });
});

describe("client keys", () => {
  it("accepts URL-safe keys and rejects the rest", () => {
    expect(isValidClientKey("kAbc123-_XYZ9")).toBe(true);
    expect(isValidClientKey("short")).toBe(false);
    expect(isValidClientKey("has space in it 12345")).toBe(false);
    expect(isValidClientKey("../../../etc")).toBe(false);
    expect(isValidClientKey(undefined)).toBe(false);
    expect(isValidClientKey("x".repeat(65))).toBe(false);
  });
});

describe("follow-up validation", () => {
  it("accepts a 1–5 score with an optional short note", () => {
    expect(validatePulseFollowup(4, "Fixed the AC")).toEqual({ ok: true, score: 4, note: "Fixed the AC" });
    expect(validatePulseFollowup("5")).toEqual({ ok: true, score: 5, note: undefined });
  });

  it("rejects out-of-range scores and long notes", () => {
    expect(validatePulseFollowup(0).ok).toBe(false);
    expect(validatePulseFollowup(6).ok).toBe(false);
    expect(validatePulseFollowup(3.5).ok).toBe(false);
    expect(validatePulseFollowup(4, "x".repeat(501)).ok).toBe(false);
  });
});

describe("csv export & security", () => {
  it("serializes responses without inventing rows", () => {
    const rows: PulseResponse[] = [
      {
        id: "r1",
        propertyId: "p1",
        pulseId: "pu1",
        deploymentId: "d1",
        publicToken: createPublicToken(),
        answers: [{ questionId: "q_stay", type: "rating_5", value: 4 }],
        primaryScore: 4,
        createdAt: "2026-09-24T00:00:00.000Z",
        anonymous: true,
      },
    ];
    const csv = pulseResponsesToCsv(rows);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain("responseId");
    expect(csv).toContain("r1");
    expect(primaryScoreFromAnswers(rows[0]!.answers)).toBe(4);
  });

  it("neutralizes spreadsheet formula injection and escapes special CSV characters", () => {
    const maliciousRows: PulseResponse[] = [
      {
        id: "r_evil",
        propertyId: "p1",
        pulseId: "pu1",
        deploymentId: "d1",
        publicToken: createPublicToken(),
        answers: [{ questionId: "q_stay", type: "rating_5", value: 1 }],
        primaryScore: 1,
        contactRequested: true,
        contactName: "=cmd|' /C calc'!A0",
        contactMethod: "+61 400 000 000, ext 123",
        roomNumber: '101 "Penthouse"',
        issueId: "@SUM(1+1)",
        createdAt: "2026-09-24T00:00:00.000Z",
        anonymous: true,
      },
    ];
    const csv = pulseResponsesToCsv(maliciousRows);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    // Formula characters must be prepended with a single quote
    expect(csv).toContain("\"'=cmd|' /C calc'!A0\"");
    expect(csv).toContain("\"'+61 400 000 000, ext 123\"");
    expect(csv).toContain("\"'@SUM(1+1)\"");
    // Double quotes must be escaped as ""
    expect(csv).toContain('"101 ""Penthouse"""');
  });
});

describe("category and issue summary heuristics", () => {
  it("extracts categories from keywords when single_choice is not explicit", () => {
    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "The bathroom towels and linen are dirty" },
      ]),
    ).toBe("cleanliness");

    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "The receptionist and staff were very rude" },
      ]),
    ).toBe("staff");

    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "The air con is leaking water onto the bed" },
      ]),
    ).toBe("maintenance");

    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "Breakfast food was cold and restaurant closed early" },
      ]),
    ).toBe("dining");

    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "Loud noise and music through the thin wall" },
      ]),
    ).toBe("noise");

    expect(
      categoryFromPulseAnswers([
        { questionId: "q_stay", type: "rating_5", value: 1 },
        { questionId: "q_help", type: "text_short", value: "Unspecified disappointment" },
      ]),
    ).toBe("other");
  });

  it("formats issue summaries reliably with truncated limits", () => {
    const summary = issueSummaryFromAnswers(
      [
        { questionId: "q_wrong", type: "single_choice", value: "cleanliness" },
        { questionId: "q_help", type: "text_short", value: "Need extra towels please" },
      ],
      2,
    );
    expect(summary).toBe("Stay 2/5 · cleanliness · Need extra towels please");
  });
});

describe("stress-testing validation rules & edge cases", () => {
  const pulse = stayDuringStayTemplate("harbour-hotel");
  const token = createPublicToken();

  it("rejects non-object or null payloads", () => {
    expect(validatePulseSubmitPayload(pulse, null as unknown as any).ok).toBe(false);
    expect(validatePulseSubmitPayload(pulse, undefined as unknown as any).ok).toBe(false);
    expect(validatePulseSubmitPayload(pulse, "bad string" as unknown as any).ok).toBe(false);
  });

  it("rejects empty answers or more than 40 answers", () => {
    expect(validatePulseSubmitPayload(pulse, { publicToken: token, answers: [] }).ok).toBe(false);

    const tooMany = Array.from({ length: 41 }, () => ({
      questionId: "q_stay",
      type: "rating_5" as const,
      value: 5,
    }));
    expect(validatePulseSubmitPayload(pulse, { publicToken: token, answers: tooMany }).ok).toBe(false);
  });

  it("rejects mismatched question types and out-of-range values", () => {
    // NPS out of bounds
    const pulseWithNps = {
      ...pulse,
      questions: [{ id: "q_nps", type: "nps" as const, prompt: "NPS", required: true, sortOrder: 1 }],
      logic: [],
    };
    expect(
      validatePulseSubmitPayload(pulseWithNps, {
        publicToken: token,
        answers: [{ questionId: "q_nps", type: "nps", value: 11 }],
      }).ok,
    ).toBe(false);

    expect(
      validatePulseSubmitPayload(pulseWithNps, {
        publicToken: token,
        answers: [{ questionId: "q_nps", type: "nps", value: -1 }],
      }).ok,
    ).toBe(false);

    // text_short too long (> 500 chars)
    expect(
      validatePulseSubmitPayload(pulse, {
        publicToken: token,
        answers: [
          { questionId: "q_stay", type: "rating_5", value: 1 },
          { questionId: "q_wrong", type: "single_choice", value: "wifi" },
          { questionId: "q_help", type: "text_short", value: "a".repeat(501) },
        ],
      }).ok,
    ).toBe(false);

    // single_choice not in options
    expect(
      validatePulseSubmitPayload(pulse, {
        publicToken: token,
        answers: [
          { questionId: "q_stay", type: "rating_5", value: 1 },
          { questionId: "q_wrong", type: "single_choice", value: "invalid_unsupported_choice" },
        ],
      }).ok,
    ).toBe(false);
  });
});

