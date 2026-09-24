import { describe, expect, it } from "vitest";
import { parseQrPayload, pathForIntent } from "./qr";

describe("qr payload", () => {
  it("routes @handle to the public bio", () => {
    expect(parseQrPayload("https://airpal.me/@cutbar")).toEqual({ kind: "url", href: "/@cutbar" });
    expect(pathForIntent({ kind: "url", href: "/@cutbar" })).toBe("/@cutbar");
  });

  it("keeps room tokens on stay URLs", () => {
    expect(parseQrPayload("https://airpal.me/g/harbour-hotel?r=tok-101-demo&room=101")).toEqual({
      kind: "stay",
      propertyId: "harbour-hotel",
      roomToken: "tok-101-demo",
      room: "101",
      type: undefined,
    });
    expect(pathForIntent({ kind: "stay", propertyId: "harbour-hotel", roomToken: "tok-101-demo", room: "101" })).toBe(
      "/g/harbour-hotel?r=tok-101-demo&room=101",
    );
  });

  it("routes a Wave QR to /w/CODE", () => {
    expect(parseQrPayload("https://airpal.me/w/glen12")).toEqual({ kind: "url", href: "/w/GLEN12" });
    expect(pathForIntent({ kind: "url", href: "/w/GLEN12" })).toBe("/w/GLEN12");
  });

  it("keeps /q/{city}/{handle} as marker vanity", () => {
    expect(parseQrPayload("https://airpal.me/q/sydney/harbour-rocks-hotel")).toEqual({
      kind: "vanity",
      city: "sydney",
      handle: "harbour-rocks-hotel",
    });
    expect(pathForIntent({ kind: "vanity", city: "sydney", handle: "harbour-rocks-hotel" })).toBe(
      "/q/sydney/harbour-rocks-hotel",
    );
  });

  it("routes a Pulse QR to /pulse/:token", () => {
    expect(parseQrPayload("https://airpal.me/pulse/pls_abcABC1234567890xyz")).toEqual({
      kind: "pulse",
      publicToken: "pls_abcABC1234567890xyz",
    });
    expect(pathForIntent({ kind: "pulse", publicToken: "pls_abcABC1234567890xyz" })).toBe(
      "/pulse/pls_abcABC1234567890xyz",
    );
  });
});
