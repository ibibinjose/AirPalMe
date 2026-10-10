import { describe, expect, it, beforeEach } from "vitest";
import { isUpcomingBooking, readCachedBookings, writeCachedBookings, type BookingWithId } from "./useMyBookings";
import type { Booking } from "@shared/booking";

// In-memory localStorage and window mock for node test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      for (const k in memoryStorage) delete memoryStorage[k];
    },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

describe("useMyBookings helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleBooking = (overrides?: Partial<Booking>): Booking => ({
    id: "b-1",
    requestId: "req-1",
    planId: "p-1",
    customerUid: "usr-1",
    providerUid: "prov-1",
    providerKind: "business",
    providerName: "Darling Harbour Club",
    title: "Sydney Harbour Sunset Party",
    suburb: "Darling Harbour",
    date: "2026-10-15",
    time: "19:00",
    priceCents: 3500,
    feeCents: 525,
    paymentStatus: "paid",
    status: "confirmed",
    cancelReason: "",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  });

  it("identifies future bookings as upcoming", () => {
    const booking = sampleBooking({ date: "2026-10-20" });
    expect(isUpcomingBooking(booking, "2026-10-10")).toBe(true);
  });

  it("identifies today's bookings as upcoming", () => {
    const booking = sampleBooking({ date: "2026-10-10" });
    expect(isUpcomingBooking(booking, "2026-10-10")).toBe(true);
  });

  it("identifies past dates as not upcoming", () => {
    const booking = sampleBooking({ date: "2026-10-05" });
    expect(isUpcomingBooking(booking, "2026-10-10")).toBe(false);
  });

  it("identifies cancelled or refunded bookings as not upcoming even if future", () => {
    const cancelled = sampleBooking({ date: "2026-10-25", status: "cancelled" });
    const refunded = sampleBooking({ date: "2026-10-25", status: "refunded" });
    expect(isUpcomingBooking(cancelled, "2026-10-10")).toBe(false);
    expect(isUpcomingBooking(refunded, "2026-10-10")).toBe(false);
  });

  it("reads and writes cached bookings to localStorage", () => {
    const list: BookingWithId[] = [
      {
        ...sampleBooking(),
        id: "b-1",
      },
    ];

    expect(readCachedBookings("usr-1")).toEqual([]);

    writeCachedBookings("usr-1", list);
    const cached = readCachedBookings("usr-1");
    expect(cached).toHaveLength(1);
    expect(cached[0]?.id).toBe("b-1");
    expect(cached[0]?.title).toBe("Sydney Harbour Sunset Party");
  });

  it("gracefully handles missing user or empty storage", () => {
    expect(readCachedBookings("")).toEqual([]);
    writeCachedBookings("", []);
  });
});
