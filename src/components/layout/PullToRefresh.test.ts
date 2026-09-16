import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PullToRefreshContainer } from "./PullToRefreshContainer";

describe("PullToRefreshContainer", () => {
  it("renders children content inside the container", () => {
    const mockState = {
      isPulling: false,
      pullDistance: 0,
      pullProgress: 0,
      isRefreshing: false,
      isSuccess: false,
      containerRef: { current: null },
      triggerManualReload: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        PullToRefreshContainer,
        { state: mockState },
        createElement("div", { id: "test-content" }, "Test Page Content"),
      ),
    );

    expect(html).toContain("Test Page Content");
    expect(html).toContain("Pull to refresh");
  });

  it("shows reloading text when isRefreshing is true", () => {
    const mockState = {
      isPulling: false,
      pullDistance: 50,
      pullProgress: 1,
      isRefreshing: true,
      isSuccess: false,
      containerRef: { current: null },
      triggerManualReload: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        PullToRefreshContainer,
        { state: mockState },
        createElement("div", null, "Refreshing View"),
      ),
    );

    expect(html).toContain("Reloading data...");
  });

  it("shows Updated when isSuccess is true", () => {
    const mockState = {
      isPulling: false,
      pullDistance: 50,
      pullProgress: 1,
      isRefreshing: false,
      isSuccess: true,
      containerRef: { current: null },
      triggerManualReload: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        PullToRefreshContainer,
        { state: mockState },
        createElement("div", null, "Updated View"),
      ),
    );

    expect(html).toContain("Updated");
  });
});
