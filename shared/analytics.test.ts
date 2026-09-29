import { describe, expect, it } from "vitest";
import {
  analyticsDedupeKey,
  contextFromPath,
  isQualifiedAction,
  isSeedContextId,
  loopMs,
  northStarFromEvents,
  validateAnalyticsEvent,
  WINNABLE_LOOP_TARGET_MS,
  winnableLoopMet,
  type AnalyticsEvent,
} from "./analytics";

function event(partial: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, "eventName">): AnalyticsEvent {
  return {
    eventId: partial.eventId || `11111111-1111-4111-8111-${Math.random().toString().slice(2, 14).padEnd(12, "0")}`,
    schemaVersion: 1,
    occurredAt: partial.occurredAt || "2026-09-10T10:00:00.000Z",
    anonymousSessionId: partial.anonymousSessionId || "sess-1",
    backendState: partial.backendState || "live",
    contextId: partial.contextId,
    contextType: partial.contextType,
    source: partial.source,
    properties: partial.properties || {},
    ...partial,
  };
}

describe("validateAnalyticsEvent", () => {
  it("accepts a client_error without PII", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "client_error",
        properties: { errorClass: "type", errorSource: "window", path: "/p/glenmore", name: "TypeError" },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a valid qr_scan", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "qr_scan",
        contextId: "prop_live_1",
        contextType: "property",
        properties: { contextType: "property", contextId: "prop_live_1" },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects unknown events and unknown properties are stripped", () => {
    expect(validateAnalyticsEvent({ eventName: "click_everything" }).ok).toBe(false);
    const result = validateAnalyticsEvent(
      event({
        eventName: "content_action",
        contextId: "prop_live_1",
        properties: { actionType: "map_open", contextId: "prop_live_1", extraHack: "nope" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.event.properties.extraHack).toBeUndefined();
  });

  it("rejects sensitive keys", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "ask_submitted",
        properties: { contextId: "prop_live_1", questionCategory: "wifi", question: "what is the wifi password?" },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/sensitive_key/);
  });

  it("rejects wifi passwords and emails if smuggled in allowlisted fields", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "session_started",
        properties: { entryPath: "/g/x", source: "qr", locale: "guest@gmail.com" },
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("context helpers", () => {
  it("parses stay, marker, campus, event, and bio paths", () => {
    expect(contextFromPath("/g/harbour-hotel?r=tok")).toEqual({ contextType: "property", contextId: "harbour-hotel" });
    expect(contextFromPath("/q/syd-rocks-argyle")).toEqual({ contextType: "marker", contextId: "syd-rocks-argyle" });
    expect(contextFromPath("/c/harbour-college")).toEqual({ contextType: "campus", contextId: "harbour-college" });
    expect(contextFromPath("/e/evt-1")).toEqual({ contextType: "event", contextId: "evt-1" });
    expect(contextFromPath("/@cutbar")).toEqual({ contextType: "bio", contextId: "cutbar" });
    expect(contextFromPath("/")).toBeUndefined();
  });

  it("knows seed demo contexts", () => {
    expect(isSeedContextId("harbour-hotel")).toBe(true);
    expect(isSeedContextId("prop_live_1")).toBe(false);
  });

  it("treats demo- ids as seed contexts so demo never enters KPIs", () => {
    expect(isSeedContextId("demo-harbour-stay")).toBe(true);
    expect(isSeedContextId("stay:demo-harbour-stay")).toBe(true);
    expect(isSeedContextId("demo")).toBe(false);
    expect(isSeedContextId(undefined)).toBe(false);
  });
});

describe("winnable loop (scan QR → first value in 60s)", () => {
  it("accepts loop timing props on first_value", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "first_value",
        contextId: "prop_live_1",
        properties: {
          valueType: "wifi",
          contextId: "prop_live_1",
          timeFromSessionStartMs: 12000,
          timeFromQrScanMs: 45000,
          loopTargetMet: true,
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.properties.timeFromQrScanMs).toBe(45000);
      expect(result.event.properties.loopTargetMet).toBe(true);
    }
  });

  it("keeps booking and place subtypes as qualified first values", () => {
    for (const valueType of ["booking", "place"] as const) {
      const result = validateAnalyticsEvent(
        event({
          eventName: "first_value",
          contextId: "prop_live_1",
          properties: { valueType, contextId: "prop_live_1" },
        }),
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(isQualifiedAction(result.event)).toBe(true);
    }
  });

  it("strips non-allowlisted extras from first_value", () => {
    const result = validateAnalyticsEvent(
      event({
        eventName: "first_value",
        contextId: "prop_live_1",
        properties: { valueType: "booking", contextId: "prop_live_1", destination: "stripe", category: "x" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.properties.destination).toBeUndefined();
      expect(result.event.properties.category).toBeUndefined();
    }
  });

  it("measures loop duration from ISO timestamps", () => {
    expect(loopMs("2026-09-11T12:00:00.000Z", "2026-09-11T12:00:45.000Z")).toBe(45000);
    expect(loopMs(undefined, "2026-09-11T12:00:45.000Z")).toBeUndefined();
    expect(loopMs("not-a-date", "2026-09-11T12:00:45.000Z")).toBeUndefined();
    expect(loopMs("2026-09-11T12:01:00.000Z", "2026-09-11T12:00:00.000Z")).toBeUndefined();
  });

  it("meets the 60s target only inside the window", () => {
    expect(WINNABLE_LOOP_TARGET_MS).toBe(60_000);
    expect(winnableLoopMet("2026-09-11T12:00:00.000Z", "2026-09-11T12:00:59.000Z")).toBe(true);
    expect(winnableLoopMet("2026-09-11T12:00:00.000Z", "2026-09-11T12:01:01.000Z")).toBe(false);
    expect(winnableLoopMet(undefined, "2026-09-11T12:00:00.000Z")).toBe(false);
  });
});

describe("eligibility and north-star", () => {
  it("does not count page views, demo events, or duplicate first_value", () => {
    expect(
      isQualifiedAction(
        event({
          eventName: "qr_scan",
          contextId: "prop_live_1",
          properties: { contextType: "property", contextId: "prop_live_1" },
        }),
      ),
    ).toBe(false);
    expect(
      isQualifiedAction(
        event({
          eventName: "content_action",
          contextId: "harbour-hotel",
          backendState: "local_demo",
          properties: { actionType: "map_open", contextId: "harbour-hotel" },
        }),
      ),
    ).toBe(false);
    expect(
      isQualifiedAction(
        event({
          eventName: "content_action",
          contextId: "prop_live_1",
          properties: { actionType: "map_open", contextId: "prop_live_1" },
        }),
      ),
    ).toBe(true);
    expect(
      isQualifiedAction(
        event({
          eventName: "ask_answered",
          contextId: "prop_live_1",
          properties: { contextId: "prop_live_1", answerStatus: "shown" },
        }),
      ),
    ).toBe(true);
    expect(
      isQualifiedAction(
        event({
          eventName: "ask_answered",
          contextId: "prop_live_1",
          properties: { contextId: "prop_live_1", answerStatus: "missing" },
        }),
      ),
    ).toBe(false);

    const a = event({
      eventName: "first_value",
      contextId: "prop_live_1",
      properties: { valueType: "map", contextId: "prop_live_1" },
    });
    const b = event({
      eventName: "first_value",
      eventId: "22222222-2222-4222-8222-222222222222",
      contextId: "prop_live_1",
      properties: { valueType: "wifi", contextId: "prop_live_1" },
    });
    expect(analyticsDedupeKey(a)).toBe(analyticsDedupeKey(b));
  });

  it("computes WQGA/Context from verified events only", () => {
    const now = Date.parse("2026-09-11T12:00:00.000Z");
    const events: AnalyticsEvent[] = [
      event({
        eventName: "qr_scan",
        occurredAt: "2026-09-10T10:00:00.000Z",
        contextId: "prop_a",
        anonymousSessionId: "s1",
        properties: { contextType: "property", contextId: "prop_a" },
      }),
      event({
        eventName: "content_action",
        occurredAt: "2026-09-10T10:01:00.000Z",
        contextId: "prop_a",
        anonymousSessionId: "s1",
        properties: { actionType: "wifi_reveal", contextId: "prop_a" },
      }),
      event({
        eventName: "content_action",
        occurredAt: "2026-09-10T10:02:00.000Z",
        contextId: "prop_a",
        anonymousSessionId: "s1",
        properties: { actionType: "map_open", contextId: "prop_a", contentId: "pl-1" },
      }),
      event({
        eventName: "qr_scan",
        occurredAt: "2026-09-09T09:00:00.000Z",
        contextId: "marker_b",
        anonymousSessionId: "s2",
        properties: { contextType: "marker", contextId: "marker_b" },
      }),
      event({
        eventName: "ask_answered",
        occurredAt: "2026-09-09T09:05:00.000Z",
        contextId: "marker_b",
        anonymousSessionId: "s2",
        properties: { contextId: "marker_b", answerStatus: "shown" },
      }),
      event({
        eventName: "content_action",
        occurredAt: "2026-08-01T00:00:00.000Z",
        contextId: "prop_old",
        properties: { actionType: "map_open", contextId: "prop_old" },
      }),
      event({
        eventName: "content_action",
        occurredAt: "2026-09-10T11:00:00.000Z",
        contextId: "harbour-hotel",
        backendState: "local_demo",
        properties: { actionType: "wifi_reveal", contextId: "harbour-hotel" },
      }),
    ];
    const result = northStarFromEvents(events, now);
    expect(result.id).toBe("weekly_qualified_guest_actions_per_active_qr_context");
    expect(result.activeQrContexts).toBe(2);
    expect(result.qualifiedActions).toBe(3);
    expect(result.value).toBe(1.5);
    expect(result.localDemoExcluded).toBe(1);
  });
});
