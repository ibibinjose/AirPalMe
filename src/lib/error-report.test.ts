import { describe, expect, it } from "vitest";
import { classifyError } from "./error-report";

describe("classifyError", () => {
  it("classifies chunk and network failures", () => {
    expect(classifyError(new Error("Loading chunk 4 failed"))).toBe("chunk");
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyError(new TypeError("x is not a function"))).toBe("type");
    expect(classifyError("nope")).toBe("unknown");
  });
});
