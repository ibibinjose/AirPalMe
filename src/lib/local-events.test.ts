import { describe, expect, it } from "vitest";
import { THE_ROCKS_EVENTS } from "@shared/the-rocks-data";
import { eventsLiveNow, eventsTonight, isEventLiveNow } from "./local-events";

const TZ = "Australia/Sydney";

describe("eventsTonight / eventsLiveNow", () => {
  it("does not treat weekend markets as live on a Monday", () => {
    const mondayNoon = new Date("2026-09-14T12:00:00+10:00");
    const live = eventsLiveNow(THE_ROCKS_EVENTS, mondayNoon, TZ);
    expect(live.some((e) => e.id === "rocks-markets-weekend")).toBe(false);
    const tonight = eventsTonight(THE_ROCKS_EVENTS, mondayNoon, TZ);
    expect(tonight.some((e) => e.id === "rocks-markets-weekend")).toBe(false);
  });

  it("marks golden hour live during the window and not after", () => {
    const during = new Date("2026-09-14T18:00:00+10:00");
    const after = new Date("2026-09-14T20:00:00+10:00");
    const event = THE_ROCKS_EVENTS.find((e) => e.id === "glenmore-golden-hour")!;
    expect(isEventLiveNow(event, during, TZ)).toBe(true);
    expect(isEventLiveNow(event, after, TZ)).toBe(false);
  });

  it("drops the ended afternoon session after close", () => {
    const evening = new Date("2026-09-14T18:00:00+10:00");
    const event = THE_ROCKS_EVENTS.find((e) => e.id === "argyle-acoustic-session")!;
    expect(isEventLiveNow(event, evening, TZ)).toBe(false);
    expect(eventsTonight(THE_ROCKS_EVENTS, evening, TZ).some((e) => e.id === event.id)).toBe(false);
  });

  it("keeps Saturday markets live at midday", () => {
    const saturday = new Date("2026-09-12T12:00:00+10:00");
    expect(eventsLiveNow(THE_ROCKS_EVENTS, saturday, TZ).some((e) => e.id === "rocks-markets-weekend")).toBe(true);
  });
});
