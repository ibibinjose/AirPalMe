import { describe, expect, it } from "vitest";
import { pickReverseLocality } from "./weather";

describe("pickReverseLocality", () => {
  it("prefers suburb over metro city so Ashfield is not labelled Sydney", () => {
    expect(pickReverseLocality({ locality: "Ashfield", city: "Sydney", principalSubdivision: "New South Wales" })).toBe(
      "Ashfield",
    );
  });

  it("falls back to city when locality is missing", () => {
    expect(pickReverseLocality({ city: "Sydney" })).toBe("Sydney");
  });
});
