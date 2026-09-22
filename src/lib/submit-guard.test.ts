import { describe, expect, it } from "vitest";
import { createSubmitGuard } from "./submit-guard";

describe("createSubmitGuard", () => {
  it("lets the first submitter through and blocks the second", () => {
    const guard = createSubmitGuard();
    expect(guard.tryAcquire()).toBe(true);
    // A second tap before the first resolves must be ignored — this is the
    // double-submit race that duplicated plans and Stripe sessions.
    expect(guard.tryAcquire()).toBe(false);
    expect(guard.held).toBe(true);
  });

  it("re-arms after release so a retry can submit", () => {
    const guard = createSubmitGuard();
    expect(guard.tryAcquire()).toBe(true);
    guard.release();
    expect(guard.held).toBe(false);
    expect(guard.tryAcquire()).toBe(true);
  });

  it("keeps guards independent per form instance", () => {
    const a = createSubmitGuard();
    const b = createSubmitGuard();
    expect(a.tryAcquire()).toBe(true);
    expect(b.tryAcquire()).toBe(true);
  });
});
