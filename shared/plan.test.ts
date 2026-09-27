import { describe, expect, it } from "vitest";
import {
  hasTripItinerary,
  interestOverlap,
  isSoldOut,
  isTicketed,
  myInterestProfile,
  scheduleDays,
  PLAN_TYPES,
  PLAN_COVER_PRESETS,
  PLAN_THEMES,
  PLAN_PLUS_ONES_MAX,
  PLAN_CAPACITY_MAX,
  attendeeSeats,
  buildStopChangeMessage,
  canCompletePlanStatus,
  checkedInCount,
  choiceAnswerCounts,
  coHostAttendees,
  formatDateOption,
  formatTime12h,
  hasOpenDatePoll,
  headcountLeft,
  headcountTaken,
  isPlanManager,
  normalizeAnswer,
  normalizeCapacity,
  normalizePlusOnes,
  pastCrew,
  pendingRequests,
  reorderStops,
  planPhotos,
  setAttendeeCheckedIn,
  spotsLeft,
  stopChangeRecipients,
  textAnswers,
  topDateOption,
  validDateOption,
  validGuestQuestion,
  waitlistPosition,
  waitlistQueue,
} from "./plan";

describe("interest matching", () => {
  it("counts shared tags case-insensitively", () => {
    expect(interestOverlap(["food", "music"], ["Music", "sport"])).toBe(1);
    expect(interestOverlap(undefined, ["food"])).toBe(0);
    expect(interestOverlap([], [])).toBe(0);
  });

  it("builds a profile from the user's own plans", () => {
    const plans = [
      { interests: ["Food", "music"], attendees: [{ id: "u1" }], creator: { uid: "u1" } },
      { interests: ["sport"], attendees: [], creator: {} },
    ];
    expect(myInterestProfile(plans, "u1").sort()).toEqual(["food", "music"]);
  });
});

describe("plan occasions", () => {
  it("includes weekend escape in PLAN_TYPES with required fields", () => {
    expect(PLAN_TYPES.escape).toBeDefined();
    expect(PLAN_TYPES.escape.id).toBe("escape");
    expect(PLAN_TYPES.escape.label).toBe("Weekend Escape");
    expect(PLAN_TYPES.escape.defaultTitle).toContain("Weekend Escape");
    expect(PLAN_TYPES.escape.suggestedStops.length).toBeGreaterThanOrEqual(2);
  });

  it("exports curated plan cover presets", () => {
    expect(PLAN_COVER_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(PLAN_COVER_PRESETS.some((p) => p.category === "Weekend Escape")).toBe(true);
  });
});

describe("formatTime12h", () => {
  it("converts 24h times to AM/PM", () => {
    expect(formatTime12h("18:30")).toBe("6:30 PM");
    expect(formatTime12h("09:05")).toBe("9:05 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("00:15")).toBe("12:15 AM");
  });

  it("passes through blanks and existing AM/PM strings", () => {
    expect(formatTime12h(undefined)).toBe("");
    expect(formatTime12h("  ")).toBe("");
    expect(formatTime12h("6:30 PM")).toBe("6:30 PM");
  });
});

describe("reorderStops", () => {
  it("moves a stop from one index to another without mutating", () => {
    const stops = ["a", "b", "c"];
    expect(reorderStops(stops, 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderStops(stops, 2, 0)).toEqual(["c", "a", "b"]);
    expect(stops).toEqual(["a", "b", "c"]);
  });

  it("leaves the list unchanged for same or out-of-range indices", () => {
    expect(reorderStops(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(reorderStops(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(reorderStops(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});

describe("stop change notifications", () => {
  it("notifies every attendee and subscriber exactly once", () => {
    const recipients = stopChangeRecipients({
      attendees: [
        { id: "u1", name: "Alex", status: "going", respondedAt: "" },
        { id: "mate@mates.io", name: "Mate", status: "maybe", respondedAt: "" },
      ],
      subscribers: ["mate@mates.io", "follower@mates.io"],
    });
    expect(recipients.sort()).toEqual(["follower@mates.io", "mate@mates.io", "u1"]);
  });

  it("builds a message for each stop change action", () => {
    expect(buildStopChangeMessage("added", "Rooftop", "Alex")).toContain("Rooftop");
    expect(buildStopChangeMessage("updated", "Rooftop", "Alex")).toContain("Alex");
    expect(buildStopChangeMessage("removed", "Rooftop")).toContain("Rooftop");
    expect(buildStopChangeMessage("reordered", "", "Alex")).toContain("order");
  });
});

describe("invitation themes", () => {
  it("offers a Holographic VIP theme with full card styling", () => {
    expect(PLAN_THEMES.holographic).toBeDefined();
    expect(PLAN_THEMES.holographic.id).toBe("holographic");
    expect(PLAN_THEMES.holographic.name).toBe("Holographic VIP");
    expect(PLAN_THEMES.holographic.bgClass).toBeTruthy();
    expect(PLAN_THEMES.holographic.badgeClass).toBeTruthy();
    expect(PLAN_THEMES.holographic.accentColor).toBeTruthy();
    expect(PLAN_THEMES.holographic.foilGlow).toBeTruthy();
  });

  it("offers Hot Pink, Fluro Green, and Jet Black themes", () => {
    expect(PLAN_THEMES.hotpink.name).toBe("Hot Pink");
    expect(PLAN_THEMES.fluro.name).toBe("Fluro Green");
    expect(PLAN_THEMES.jetblack.name).toBe("Jet Black");
  });

  it("gives every theme a full-colour background plus readable foregrounds", () => {
    for (const theme of Object.values(PLAN_THEMES)) {
      expect(theme.bgClass).toBeTruthy();
      expect(theme.onThemeClass).toBeTruthy();
      expect(theme.onThemeMutedClass).toBeTruthy();
    }
    // Fluro's neon background needs dark text; the rest use white.
    expect(PLAN_THEMES.fluro.onThemeClass).toContain("zinc-950");
    expect(PLAN_THEMES.jetblack.onThemeClass).toBe("text-white");
  });
});

describe("ticketed events", () => {
  it("treats a priced experience as a ticket, not a free RSVP", () => {
    expect(isTicketed({ isExperience: true, pricePerPerson: 25, pricingModel: "fixed" })).toBe(true);
    expect(isTicketed({ isExperience: true, pricePerPerson: 0, pricingModel: "free" })).toBe(false);
    expect(isTicketed({ isExperience: false, pricePerPerson: 40, pricingModel: "fixed" })).toBe(false);
  });

  it("counts remaining tickets against capacity", () => {
    expect(spotsLeft({ capacity: 10, spotsBooked: 6 })).toBe(4);
    expect(isSoldOut({ capacity: 10, spotsBooked: 10 })).toBe(true);
    expect(isSoldOut({ capacity: 10, spotsBooked: 3 })).toBe(false);
    expect(spotsLeft({ capacity: 0, spotsBooked: 2 })).toBe(null);
  });
});

describe("headcount capacity", () => {
  const going = (id: string, plusOnes?: number) => ({
    id,
    name: id,
    status: "going" as const,
    plusOnes,
    respondedAt: "2026-09-01T00:00:00Z",
  });

  it("clamps plus-ones into range", () => {
    expect(normalizePlusOnes(2)).toBe(2);
    expect(normalizePlusOnes(-1)).toBe(0);
    expect(normalizePlusOnes(99)).toBe(PLAN_PLUS_ONES_MAX);
    expect(normalizePlusOnes("abc")).toBe(0);
  });

  it("counts seats from party sizes, going only", () => {
    expect(attendeeSeats(going("a", 2))).toBe(3);
    expect(attendeeSeats(going("b"))).toBe(1);
    expect(attendeeSeats({ ...going("c", 2), status: "maybe" })).toBe(0);
    expect(attendeeSeats(undefined)).toBe(0);
  });

  it("reports spots left or null without a limit", () => {
    const plan = { capacity: 5, attendees: [going("a", 2), going("b")] };
    expect(headcountTaken(plan)).toBe(4);
    expect(headcountLeft(plan)).toBe(1);
    expect(headcountLeft({ attendees: [going("a")] })).toBeNull();
    expect(headcountLeft({ capacity: 2, attendees: [going("a", 2)] })).toBe(0);
  });

  it("normalizes host limits, clearing on empty", () => {
    expect(normalizeCapacity("")).toBeUndefined();
    expect(normalizeCapacity("0")).toBeUndefined();
    expect(normalizeCapacity("12")).toBe(12);
    expect(normalizeCapacity("9999")).toBe(PLAN_CAPACITY_MAX);
  });
});

describe("waitlist and approval queues", () => {
  const att = (id: string, status: "going" | "waitlisted" | "pending", respondedAt: string) => ({
    id,
    name: id,
    status,
    respondedAt,
  });
  const plan = {
    attendees: [
      att("w2", "waitlisted", "2026-09-02T00:00:00Z"),
      att("g1", "going", "2026-09-01T00:00:00Z"),
      att("w1", "waitlisted", "2026-09-01T00:00:00Z"),
      att("p1", "pending", "2026-09-03T00:00:00Z"),
    ],
  };

  it("orders queues oldest-first and positions the line", () => {
    expect(waitlistQueue(plan).map((a) => a.id)).toEqual(["w1", "w2"]);
    expect(pendingRequests(plan).map((a) => a.id)).toEqual(["p1"]);
    expect(waitlistPosition(plan, "w2")).toBe(2);
    expect(waitlistPosition(plan, "g1")).toBeNull();
  });
});

describe("check-in", () => {
  const attendees = [
    { id: "a", name: "A", status: "going" as const, respondedAt: "2026-09-01T00:00:00Z" },
    {
      id: "b",
      name: "B",
      status: "going" as const,
      checkedIn: true,
      checkedInAt: "2026-09-20T09:00:00Z",
      respondedAt: "2026-09-01T00:00:00Z",
    },
  ];

  it("counts the showed and flips one flag with a stamp", () => {
    expect(checkedInCount({ attendees })).toBe(1);
    const on = setAttendeeCheckedIn(attendees, "a", true, "2026-09-20T10:00:00Z");
    expect(on.find((a) => a.id === "a")).toMatchObject({ checkedIn: true, checkedInAt: "2026-09-20T10:00:00Z" });
    expect(checkedInCount({ attendees: on })).toBe(2);
    const off = setAttendeeCheckedIn(on, "b", false);
    expect(off.find((a) => a.id === "b")).not.toHaveProperty("checkedIn");
    expect(off.find((a) => a.id === "b")).not.toHaveProperty("checkedInAt");
    expect(checkedInCount({ attendees: off })).toBe(1);
  });

  it("leaves everyone else untouched", () => {
    const next = setAttendeeCheckedIn(attendees, "nobody", true);
    expect(next).toEqual(attendees);
  });
});

describe("co-hosts and past crew", () => {
  const att = (id: string, name = id) => ({
    id,
    name,
    status: "going" as const,
    respondedAt: "2026-09-01T00:00:00Z",
  });

  it("treats creator and co-hosts as managers, no one else", () => {
    const plan = { creator: { uid: "host", name: "Host" }, coHostUids: ["co1"] };
    expect(isPlanManager(plan, "host")).toBe(true);
    expect(isPlanManager(plan, "co1")).toBe(true);
    expect(isPlanManager(plan, "guest")).toBe(false);
    expect(isPlanManager(plan, null)).toBe(false);
    expect(isPlanManager({ creator: { name: "NoUid" } }, "guest")).toBe(false);
  });

  it("resolves co-host rows and ranks past crew", () => {
    const plan = { creator: { uid: "me", name: "Me" }, coHostUids: ["co1"], attendees: [att("me"), att("co1")] };
    expect(coHostAttendees(plan).map((a) => a.id)).toEqual(["co1"]);
    expect(coHostAttendees({ attendees: [att("me")] })).toEqual([]);

    const plans = [
      { id: "p1", attendees: [att("me"), att("a"), att("b")] },
      { id: "p2", attendees: [att("me"), { ...att("a"), respondedAt: "2026-09-05T00:00:00Z" }, att("anon-1")] },
    ];
    const crew = pastCrew(plans, "me", { excludeIds: ["b"], excludePlanId: "p9", limit: 8 });
    expect(crew.map((c) => c.id)).toEqual(["a"]);
    expect(crew[0]).toMatchObject({ sharedPlans: 2, lastSeen: "2026-09-05T00:00:00Z" });
    expect(pastCrew(plans, "me", { excludePlanId: "p1" }).map((c) => c.id)).toEqual(["a"]);
  });
});

describe("shared album", () => {
  const plan = {
    comments: [
      {
        id: "c1",
        authorId: "u1",
        authorName: "Alex",
        text: "[Photos] Sunset toast",
        photoUrl: "https://img/1",
        createdAt: "2026-09-20T08:00:00Z",
      },
      { id: "c2", authorId: "u2", authorName: "Sam", text: "Just words", createdAt: "2026-09-20T09:00:00Z" },
      {
        id: "c3",
        authorId: "u3",
        authorName: "Jo",
        text: "[Photos]",
        photoUrl: "https://img/3",
        createdAt: "2026-09-20T10:00:00Z",
      },
    ],
  };

  it("feeds newest-first photo comments with clean captions", () => {
    const photos = planPhotos(plan);
    expect(photos.map((p) => p.commentId)).toEqual(["c3", "c1"]);
    expect(photos[1]).toMatchObject({ url: "https://img/1", caption: "Sunset toast", authorName: "Alex" });
    expect(photos[0]!.caption).toBe("");
  });

  it("stays empty without photos", () => {
    expect(planPhotos({ comments: [] })).toEqual([]);
    expect(planPhotos({})).toEqual([]);
  });
});

describe("date poll", () => {
  it("validates real calendar dates and times", () => {
    expect(validDateOption({ date: "2026-09-20" })).toEqual([]);
    expect(validDateOption({ date: "2026-09-20", time: "19:00" })).toEqual([]);
    expect(validDateOption({ date: "" })).toContain("Pick a date.");
    expect(validDateOption({ date: "2026-02-30" })).toContain("Pick a real date.");
    expect(validDateOption({ date: "2026-09-20", time: "25:00" })).toContain("Pick a real time.");
  });

  it("opens with options until the host locks", () => {
    expect(hasOpenDatePoll({ dateOptions: [{ id: "o1", date: "2026-09-20", votes: 0 }] })).toBe(true);
    expect(
      hasOpenDatePoll({ dateOptions: [{ id: "o1", date: "2026-09-20", votes: 0 }], datePollLocked: true }),
    ).toBe(false);
    expect(hasOpenDatePoll({})).toBe(false);
  });

  it("picks the front-runner, earliest date on ties", () => {
    const plan = {
      dateOptions: [
        { id: "o1", date: "2026-09-21", votes: 2 },
        { id: "o2", date: "2026-09-20", votes: 2 },
        { id: "o3", date: "2026-09-22", votes: 5 },
      ],
    };
    expect(topDateOption(plan)?.id).toBe("o3");
    expect(topDateOption({ dateOptions: plan.dateOptions.slice(0, 2) })?.id).toBe("o2");
    expect(topDateOption({})).toBeUndefined();
  });

  it("formats options with weekday and optional time", () => {
    expect(formatDateOption({ date: "2026-09-20", time: "19:00" })).toContain("7:00 PM");
    expect(formatDateOption({ date: "2026-09-20" })).not.toContain("·");
  });
});

describe("guest questions", () => {
  const diet = { id: "q1", question: "Any dietary needs?", type: "choice" as const, options: ["None", "Vego", "Vegan"] };
  const ride = { id: "q2", question: "How are you getting there?", type: "text" as const };

  it("validates host questions", () => {
    expect(validGuestQuestion({ question: "Diet?", type: "text", options: [] })).toEqual([]);
    expect(validGuestQuestion({ question: "", type: "text", options: [] })).toContain("Write the question.");
    expect(validGuestQuestion({ question: "X", type: "choice", options: ["Only"] })).toContain(
      "Choice needs at least 2 options.",
    );
    expect(validGuestQuestion({ question: "X", type: "choice", options: ["A", "a"] })).toContain("Options must differ.");
    expect(validGuestQuestion({ question: "X", type: "weird", options: [] })).toContain("Pick text or choice.");
  });

  it("cleans answers, keeping only listed choice options", () => {
    expect(normalizeAnswer(diet, "  vego ")).toBe("Vego");
    expect(normalizeAnswer(diet, "Keto")).toBe("");
    expect(normalizeAnswer(ride, "  Ferry  ")).toBe("Ferry");
    expect(normalizeAnswer(ride, "")).toBe("");
  });

  it("tallies choices and lists texts", () => {
    const attendees: Array<{ answers?: Record<string, string> }> = [
      { answers: { q1: "Vego", q2: "Ferry" } },
      { answers: { q1: "vego", q2: "" } },
      { answers: { q1: "None" } },
      {},
    ];
    expect(choiceAnswerCounts(diet, attendees)).toEqual([
      { option: "Vego", count: 2 },
      { option: "None", count: 1 },
      { option: "Vegan", count: 0 },
    ]);
    expect(textAnswers(ride, attendees)).toEqual(["Ferry"]);
  });
});

describe("trip itinerary", () => {
  const day = (dayNumber: number, title: string) => ({ dayNumber, title, description: "", stops: [] });
  it("orders days and renumbers without gaps", () => {
    expect(scheduleDays(undefined)).toEqual([]);
    expect(
      scheduleDays([day(3, "Coast"), day(1, "City"), { dayNumber: 0, title: "Nowhere", description: "", stops: [] }, day(2, "  ")]).map(
        (d) => [d.dayNumber, d.title],
      ),
    ).toEqual([
      [1, "City"],
      [2, "Coast"],
    ]);
  });
  it("renders only for trip/escape plans with a schedule", () => {
    expect(hasTripItinerary({ type: "trip", multiDaySchedule: [day(1, "City")] })).toBe(true);
    expect(hasTripItinerary({ type: "escape", multiDaySchedule: [day(1, "Coast")] })).toBe(true);
    expect(hasTripItinerary({ type: "trip", multiDaySchedule: [] })).toBe(false);
    expect(hasTripItinerary({ type: "nightout", multiDaySchedule: [day(1, "City")] })).toBe(false);
  });
});

describe("plan completion guard", () => {
  it("allows only live plans to close the loop", () => {
    expect(canCompletePlanStatus("open")).toBe(true);
    expect(canCompletePlanStatus("confirmed")).toBe(true);
    expect(canCompletePlanStatus("draft")).toBe(false);
    expect(canCompletePlanStatus("completed")).toBe(false);
    expect(canCompletePlanStatus("cancelled")).toBe(false);
  });
});
