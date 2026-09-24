import { describe, expect, it } from "vitest";
import { canTransitionPing, isOpenPing, type PingActor, type PingStatus } from "./ping";

describe("canTransitionPing", () => {
  it("lets the recipient answer a sent ping", () => {
    for (const next of ["pinged_back", "hanging_out", "dismissed"] as const) {
      expect(canTransitionPing("sent", next, "recipient")).toBe(true);
    }
  });

  it("lets only the sender cancel their own sent ping", () => {
    expect(canTransitionPing("sent", "cancelled", "sender")).toBe(true);
    expect(canTransitionPing("sent", "cancelled", "recipient")).toBe(false);
    expect(canTransitionPing("sent", "pinged_back", "sender")).toBe(false);
  });

  it("advances pinged_back toward hanging out or dismissed", () => {
    expect(canTransitionPing("pinged_back", "hanging_out", "recipient")).toBe(true);
    expect(canTransitionPing("pinged_back", "hanging_out", "sender")).toBe(true);
    expect(canTransitionPing("pinged_back", "dismissed", "recipient")).toBe(true);
    expect(canTransitionPing("pinged_back", "sent", "recipient")).toBe(false);
  });

  it("treats dismissed and cancelled as terminal", () => {
    for (const current of ["dismissed", "cancelled"] as const) {
      for (const actor of ["sender", "recipient"] as const) {
        const nexts: PingStatus[] = ["sent", "pinged_back", "hanging_out", "dismissed"];
        for (const next of nexts) {
          expect(canTransitionPing(current, next, actor as PingActor)).toBe(false);
        }
      }
    }
  });

  it("lets admins moderate but never no-op", () => {
    expect(canTransitionPing("sent", "dismissed", "admin")).toBe(true);
    expect(canTransitionPing("sent", "sent", "admin")).toBe(false);
  });
});

describe("isOpenPing", () => {
  it("counts sent and pinged_back as open", () => {
    expect(isOpenPing("sent")).toBe(true);
    expect(isOpenPing("pinged_back")).toBe(true);
    expect(isOpenPing("hanging_out")).toBe(false);
    expect(isOpenPing("dismissed")).toBe(false);
    expect(isOpenPing("cancelled")).toBe(false);
  });
});
