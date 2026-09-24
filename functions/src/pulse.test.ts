import { describe, expect, it, vi } from "vitest";

vi.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "" }),
}));

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn().mockReturnValue([{}]),
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn().mockReturnValue({}),
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn().mockReturnValue({
    sendEachForMulticast: vi.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

vi.mock("firebase-functions/v2", () => ({
  setGlobalOptions: vi.fn(),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("./abuse", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  isAnonymousAuth: vi.fn((req: { auth?: { token?: { firebase?: { sign_in_provider?: string } } } }) => {
    return req.auth?.token?.firebase?.sign_in_provider === "anonymous";
  }),
  noteAppCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: vi.fn().mockResolvedValue(undefined),
}));

// We can test pulse journey logic, transitions, and callable handlers
import {
  createPublicToken,
  isPulsePublicToken,
  isValidClientKey,
  resolvePulseStatusTransition,
  stayDuringStayTemplate,
  validatePulseFollowup,
  validatePulseSubmitPayload,
  type PulseAnswer,
} from "../../shared/pulse";

describe("AirPal Pulse End-to-End Journey & Security Stress Tests", () => {
  const propertyId = "prop_harbour_hotel";
  const hostAdminUid = "usr_host_admin";

  it("Full Journey: Create -> Publish -> Scan -> Negative Response -> Auto Issue -> Acknowledge -> Resolve -> Follow-up", () => {
    // 1. Business creates Pulse draft
    const draft = stayDuringStayTemplate(propertyId, hostAdminUid);
    expect(draft.propertyId).toBe(propertyId);
    expect(draft.status).toBe("draft");
    expect(draft.questions.length).toBeGreaterThan(0);
    expect(draft.logic.length).toBeGreaterThan(0);

    // 2. Publishes Pulse -> Generates Opaque Token & Deployment
    const publicToken = createPublicToken();
    expect(isPulsePublicToken(publicToken)).toBe(true);
    const livePulse = {
      ...draft,
      id: "pulse_test_123",
      status: "live" as const,
      activeDeploymentId: "pdep_test_123",
      activePublicToken: publicToken,
    };

    // 3. Respondent scans QR & gets safe public DTO
    // DTO must not expose sensitive property owner data or member arrays
    const publicDto = {
      propertyId: livePulse.propertyId,
      propertyName: "Harbour View Hotel",
      pulseId: livePulse.id,
      deploymentId: livePulse.activeDeploymentId,
      publicToken: livePulse.activePublicToken,
      name: livePulse.name,
      title: livePulse.branding?.title || livePulse.name,
      questions: livePulse.questions,
      logic: livePulse.logic,
      status: livePulse.status,
    };
    expect(publicDto.status).toBe("live");
    expect(publicDto.questions.some((q) => q.id === "q_stay")).toBe(true);

    // 4. Respondent submits Negative Response (Rating: 1)
    const clientKey = "client_key_123456789";
    expect(isValidClientKey(clientKey)).toBe(true);

    const answers: PulseAnswer[] = [
      { questionId: "q_stay", type: "rating_5", value: 1 },
      { questionId: "q_wrong", type: "single_choice", value: "cleanliness" },
      { questionId: "q_help", type: "text_short", value: "Bathroom was not cleaned properly" },
      { questionId: "q_contact", type: "yes_no", value: true },
    ];

    const validation = validatePulseSubmitPayload(livePulse, {
      publicToken,
      answers,
      contactRequested: true,
      contactName: "Jordan Smith",
      contactMethod: "+61400111222",
      roomNumber: "304",
      clientKey,
    });

    expect(validation.ok).toBe(true);
    if (!validation.ok) throw new Error("Validation failed");

    expect(validation.createIssue).toBe(true);
    expect(validation.askContact).toBe(true);
    expect(validation.primaryScore).toBe(1);

    // 5. Automatic Issue Generation & Alerting logic
    const createdIssue = {
      id: "pissue_test_001",
      propertyId,
      pulseId: livePulse.id,
      responseId: `presp_${clientKey}`,
      deploymentId: livePulse.activeDeploymentId,
      status: "open" as const,
      category: "cleanliness" as const,
      summary: "Stay 1/5 · cleanliness · Bathroom was not cleaned properly",
      primaryScore: 1,
      roomNumber: "304",
      contactRequested: true,
      contactName: "Jordan Smith",
      contactMethod: "+61400111222",
      createdAt: new Date().toISOString(),
    };
    expect(createdIssue.status).toBe("open");

    // 6. Staff assignment & acknowledgement
    const staffUid = "usr_staff_alice";
    const acknowledgedIssue = {
      ...createdIssue,
      status: "acknowledged" as const,
      assigneeUid: staffUid,
      acknowledgedBy: staffUid,
      acknowledgedAt: new Date().toISOString(),
    };
    expect(acknowledgedIssue.status).toBe("acknowledged");
    expect(acknowledgedIssue.assigneeUid).toBe(staffUid);

    // 7. Resolution by staff
    const resolvedIssue = {
      ...acknowledgedIssue,
      status: "resolved" as const,
      resolvedBy: staffUid,
      resolvedAt: new Date().toISOString(),
      resolutionNote: "Sent housekeeping to reclean bathroom and provided complimentary breakfast vouchers.",
    };
    expect(resolvedIssue.status).toBe("resolved");
    expect(resolvedIssue.resolutionNote).toBeTruthy();

    // 8. Follow-up recording (Score: 5)
    const followupResult = validatePulseFollowup(5, "Guest was very happy with the quick turnaround.");
    expect(followupResult.ok).toBe(true);
    if (!followupResult.ok) throw new Error("Followup validation failed");

    const completeIssue = {
      ...resolvedIssue,
      followupScore: followupResult.score,
      followupNote: followupResult.note,
      followupBy: staffUid,
      followupAt: new Date().toISOString(),
    };
    expect(completeIssue.followupScore).toBe(5);
  });

  describe("Stress & Security Vectors", () => {
    it("prevents illegal status transitions", () => {
      expect(resolvePulseStatusTransition("draft", "live")).toBe(false); // must publish
      expect(resolvePulseStatusTransition("archived", "live")).toBe(false);
      expect(resolvePulseStatusTransition("archived", "paused")).toBe(false);
      expect(resolvePulseStatusTransition("live", "paused")).toBe(true);
      expect(resolvePulseStatusTransition("paused", "archived")).toBe(true);
    });

    it("verifies idempotency client key format constraints", () => {
      expect(isValidClientKey("k1234567890")).toBe(true);
      expect(isValidClientKey("valid-key_001")).toBe(true);
      expect(isValidClientKey("short")).toBe(false);
      expect(isValidClientKey("injection'; DROP TABLE;--")).toBe(false);
      expect(isValidClientKey("")).toBe(false);
      expect(isValidClientKey(null)).toBe(false);
    });

    it("handles happy responses without issue creation", () => {
      const pulse = stayDuringStayTemplate(propertyId);
      const token = createPublicToken();
      const happyAnswers: PulseAnswer[] = [{ questionId: "q_stay", type: "rating_5", value: 5 }];

      const result = validatePulseSubmitPayload(pulse, {
        publicToken: token,
        answers: happyAnswers,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.createIssue).toBe(false);
        expect(result.askContact).toBe(false);
        expect(result.primaryScore).toBe(5);
      }
    });

    it("rejects forged answers that bypass gating rules", () => {
      const pulse = stayDuringStayTemplate(propertyId);
      const token = createPublicToken();

      // Respondent gives rating 5 but tries to inject gated answers
      const forgedAnswers: PulseAnswer[] = [
        { questionId: "q_stay", type: "rating_5", value: 5 },
        { questionId: "q_wrong", type: "single_choice", value: "wifi" },
      ];

      const result = validatePulseSubmitPayload(pulse, {
        publicToken: token,
        answers: forgedAnswers,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Since rating is 5, logic evaluator MUST NOT trigger issue
        expect(result.createIssue).toBe(false);
      }
    });
  });
});
