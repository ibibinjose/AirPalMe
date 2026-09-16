import { describe, expect, it } from "vitest";
import {
  addRoomsToType,
  buildRoomType,
  normalizeRoomStatus,
  occupancySummary,
  pruneRoomStatuses,
  removeRoomFromType,
  roomTypeForNumber,
  setRoomStatus,
  suggestRoomNumbers,
  validateRoomTypeDraft,
  type RoomTypeDraft,
} from "./host-rooms";
import type { RoomType } from "@shared/airpal-data";

const base: RoomType = {
  id: "rt_std",
  name: "Standard Queen",
  category: "Standard",
  capacity: 2,
  bedConfig: "1 Queen Bed",
  totalRooms: 2,
  startingPrice: 180,
  features: [],
  roomNumbers: ["101", "102"],
};

const draft: RoomTypeDraft = {
  name: "Deluxe King",
  category: "Deluxe",
  capacity: 2,
  bedConfig: "1 King Bed",
  startingPrice: 320,
  features: ["Harbour view"],
  startNumber: "201",
  count: 2,
};

describe("host rooms", () => {
  it("continues the numeric run when a host adds more rooms", () => {
    expect(suggestRoomNumbers(["101", "102"], "101", 3)).toEqual(["103", "104", "105"]);
  });

  it("honours a free start number and skips taken ones", () => {
    expect(suggestRoomNumbers([], "201", 2)).toEqual(["201", "202"]);
    expect(suggestRoomNumbers(["101", "103"], "101", 2)).toEqual(["102", "104"]);
    expect(suggestRoomNumbers([], "101", 500)).toHaveLength(50);
  });

  it("suffixes non-numeric rooms like dorm beds", () => {
    expect(suggestRoomNumbers(["B12"], "B12", 2)).toEqual(["B12-2", "B12-3"]);
  });

  it("rejects drafts with no name, no beds, or a bad price", () => {
    expect(validateRoomTypeDraft({ ...draft, name: " " }, [])).toMatch(/name/);
    expect(validateRoomTypeDraft({ ...draft, bedConfig: "" }, [])).toMatch(/bed/);
    expect(validateRoomTypeDraft({ ...draft, startingPrice: 0 }, [])).toMatch(/price/);
    expect(validateRoomTypeDraft(draft, [])).toBeNull();
  });

  it("builds a room type with generated numbers", () => {
    const built = buildRoomType(draft, [base]);
    expect(built.name).toBe("Deluxe King");
    expect(built.roomNumbers).toEqual(["201", "202"]);
    expect(built.totalRooms).toBe(2);
  });

  it("adds rooms to a type without touching the others", () => {
    const next = addRoomsToType([base], "rt_std", 2);
    expect(next[0]!.roomNumbers).toEqual(["101", "102", "103", "104"]);
    expect(next[0]!.totalRooms).toBe(4);
    expect(base.roomNumbers).toEqual(["101", "102"]);
  });

  it("removes a single room number", () => {
    const next = removeRoomFromType([base], "rt_std", "101");
    expect(next[0]!.roomNumbers).toEqual(["102"]);
    expect(next[0]!.totalRooms).toBe(1);
  });

  it("sets, prunes, and rolls up room statuses", () => {
    expect(setRoomStatus(undefined, "101", "occupied")).toEqual({ 101: "occupied" });
    expect(setRoomStatus({ 101: "vacant" }, "101", "cleaning")).toEqual({ 101: "cleaning" });
    expect(pruneRoomStatuses({ 101: "occupied", 999: "vacant" }, ["101"])).toEqual({ 101: "occupied" });
    expect(normalizeRoomStatus("bogus")).toBe("vacant");
    expect(occupancySummary({ 101: "occupied", 102: "vacant", 103: "cleaning" })).toEqual({
      occupied: 1,
      vacant: 1,
      total: 3,
    });
  });

  it("matches a guest room number to its type", () => {
    expect(roomTypeForNumber([base], "102")?.id).toBe("rt_std");
    expect(roomTypeForNumber([base], " 102 ")?.id).toBe("rt_std");
    expect(roomTypeForNumber([base], "999")).toBeNull();
    expect(roomTypeForNumber(undefined, "102")).toBeNull();
  });
});
