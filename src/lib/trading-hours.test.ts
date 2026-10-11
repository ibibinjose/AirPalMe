import { describe, expect, it } from "vitest";
import {
  createDefaultSchedule,
  format7DaySchedule,
  formatDayHours,
  formatTime12h,
  get7DayBreakdown,
  parseHoursTo7DaySchedule,
  TRADING_HOURS_PRESETS,
} from "./trading-hours";

describe("trading-hours helper", () => {
  describe("formatTime12h", () => {
    it("formats 24h string to 12h with AM/PM", () => {
      expect(formatTime12h("09:00")).toBe("9:00 AM");
      expect(formatTime12h("17:00")).toBe("5:00 PM");
      expect(formatTime12h("00:00")).toBe("12:00 AM");
      expect(formatTime12h("12:30")).toBe("12:30 PM");
      expect(formatTime12h("23:45")).toBe("11:45 PM");
    });

    it("supports compact format", () => {
      expect(formatTime12h("09:00", true)).toBe("9am");
      expect(formatTime12h("17:30", true)).toBe("5:30pm");
      expect(formatTime12h("12:00", true)).toBe("12pm");
    });
  });

  describe("formatDayHours", () => {
    it("formats open, closed, 24h, and late schedules", () => {
      expect(formatDayHours({ status: "open", openTime: "08:00", closeTime: "16:00" })).toBe("8:00 AM – 4:00 PM");

      expect(formatDayHours({ status: "closed", openTime: "09:00", closeTime: "17:00" })).toBe("Closed");

      expect(formatDayHours({ status: "24hours", openTime: "00:00", closeTime: "23:59" })).toBe("Open 24 Hours");

      expect(
        formatDayHours({
          status: "open",
          openTime: "16:00",
          closeTime: "00:00",
          isLate: true,
        }),
      ).toBe("4:00 PM – Late");
    });
  });

  describe("format7DaySchedule", () => {
    it("formats standard Mon–Fri open, Sat–Sun closed", () => {
      const sched = createDefaultSchedule();
      expect(format7DaySchedule(sched)).toBe("Mon–Fri 9:00 AM – 5:00 PM, Sat–Sun Closed");
    });

    it("formats identical 7-day schedule with Daily prefix", () => {
      const cafe = TRADING_HOURS_PRESETS.find((p) => p.id === "cafe_daily")!.build();
      expect(format7DaySchedule(cafe)).toBe("Daily 7:00 AM – 4:00 PM");
    });

    it("formats 24/7 schedule", () => {
      const open24 = TRADING_HOURS_PRESETS.find((p) => p.id === "open_24_7")!.build();
      expect(format7DaySchedule(open24)).toBe("Open 24 Hours");
      expect(format7DaySchedule(open24, true)).toBe("24/7");
    });

    it("formats multi-tier schedules like weekdays vs weekends", () => {
      const cafeShift = TRADING_HOURS_PRESETS.find((p) => p.id === "cafe_weekend_shift")!.build();
      expect(format7DaySchedule(cafeShift)).toBe("Mon–Fri 7:00 AM – 3:00 PM, Sat–Sun 8:00 AM – 2:00 PM");
    });

    it("formats restaurants closed on Mondays", () => {
      const rest = TRADING_HOURS_PRESETS.find((p) => p.id === "restaurant_dinner")!.build();
      expect(format7DaySchedule(rest)).toBe("Mon Closed, Tue–Sat 12:00 PM – 10:00 PM, Sun 12:00 PM – 9:30 PM");
    });
  });

  describe("parseHoursTo7DaySchedule", () => {
    it("parses Google Places semicolon format", () => {
      const googleHours =
        "Monday: 7:00 AM - 4:00 PM; Tuesday: 7:00 AM - 4:00 PM; Wednesday: 7:00 AM - 4:00 PM; Thursday: 7:00 AM - 4:00 PM; Friday: 7:00 AM - 4:00 PM; Saturday: 8:00 AM - 2:00 PM; Sunday: Closed";
      const parsed = parseHoursTo7DaySchedule(googleHours);

      expect(parsed.mon).toEqual({
        status: "open",
        openTime: "07:00",
        closeTime: "16:00",
        isLate: false,
      });
      expect(parsed.fri).toEqual({
        status: "open",
        openTime: "07:00",
        closeTime: "16:00",
        isLate: false,
      });
      expect(parsed.sat).toEqual({
        status: "open",
        openTime: "08:00",
        closeTime: "14:00",
        isLate: false,
      });
      expect(parsed.sun.status).toBe("closed");
    });

    it("parses collapsed format like Mon–Fri 9am–5pm, Sat–Sun Closed", () => {
      const raw = "Mon–Fri 9am–5pm, Sat–Sun Closed";
      const parsed = parseHoursTo7DaySchedule(raw);

      expect(parsed.mon.status).toBe("open");
      expect(parsed.mon.openTime).toBe("09:00");
      expect(parsed.mon.closeTime).toBe("17:00");
      expect(parsed.fri.status).toBe("open");
      expect(parsed.sat.status).toBe("closed");
      expect(parsed.sun.status).toBe("closed");
    });

    it("parses 24 Hours / 24/7", () => {
      const parsed = parseHoursTo7DaySchedule("Open 24 Hours");
      expect(parsed.mon.status).toBe("24hours");
      expect(parsed.sun.status).toBe("24hours");
    });

    it("parses generic 8am–5pm as all 7 days", () => {
      const parsed = parseHoursTo7DaySchedule("8am–5pm");
      expect(parsed.mon).toEqual({
        status: "open",
        openTime: "08:00",
        closeTime: "17:00",
        isLate: false,
      });
      expect(parsed.sat).toEqual({
        status: "open",
        openTime: "08:00",
        closeTime: "17:00",
        isLate: false,
      });
    });
  });

  describe("get7DayBreakdown", () => {
    it("returns 7 items in order Monday through Sunday", () => {
      const breakdown = get7DayBreakdown("Mon–Fri 8am–4pm, Sat–Sun Closed", 1); // Monday
      expect(breakdown).toHaveLength(7);
      expect(breakdown[0].dayName).toBe("Monday");
      expect(breakdown[0].isToday).toBe(true);
      expect(breakdown[0].hoursText).toBe("8:00 AM – 4:00 PM");
      expect(breakdown[5].dayName).toBe("Saturday");
      expect(breakdown[5].status).toBe("closed");
      expect(breakdown[5].hoursText).toBe("Closed");
      expect(breakdown[6].dayName).toBe("Sunday");
      expect(breakdown[6].isToday).toBe(false);
    });
  });
});
