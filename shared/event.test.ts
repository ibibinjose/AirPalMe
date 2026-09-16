import { describe, expect, it } from "vitest";
import { isExpoEventId, parseStallCsv, stallCsvTemplate, stallFieldLabels, stallUnitDisplay } from "./event";

describe("event csv", () => {
  it("parses a stall sheet", () => {
    const rows = parseStallCsv(`name,category,booth,shortWhy,offer
Salted Caramel Co,eat,A12,Handmade caramels,2 for $10
Harbour Linen,shops,B04,Washed linen,
`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Salted Caramel Co", category: "eat", booth: "A12", offer: "2 for $10" });
    expect(rows[1]?.offer).toBeFalsy();
  });

  it("accepts expo/market column names for business, stall number and handle", () => {
    const rows = parseStallCsv(`business name,stand number,@handle,category,about
Harbour Linen,214,harbourlinen,shops,Washed linen
`);
    expect(rows[0]).toMatchObject({
      name: "Harbour Linen",
      booth: "214",
      handle: "harbourlinen",
      category: "shops",
      shortWhy: "Washed linen",
    });
  });

  it("detects expo ids", () => {
    expect(isExpoEventId("evt-rocks-market")).toBe(true);
    expect(isExpoEventId("rocks-markets-weekend")).toBe(false);
  });
});

describe("stall field labels", () => {
  it("uses stand vs stall vs booth by flavour", () => {
    expect(stallFieldLabels("expo").unit).toBe("Stand number");
    expect(stallFieldLabels("market").unit).toBe("Stall number");
    expect(stallFieldLabels("event_space").unit).toBe("Booth number");
    expect(stallUnitDisplay("expo", "214")).toBe("Stand 214");
    expect(stallUnitDisplay("market", "A12")).toBe("Stall A12");
    expect(stallCsvTemplate("market")).toContain("business name");
    expect(stallCsvTemplate("expo")).toContain("stand number");
  });
});
