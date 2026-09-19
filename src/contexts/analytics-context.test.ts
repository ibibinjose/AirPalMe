import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.clear) {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}

import { AnalyticsProvider, useAnalytics } from "./AnalyticsContext";
import { setFirebaseAnalyticsForTesting } from "@/lib/firebase";

function TestConsumer() {
  const analytics = useAnalytics();
  return createElement(
    "div",
    { "data-testid": "consumer" },
    createElement("span", { id: "ready" }, String(analytics.isReady)),
    createElement("span", { id: "has-tracker" }, String(typeof analytics.trackFeatureEngagement === "function")),
  );
}

describe("AnalyticsContext & AnalyticsProvider", () => {
  const fakeAnalytics = {
    app: { name: "[DEFAULT]" },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    setFirebaseAnalyticsForTesting(fakeAnalytics);
  });

  it("renders children without throwing outside provider and returns fallback", () => {
    const html = renderToStaticMarkup(createElement(TestConsumer));
    expect(html).toContain('id="has-tracker"');
    expect(html).toContain("true");
  });

  it("renders children inside AnalyticsProvider", () => {
    const tree = createElement(AnalyticsProvider, null, createElement("div", { id: "child" }, "Hello Analytics"));

    const html = renderToStaticMarkup(tree);
    expect(html).toContain('id="child"');
    expect(html).toContain("Hello Analytics");
  });

  it("provides analytics context to consumer inside provider", () => {
    const tree = createElement(AnalyticsProvider, null, createElement(TestConsumer));

    const html = renderToStaticMarkup(tree);
    expect(html).toContain('data-testid="consumer"');
    expect(html).toContain('id="has-tracker"');
  });
});
