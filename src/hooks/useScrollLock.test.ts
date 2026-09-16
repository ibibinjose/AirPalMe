import { beforeEach, describe, expect, it } from "vitest";

if (typeof globalThis.document === "undefined") {
  const body = { style: { overflow: "" } };
  const docElement = { style: { overflow: "" } };
  Object.defineProperty(globalThis, "document", {
    value: { body, documentElement: docElement },
    writable: true,
  });
}

import {
  forceUnlockBodyScroll,
  getLockCount,
  lockBodyScroll,
  unlockBodyScroll,
} from "./useScrollLock";

describe("useScrollLock controller", () => {
  beforeEach(() => {
    forceUnlockBodyScroll();
  });

  it("locks document.body.style.overflow on first lock", () => {
    expect(document.body.style.overflow).toBe("");
    expect(getLockCount()).toBe(0);

    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    expect(getLockCount()).toBe(1);

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
    expect(getLockCount()).toBe(0);
  });

  it("handles reference counting for stacked modals", () => {
    lockBodyScroll(); // First modal opens
    expect(document.body.style.overflow).toBe("hidden");
    expect(getLockCount()).toBe(1);

    lockBodyScroll(); // Second modal opens
    expect(document.body.style.overflow).toBe("hidden");
    expect(getLockCount()).toBe(2);

    unlockBodyScroll(); // First modal closes
    expect(document.body.style.overflow).toBe("hidden"); // Still locked!
    expect(getLockCount()).toBe(1);

    unlockBodyScroll(); // Second modal closes
    expect(document.body.style.overflow).toBe(""); // Now unlocked!
    expect(getLockCount()).toBe(0);
  });

  it("prevents negative lock count if unlocked excessively", () => {
    unlockBodyScroll();
    expect(getLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });

  it("forceUnlockBodyScroll immediately clears overflow and resets count to 0", () => {
    lockBodyScroll();
    lockBodyScroll();
    expect(getLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe("hidden");

    forceUnlockBodyScroll();
    expect(getLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });
});
