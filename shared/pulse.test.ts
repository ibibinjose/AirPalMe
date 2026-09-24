import { describe, expect, it } from "vitest";
import {
  buildPulsePublicPath,
  categoryFromPulseAnswers,
  createPublicToken,
  evaluateLogic,
  isNegativeRating,
  isPulsePublicToken,
  issueSummaryFromAnswers,
  primaryScoreFromAnswers,
  pulseResponsesToCsv,
  stayDuringStayTemplate,
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

describe("csv export", () => {
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
});
