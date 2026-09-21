import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Ensure document and window exist for tests in Node environment
if (typeof globalThis.document === "undefined") {
  const classList = new Set<string>();
  const styleProps: Record<string, string> = {};

  const mockElement = {
    className: "",
    classList: {
      add: (cls: string) => classList.add(cls),
      remove: (cls: string) => classList.delete(cls),
      contains: (cls: string) => classList.has(cls),
    },
    style: {
      paddingBottom: "",
      setProperty: (k: string, v: string) => {
        styleProps[k] = v;
      },
      removeProperty: (k: string) => {
        delete styleProps[k];
      },
      getPropertyValue: (k: string) => styleProps[k] || "",
    },
    setAttribute: () => {},
    removeAttribute: () => {},
    isConnected: true,
    scrollIntoView: () => {},
    getBoundingClientRect: () => ({ top: 400, bottom: 440, left: 0, right: 200, width: 200, height: 40 }),
    tagName: "INPUT",
  };

  Object.defineProperty(globalThis, "document", {
    value: {
      documentElement: mockElement,
      body: mockElement,
      activeElement: null,
      createElement: () => ({ ...mockElement }),
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    writable: true,
  });

  Object.defineProperty(globalThis, "window", {
    value: {
      innerHeight: 800,
      visualViewport: {
        height: 800,
        offsetTop: 0,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number,
      scrollBy: () => {},
    },
    writable: true,
  });
}

import { initKeyboardManager, ensureElementInView } from "./keyboard";

describe("keyboard manager", () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    document.documentElement.classList.remove("keyboard-open");
    document.body.classList.remove("keyboard-open");
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it("initializes without throwing in DOM environment", () => {
    cleanup = initKeyboardManager();
    expect(typeof cleanup).toBe("function");
  });

  it("cleans up listeners and resets DOM state on teardown", () => {
    cleanup = initKeyboardManager();
    cleanup();
    cleanup = null;
    expect(document.documentElement.classList.contains("keyboard-open")).toBe(false);
  });

  it("scrolls a covered field up by the amount under the keyboard", () => {
    const scrollBy = vi.fn();
    (window as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
    const mockInput = {
      isConnected: true,
      parentElement: document.body,
      getBoundingClientRect: () => ({ top: 780, bottom: 820, left: 0, right: 100, width: 100, height: 40 }),
      tagName: "INPUT",
    } as unknown as HTMLElement;

    ensureElementInView(mockInput, { topClearance: 0, bottomClearance: 20, behavior: "auto" });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scrollBy).toHaveBeenCalled();
        const arg = scrollBy.mock.calls[0]?.[0] as { top: number };
        expect(arg.top).toBeGreaterThan(0);
        resolve();
      }, 50);
    });
  });

  it("handles null or disconnected targets without crashing", () => {
    expect(() => ensureElementInView(null)).not.toThrow();
    expect(() => ensureElementInView(undefined)).not.toThrow();

    const disconnected = { isConnected: false } as unknown as HTMLElement;
    expect(() => ensureElementInView(disconnected)).not.toThrow();
  });
});
