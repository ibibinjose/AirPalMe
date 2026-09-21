import { describe, expect, it } from "vitest";
import { formatPickedPlace } from "@/components/forms/PlaceAddressField";

describe("formatPickedPlace", () => {
  it("joins name and address", () => {
    expect(formatPickedPlace({ name: "The Glenmore", address: "96 Cumberland St, The Rocks" })).toBe(
      "The Glenmore, 96 Cumberland St, The Rocks",
    );
  });

  it("does not duplicate when the address already starts with the name", () => {
    expect(formatPickedPlace({ name: "Bondi Beach", address: "Bondi Beach, NSW" })).toBe("Bondi Beach, NSW");
  });
});
