import { describe, expect, it } from "vitest";
import { aggregateDailyFacts, dailyFactId, wqgaFromFacts } from "./analytics-aggregate";
import type { AnalyticsEvent } from "./analytics";

function event(partial: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, "eventName" | "contextId">): AnalyticsEvent {
  return {
    eventId: partial.eventId || `${partial.eventName}-${partial.contextId}-${partial.occurredAt || "t"}`,
    schemaVersion: 1,
    occurredAt: partial.occurredAt || "2026-09-10T10:00:00.000Z",
    anonymousSessionId: partial.anonymousSessionId || "sess",
    backendState: partial.backendState || "live",
    properties: partial.properties || {},
    ...partial,
  };
}

describe("daily aggregation", () => {
  it("is idempotent: running twice on the same events yields the same facts and ids", () => {
    const events: AnalyticsEvent[] = [
      event({
        eventName: "qr_scan",
        contextId: "prop_a",
        contextType: "property",
        properties: { contextType: "property", contextId: "prop_a" },
      }),
      event({
        eventName: "content_action",
        contextId: "prop_a",
        properties: { actionType: "map_open", contextId: "prop_a" },
      }),
      event({
        eventName: "content_action",
        eventId: "dup-2",
        contextId: "prop_a",
        properties: { actionType: "map_open", contextId: "prop_a" },
      }),
    ];
    const first = aggregateDailyFacts(events);
    const second = aggregateDailyFacts(events);
    expect(first).toEqual(second);
    expect(first[0]?.qualifiedActions).toBe(1);
    expect(first[0]?.duplicateEventsExcluded).toBe(1);
    expect(dailyFactId("prop_a", "2026-09-10")).toBe("prop_a_2026-09-10_1");
  });

  it("excludes local_demo from WQGA and keeps a known WQGA/Context", () => {
    const now = Date.parse("2026-09-11T12:00:00.000Z");
    const events: AnalyticsEvent[] = [
      event({
        eventName: "qr_scan",
        contextId: "live-1",
        occurredAt: "2026-09-10T08:00:00.000Z",
        anonymousSessionId: "a",
        properties: { contextType: "property", contextId: "live-1" },
      }),
      event({
        eventName: "content_action",
        contextId: "live-1",
        occurredAt: "2026-09-10T08:01:00.000Z",
        anonymousSessionId: "a",
        properties: { actionType: "wifi_reveal", contextId: "live-1" },
      }),
      event({
        eventName: "qr_scan",
        contextId: "harbour-hotel",
        backendState: "local_demo",
        occurredAt: "2026-09-10T08:00:00.000Z",
        properties: { contextType: "property", contextId: "harbour-hotel" },
      }),
    ];
    const star = wqgaFromFacts(events, now);
    expect(star.activeQrContexts).toBe(1);
    expect(star.qualifiedActions).toBe(1);
    expect(star.value).toBe(1);
    expect(star.localDemoExcluded).toBeGreaterThan(0);
  });
});
