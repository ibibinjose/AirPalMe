import { describe, expect, it } from "vitest";
import {
  buildMarkerUrl,
  buildStayUrl,
  buildVanityUrl,
  generateMarkerId,
  generatePropertyId,
  generateRoomToken,
  isOpaqueMarkerSegment,
  parseVanityOrMarkerPath,
  resolveRoomNumber,
  roomNumberToToken,
  slugifyCity,
  slugifyHandle,
  buildDefaultRoomTokens,
} from "./airpal-urls";

describe("ID generators", () => {
  it("generates opaque property ids with p_ prefix", () => {
    const id = generatePropertyId();
    expect(id).toMatch(/^p_[a-zA-Z0-9]{10}$/);
    expect(id).not.toContain("harbour");
    expect(generatePropertyId()).not.toBe(id);
  });

  it("generates opaque room tokens and marker hex ids", () => {
    const token = generateRoomToken();
    expect(token).toMatch(/^[a-zA-Z0-9]{12}$/);
    expect(token).not.toBe("101");
    const marker = generateMarkerId();
    expect(marker).toMatch(/^[a-f0-9]{16}$/);
    expect(isOpaqueMarkerSegment(marker)).toBe(true);
  });
});

describe("URL builders", () => {
  it("prefers opaque ?r= for stay URLs", () => {
    expect(buildStayUrl("p_abc123xyz0", { roomToken: "tokRoomToken1", origin: "https://airpal.me" })).toBe(
      "https://airpal.me/g/p_abc123xyz0?r=tokRoomToken1",
    );
  });

  it("emits legacy ?room= when only a human room is provided", () => {
    expect(buildStayUrl("harbour-rocks-hotel-6cbbce", { room: "101", type: "room", origin: "https://airpal.me" })).toBe(
      "https://airpal.me/g/harbour-rocks-hotel-6cbbce?type=room&room=101",
    );
  });

  it("builds marker and vanity paths", () => {
    expect(buildMarkerUrl("a1b2c3d4e5f67890", "https://airpal.me")).toBe("https://airpal.me/q/a1b2c3d4e5f67890");
    expect(buildVanityUrl("Sydney", "Harbour Rocks Hotel", "https://airpal.me")).toBe(
      "https://airpal.me/q/sydney/harbour-rocks-hotel",
    );
  });
});

describe("vanity / marker path parse", () => {
  it("parses marker, vanity, and empty /q", () => {
    expect(parseVanityOrMarkerPath("/q")).toEqual({ kind: "empty" });
    expect(parseVanityOrMarkerPath("/q/a1b2c3d4e5f67890")).toEqual({
      kind: "marker",
      markerId: "a1b2c3d4e5f67890",
    });
    expect(parseVanityOrMarkerPath("/q/sydney/harbour-rocks-hotel")).toEqual({
      kind: "vanity",
      city: "sydney",
      handle: "harbour-rocks-hotel",
    });
  });

  it("slugifies handles and cities", () => {
    expect(slugifyHandle("Harbour Rocks Hotel")).toBe("harbour-rocks-hotel");
    expect(slugifyCity("Sydney NSW")).toBe("sydney-nsw");
  });
});

describe("room token maps", () => {
  it("resolves token → number and inverts for host QR", () => {
    const { roomTokens, defaultRoomNumber, defaultRoomToken } = buildDefaultRoomTokens("hotel", 3);
    expect(defaultRoomNumber).toBe("101");
    expect(resolveRoomNumber(roomTokens, defaultRoomToken, null)).toBe("101");
    expect(roomNumberToToken(roomTokens, "101")).toBe(defaultRoomToken);
    expect(resolveRoomNumber(roomTokens, null, "508")).toBe("508");
  });

  it("prefers ?r= over legacy room= when both are present", () => {
    const roomTokens = { tokAaa111bbb: "101", tokBbb222ccc: "102" };
    expect(resolveRoomNumber(roomTokens, "tokBbb222ccc", "101")).toBe("102");
    expect(resolveRoomNumber(roomTokens, "unknown-token", "101")).toBe("101");
    expect(resolveRoomNumber(roomTokens, "tokAaa111bbb", null)).toBe("101");
  });
});
