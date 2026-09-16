import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@shared/event";
import {
  estimateWalkFromRocks,
  filterCalendarEvents,
  formatEventTimeRange,
  formatRelativeBadge,
  getMonthGrid,
  groupEventsByDate,
  initialMonthFor,
  isFreeAdmission,
  isWeekendDay,
  areTimeIntervalsOverlapping,
  checkSlotCollision,
  findNearestAvailableOpening,
  MAX_EVENTS_PER_SLOT,
  CATEGORY_THEMES,
  BOOKING_THEMES,
  getEventBookingStatus,
  getEventSlotTagTheme,
} from "./calendar-utils";
import { generateIcs, generateMultipleIcs, getGoogleCalendarUrl } from "./calendar-export";

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "The Rocks Weekend Market",
    description: "Handmade crafts and local street food.",
    startsAt: "2026-09-12T10:00:00+10:00",
    endsAt: "2026-09-12T17:00:00+10:00",
    date: "2026-09-12",
    timeLabel: "10:00 AM – 5:00 PM",
    city: "Sydney",
    venue: "Playfair & George St Laneways",
    category: "market",
    categoryLabel: "Market",
    source: "local",
    isLocal: true,
    isGoing: true,
    isInterested: false,
    isLiked: true,
  },
  {
    id: "evt-2",
    title: "Argyle Laneway Jazz",
    description: "Live acoustic jazz beneath the sandstone cut.",
    startsAt: "2026-09-11T18:00:00+10:00",
    endsAt: "2026-09-11T21:00:00+10:00",
    date: "2026-09-11",
    timeLabel: "6:00 PM – 9:00 PM",
    city: "Sydney",
    venue: "Argyle Cut",
    category: "music",
    categoryLabel: "Live Music",
    source: "local",
    isLocal: true,
    isGoing: false,
    isInterested: true,
    isLiked: false,
  },
  {
    id: "evt-3",
    title: "Harbour Sunrise Yoga",
    description: "Vinyasa flow overlooking Circular Quay.",
    startsAt: "2026-09-13T06:30:00+10:00",
    endsAt: "2026-09-13T07:45:00+10:00",
    date: "2026-09-13",
    timeLabel: "6:30 AM – 7:45 AM",
    city: "Sydney",
    venue: "Campbells Cove",
    category: "community",
    categoryLabel: "Wellness",
    source: "partner",
    isLocal: true,
    isGoing: false,
    isInterested: false,
    isLiked: false,
  },
];

describe("Calendar Month Grid", () => {
  it("generates grid cells divisible by 7 for September 2026", () => {
    const grid = getMonthGrid(2026, 8, MOCK_EVENTS); // September 2026
    expect(grid.length % 7).toBe(0);
    expect(grid.length).toBeGreaterThanOrEqual(28);

    // September 1st, 2026 is a Tuesday, so Monday should be from August (trailing)
    expect(grid[0]?.isCurrentMonth).toBe(false);
    expect(grid[0]?.dayNumber).toBe(31); // Aug 31
    expect(grid[1]?.isCurrentMonth).toBe(true);
    expect(grid[1]?.dayNumber).toBe(1); // Sept 1
  });

  it("correctly identifies event days and status flags in the grid", () => {
    const grid = getMonthGrid(2026, 8, MOCK_EVENTS);
    const sept11Cell = grid.find((c) => c.dateStr === "2026-09-11");
    expect(sept11Cell).toBeDefined();
    expect(sept11Cell?.events).toHaveLength(1);
    expect(sept11Cell?.hasInterested).toBe(true);
    expect(sept11Cell?.hasGoing).toBe(false);

    const sept12Cell = grid.find((c) => c.dateStr === "2026-09-12");
    expect(sept12Cell).toBeDefined();
    expect(sept12Cell?.hasGoing).toBe(true);
    expect(sept12Cell?.hasLiked).toBe(true);
  });
});

describe("Calendar Event Filtering", () => {
  it("filters events by Going status", () => {
    const going = filterCalendarEvents(MOCK_EVENTS, "going");
    expect(going).toHaveLength(1);
    expect(going[0]?.id).toBe("evt-1");
  });

  it("filters events by Interested status", () => {
    const interested = filterCalendarEvents(MOCK_EVENTS, "interested");
    expect(interested).toHaveLength(1);
    expect(interested[0]?.id).toBe("evt-2");
  });

  it("filters events by Liked status", () => {
    const liked = filterCalendarEvents(MOCK_EVENTS, "liked");
    expect(liked).toHaveLength(1);
    expect(liked[0]?.id).toBe("evt-1");
  });

  it("filters events by specific date", () => {
    const onDate = filterCalendarEvents(MOCK_EVENTS, "all", "", "all", "2026-09-11");
    expect(onDate).toHaveLength(1);
    expect(onDate[0]?.title).toBe("Argyle Laneway Jazz");
  });

  it("filters events by search query", () => {
    const searched = filterCalendarEvents(MOCK_EVENTS, "all", "yoga");
    expect(searched).toHaveLength(1);
    expect(searched[0]?.id).toBe("evt-3");
  });

  it("filters events by category", () => {
    const markets = filterCalendarEvents(MOCK_EVENTS, "all", "", "market");
    expect(markets).toHaveLength(1);
    expect(markets[0]?.id).toBe("evt-1");
  });

  it("combines date, search, and category filters (selected-day contract)", () => {
    // A query matching only another day's event empties the selected day.
    expect(filterCalendarEvents(MOCK_EVENTS, "all", "yoga", "all", "2026-09-11")).toHaveLength(0);
    // Date + matching query + matching category narrows to one event.
    const one = filterCalendarEvents(MOCK_EVENTS, "all", "jazz", "music", "2026-09-11");
    expect(one).toHaveLength(1);
    expect(one[0]?.id).toBe("evt-2");
    // A mismatched category empties the day even when it holds events.
    expect(filterCalendarEvents(MOCK_EVENTS, "all", "", "market", "2026-09-11")).toHaveLength(0);
  });

  it("applies attendance, search, and category without a date (month-grid contract)", () => {
    const dots = filterCalendarEvents(MOCK_EVENTS, "local", "market", "market");
    expect(dots).toHaveLength(1);
    expect(dots[0]?.id).toBe("evt-1");
    expect(filterCalendarEvents(MOCK_EVENTS, "going", "yoga", "all")).toHaveLength(0);
  });
});

describe("Event Grouping & Formatting", () => {
  it("groups events chronologically by date", () => {
    const groups = groupEventsByDate(MOCK_EVENTS);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.dateStr).toBe("2026-09-11");
    expect(groups[1]?.dateStr).toBe("2026-09-12");
    expect(groups[2]?.dateStr).toBe("2026-09-13");
  });

  it("formats relative badges accurately", () => {
    const today = formatRelativeBadge("2026-09-11", "2026-09-11");
    expect(today.label).toBe("Today");
    expect(today.highlight).toBe(true);

    const tomorrow = formatRelativeBadge("2026-09-12", "2026-09-11");
    expect(tomorrow.label).toBe("Tomorrow");
    expect(tomorrow.highlight).toBe(true);

    const future = formatRelativeBadge("2026-09-13", "2026-09-11");
    expect(future.label).toBe("This Sun");
  });

  it("formats event time range", () => {
    const range = formatEventTimeRange("2026-09-11T18:00:00+10:00", "2026-09-11T21:00:00+10:00");
    expect(range).toContain("6:00 pm");
    expect(range).toContain("9:00 pm");
  });
});

describe("Calendar Export (ICS & Google Calendar)", () => {
  it("generates a valid RFC 5545 ICS string", () => {
    const ics = generateIcs(MOCK_EVENTS[0]!);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:The Rocks Weekend Market");
    expect(ics).toContain("LOCATION:Playfair & George St Laneways\\, Sydney");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("generates a valid Google Calendar URL", () => {
    const url = getGoogleCalendarUrl(MOCK_EVENTS[0]!);
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=The+Rocks+Weekend+Market");
  });
});

describe("initialMonthFor", () => {
  const at = (date: string) => ({ date });

  it("opens on the month of the nearest upcoming event", () => {
    const month = initialMonthFor([at("2026-09-11"), at("2026-10-03"), at("2026-09-26")], "2026-09-12");
    expect(month.getFullYear()).toBe(2026);
    expect(month.getMonth()).toBe(8);
    expect(month.getDate()).toBe(1);
  });

  it("skips past months entirely", () => {
    const month = initialMonthFor([at("2026-09-11"), at("2026-10-03")], "2026-09-30");
    expect(month.getMonth()).toBe(9);
  });

  it("falls back to the latest event month when everything passed", () => {
    const month = initialMonthFor([at("2026-09-11"), at("2026-10-03")], "2027-01-05");
    expect(month.getMonth()).toBe(9);
  });

  it("falls back to today with no events", () => {
    const month = initialMonthFor([], "2026-09-12");
    expect(month.getFullYear()).toBe(2026);
    expect(month.getMonth()).toBe(8);
  });
});

describe("New Calendar Features & Filters", () => {
  it("filters events by weekend correctly", () => {
    const weekendEvents = filterCalendarEvents(MOCK_EVENTS, "weekend");
    // 2026-09-12 is Saturday, 2026-09-13 is Sunday, 2026-09-11 is Friday
    expect(weekendEvents.map((e) => e.id)).toEqual(["evt-1", "evt-3"]);
  });

  it("checks weekend days accurately", () => {
    // 2026-09-12 is Saturday, 2026-09-13 is Sunday, 2026-09-14 is Monday
    expect(isWeekendDay(new Date("2026-09-12T12:00:00"))).toBe(true);
    expect(isWeekendDay(new Date("2026-09-13T12:00:00"))).toBe(true);
    expect(isWeekendDay(new Date("2026-09-14T12:00:00"))).toBe(false);
  });

  it("checks free admission accurately", () => {
    expect(isFreeAdmission("Free")).toBe(true);
    expect(isFreeAdmission("Free Entry")).toBe(true);
    expect(isFreeAdmission("$0")).toBe(true);
    expect(isFreeAdmission(undefined)).toBe(true);
    expect(isFreeAdmission("$35 - $60")).toBe(false);
  });

  it("filters events by free admission", () => {
    const freeEvents = filterCalendarEvents(MOCK_EVENTS, "free");
    expect(freeEvents.length).toBeGreaterThan(0);
  });

  it("estimates walking time from The Rocks accurately", () => {
    const playfair = estimateWalkFromRocks("Playfair & George St Laneways");
    expect(playfair.minutes).toBeLessThanOrEqual(5);
    expect(playfair.label).toContain("In The Rocks");

    const quay = estimateWalkFromRocks("Circular Quay Wharf 4");
    expect(quay.label).toContain("Circular Quay");
  });

  it("generates multi-event batch itinerary ICS", () => {
    const multiIcs = generateMultipleIcs(MOCK_EVENTS, "Sydney Trip");
    expect(multiIcs).toContain("BEGIN:VCALENDAR");
    expect(multiIcs).toContain("X-WR-CALNAME:Sydney Trip");
    expect(multiIcs).toContain("The Rocks Weekend Market");
    expect(multiIcs).toContain("Argyle Laneway Jazz");
    expect(multiIcs).toContain("Harbour Sunrise Yoga");
    expect(multiIcs).toContain("END:VCALENDAR");
  });
});

describe("Collision Prevention & Nearest Slot Opening", () => {
  it("detects time overlaps correctly with areTimeIntervalsOverlapping", () => {
    // Overlapping intervals
    expect(
      areTimeIntervalsOverlapping(
        "2026-09-12T10:00:00+10:00",
        "2026-09-12T15:00:00+10:00",
        "2026-09-12T12:00:00+10:00",
        "2026-09-12T17:00:00+10:00",
      ),
    ).toBe(true);

    // Non-overlapping sequential intervals (event B starts at event A's end)
    expect(
      areTimeIntervalsOverlapping(
        "2026-09-12T10:00:00+10:00",
        "2026-09-12T12:00:00+10:00",
        "2026-09-12T12:00:00+10:00",
        "2026-09-12T14:00:00+10:00",
      ),
    ).toBe(false);

    // Non-overlapping completely distinct intervals
    expect(
      areTimeIntervalsOverlapping(
        "2026-09-12T10:00:00+10:00",
        "2026-09-12T12:00:00+10:00",
        "2026-09-12T18:00:00+10:00",
        "2026-09-12T21:00:00+10:00",
      ),
    ).toBe(false);
  });

  it("identifies collisions when moving an event onto a conflicting time slot", () => {
    const marketEvent = MOCK_EVENTS[0]; // 10:00 - 17:00
    // Create an event on Sept 14 at 12:00 - 14:00
    const conflictingEvent: CalendarEvent = {
      ...MOCK_EVENTS[1],
      id: "evt-conflict",
      title: "Conflicting Workshop",
      date: "2026-09-14",
      startsAt: "2026-09-14T12:00:00+10:00",
      endsAt: "2026-09-14T14:00:00+10:00",
    };

    const allEvents = [...MOCK_EVENTS, conflictingEvent];

    // Moving marketEvent to 2026-09-14 (10:00 - 17:00) overlaps with 12:00 - 14:00
    const collision = checkSlotCollision(marketEvent, "2026-09-14", allEvents, "2026-09-10");
    expect(collision.hasCollision).toBe(true);
    expect(collision.isOverlapping).toBe(true);
    expect(collision.reason).toContain("Conflicting Workshop");
    expect(collision.nearestOpening).toBeDefined();
    expect(collision.nearestOpening?.dateStr).not.toBe("2026-09-14");
  });

  it("finds a clean opening when a date is open and non-overlapping", () => {
    const marketEvent = MOCK_EVENTS[0];
    // 2026-09-15 has no events at all
    const collision = checkSlotCollision(marketEvent, "2026-09-15", MOCK_EVENTS, "2026-09-10");
    expect(collision.hasCollision).toBe(false);
    expect(collision.isOverlapping).toBe(false);
    expect(collision.isFullyBooked).toBe(false);
    expect(collision.nearestOpening).toBeNull();
  });

  it("detects fully booked slots when event count reaches MAX_EVENTS_PER_SLOT", () => {
    const marketEvent = MOCK_EVENTS[0];
    const busyDate = "2026-09-16";
    const busyEvents: CalendarEvent[] = [];

    for (let i = 0; i < MAX_EVENTS_PER_SLOT; i++) {
      busyEvents.push({
        ...MOCK_EVENTS[1],
        id: `evt-busy-${i}`,
        title: `Event ${i + 1}`,
        date: busyDate,
        // Distinct non-overlapping times
        startsAt: `2026-09-16T0${i * 2 + 1}:00:00+10:00`,
        endsAt: `2026-09-16T0${i * 2 + 2}:00:00+10:00`,
      });
    }

    const collision = checkSlotCollision(marketEvent, busyDate, busyEvents, "2026-09-10");
    expect(collision.hasCollision).toBe(true);
    expect(collision.isFullyBooked).toBe(true);
    expect(collision.nearestOpening).toBeDefined();
  });

  it("finds the nearest available date opening skipping conflicts", () => {
    const marketEvent = MOCK_EVENTS[0];
    const baseDate = "2026-09-14";
    // Place conflicts on 2026-09-14 and 2026-09-15
    const conflicts: CalendarEvent[] = [
      {
        ...marketEvent,
        id: "c-1",
        date: "2026-09-14",
        startsAt: "2026-09-14T10:00:00+10:00",
        endsAt: "2026-09-14T17:00:00+10:00",
      },
      {
        ...marketEvent,
        id: "c-2",
        date: "2026-09-15",
        startsAt: "2026-09-15T10:00:00+10:00",
        endsAt: "2026-09-15T17:00:00+10:00",
      },
    ];

    const opening = findNearestAvailableOpening(marketEvent, baseDate, conflicts, "2026-09-14");
    expect(opening).toBeDefined();
    // Since 14 and 15 are blocked and reference is 14, 16 is candidate (+2 days)
    expect(opening?.dateStr).toBe("2026-09-16");
  });

  describe("Color-Coded Tags & Booking Themes", () => {
    it("returns distinct category themes with tags and border accents", () => {
      const marketTheme = CATEGORY_THEMES.market;
      expect(marketTheme.label).toBe("Market");
      expect(marketTheme.shortTag).toBe("Market");
      expect(marketTheme.tagClass).toContain("border-l-2 border-l-emerald-600");

      const musicTheme = CATEGORY_THEMES.music;
      expect(musicTheme.label).toBe("Live Music");
      expect(musicTheme.shortTag).toBe("Music");
      expect(musicTheme.tagClass).toContain("border-l-2 border-l-violet-600");

      const foodTheme = CATEGORY_THEMES.food;
      expect(foodTheme.label).toBe("Food & Drinks");
      expect(foodTheme.tagClass).toContain("border-l-2 border-l-amber-600");

      const workshopTheme = CATEGORY_THEMES.workshop;
      expect(workshopTheme.label).toBe("Workshop");
      expect(workshopTheme.tagClass).toContain("border-l-2 border-l-rose-600");
    });

    it("identifies booking status correctly for confirmed, tentative, and rescheduled events", () => {
      const bookedEvent: CalendarEvent = { ...MOCK_EVENTS[0], isGoing: true, isInterested: false, isRescheduled: false };
      expect(getEventBookingStatus(bookedEvent)).toBe("booked");

      const tentativeEvent: CalendarEvent = { ...MOCK_EVENTS[1], isGoing: false, isInterested: true, isRescheduled: false };
      expect(getEventBookingStatus(tentativeEvent)).toBe("tentative");

      const rescheduledEvent: CalendarEvent = { ...MOCK_EVENTS[0], isRescheduled: true };
      expect(getEventBookingStatus(rescheduledEvent)).toBe("rescheduled");

      const exploreEvent: CalendarEvent = { ...MOCK_EVENTS[2], isGoing: false, isInterested: false, isRescheduled: false };
      expect(getEventBookingStatus(exploreEvent)).toBe("explore");
    });

    it("returns appropriate slot tag theme in both category and booking modes", () => {
      expect(BOOKING_THEMES.booked.shortTag).toBe("Booked");
      expect(BOOKING_THEMES.rescheduled.shortTag).toBe("Moved");

      const musicEvent = MOCK_EVENTS[1]; // music, interested: true
      const catTheme = getEventSlotTagTheme(musicEvent, "category");
      expect(catTheme.shortTag).toBe("Music");
      expect(catTheme.label).toBe("Live Music");

      const bookingTheme = getEventSlotTagTheme(musicEvent, "booking");
      expect(bookingTheme.shortTag).toBe("Interested");
      expect(bookingTheme.label).toBe("Interested / Saved");
    });
  });
});

describe("Filter block themes", () => {
  it("gives every category a colourful block, active, and count style", () => {
    for (const [id, theme] of Object.entries(CATEGORY_THEMES)) {
      expect(theme.blockClass, `${id} blockClass`).toContain("ring-");
      expect(theme.blockActiveClass, `${id} blockActiveClass`).toMatch(/bg-\w+-600/);
      expect(theme.countClass, `${id} countClass`).toContain("ring-");
    }
  });

  it("gives every booking status a block style", () => {
    for (const [id, theme] of Object.entries(BOOKING_THEMES)) {
      expect(theme.blockClass, `${id} blockClass`).toContain("ring-");
      expect(theme.blockActiveClass, `${id} blockActiveClass`).toContain("text-white");
    }
  });
});
