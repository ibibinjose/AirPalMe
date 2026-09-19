import { describe, expect, it } from "vitest";
import { hrefForDoor } from "./door";

describe("hrefForDoor", () => {
  it("maps the three jobs to their routes", () => {
    expect(hrefForDoor("explore")).toBe("/");
    expect(hrefForDoor("plan")).toBe("/plan");
    expect(hrefForDoor("stay")).toBe("/concierge");
  });
});
