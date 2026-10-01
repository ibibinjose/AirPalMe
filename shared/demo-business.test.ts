import { describe, expect, it } from "vitest";
import {
  DEMO_BUSINESS,
  DEMO_EVENT_ID,
  DEMO_LISTING_ID,
  DEMO_PLACE_ID,
  DEMO_PROPERTY_ID,
  DEMO_PROPERTY_MARKER_ID,
  DEMO_SHOWCASE,
  DEMO_TEARDOWN_COLLECTIONS,
  DEMO_TEARDOWN_SUBCOLLECTIONS,
  DEMO_VENUE_ID,
  DEMO_VENUE_MARKER_ID,
  DEMO_VENUE_PLACE_ID,
  isDemoDocId,
  isDemoModeSearch,
} from "./demo-business";

describe("demo business", () => {
  it("detects ?demo=1 onboarding runs", () => {
    expect(isDemoModeSearch("?demo=1")).toBe(true);
    expect(isDemoModeSearch("?track=x&demo=1")).toBe(true);
    expect(isDemoModeSearch("")).toBe(false);
    expect(isDemoModeSearch("?demo=0")).toBe(false);
    expect(isDemoModeSearch("?demo=true")).toBe(false);
  });

  it("uses deterministic demo- ids so rebuilds overwrite, never duplicate", () => {
    expect(DEMO_LISTING_ID).toBe("demo-list-harbour");
    expect(DEMO_EVENT_ID).toBe("demo-evt-rooftop");
    expect(DEMO_PROPERTY_ID).toBe("demo-prop-harbour");
    for (const id of [
      DEMO_LISTING_ID,
      DEMO_PLACE_ID,
      DEMO_EVENT_ID,
      DEMO_PROPERTY_ID,
      DEMO_PROPERTY_MARKER_ID,
      DEMO_VENUE_ID,
      DEMO_VENUE_PLACE_ID,
      DEMO_VENUE_MARKER_ID,
    ]) {
      expect(isDemoDocId(id)).toBe(true);
    }
    // Marker ids must not collide: lobby scan and venue scan resolve apart.
    expect(DEMO_PROPERTY_MARKER_ID).not.toBe(DEMO_VENUE_MARKER_ID);
  });

  it("mirrors the server listing→place derivation (demo ids never rewrite)", () => {
    expect(DEMO_PLACE_ID).toBe(DEMO_LISTING_ID.replace(/^list-/, "pl-"));
    expect(DEMO_PLACE_ID).toBe(DEMO_LISTING_ID);
  });

  it("validates stampable demo doc ids", () => {
    expect(isDemoDocId("demo-list-harbour")).toBe(true);
    expect(isDemoDocId("demo-evt-rooftop")).toBe(true);
    expect(isDemoDocId("list-harbour")).toBe(false);
    expect(isDemoDocId("demo-")).toBe(false);
    expect(isDemoDocId("demo-UPPER")).toBe(false);
    expect(isDemoDocId("demo-a/b")).toBe(false);
    expect(isDemoDocId("")).toBe(false);
    expect(isDemoDocId(undefined)).toBe(false);
    expect(isDemoDocId(42)).toBe(false);
  });

  it("showcases live routes for every built demo doc", () => {
    expect(DEMO_SHOWCASE.map((s) => s.key)).toEqual(["stay", "event", "business"]);
    for (const stop of DEMO_SHOWCASE) {
      expect(stop.docId.startsWith("demo-")).toBe(true);
      expect(stop.href).toContain(stop.docId === DEMO_LISTING_ID ? DEMO_PLACE_ID : stop.docId);
    }
  });

  it("covers every demo-writing collection in teardown", () => {
    for (const col of ["listings", "places", "events", "properties", "markers", "partnerVenues"]) {
      expect(DEMO_TEARDOWN_COLLECTIONS).toContain(col);
    }
    expect(DEMO_TEARDOWN_SUBCOLLECTIONS.properties).toContain("menu");
    expect(DEMO_TEARDOWN_SUBCOLLECTIONS.events).toContain("stalls");
  });

  it("ships complete honest demo content", () => {
    expect(DEMO_BUSINESS.name).toMatch(/demo/i);
    expect(DEMO_BUSINESS.address.length).toBeGreaterThan(10);
    expect(DEMO_BUSINESS.shortWhy.length).toBeGreaterThan(10);
    expect(DEMO_BUSINESS.eventName).toMatch(/demo/i);
  });
});
