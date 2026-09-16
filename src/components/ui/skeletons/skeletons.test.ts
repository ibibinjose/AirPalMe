import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PlaceCardSkeleton,
  PlaceCardSkeletonGrid,
  CalendarEventCardSkeleton,
  CalendarEventSkeletonList,
  PlanCardSkeleton,
  PlanCardSkeletonGrid,
  TourCardSkeleton,
  TourCardSkeletonGrid,
  TonightEventCardSkeleton,
  TonightEventSkeletonRow,
} from "./index";

describe("Skeleton Loading Components", () => {
  it("renders PlaceCardSkeleton with aria-hidden, dimensions, and shimmer styles", () => {
    const html = renderToStaticMarkup(createElement(PlaceCardSkeleton));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("rounded-3xl");
    expect(html).toContain("min-h-[220px]");
    expect(html).toContain("animate-shimmer");
    expect(html).toContain("hero-scrim");
  });

  it("renders PlaceCardSkeleton large variant", () => {
    const html = renderToStaticMarkup(createElement(PlaceCardSkeleton, { large: true }));
    expect(html).toContain("min-h-[280px]");
  });

  it("renders PlaceCardSkeletonGrid with specified count and aria-label", () => {
    const html = renderToStaticMarkup(createElement(PlaceCardSkeletonGrid, { count: 4 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading places"');
    expect(html).toContain("grid-cols-2");
  });

  it("renders CalendarEventCardSkeleton with banner and action skeleton", () => {
    const html = renderToStaticMarkup(createElement(CalendarEventCardSkeleton));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("rounded-3xl");
    expect(html).toContain("animate-shimmer");
    expect(html).toContain("h-44");
  });

  it("renders CalendarEventSkeletonList", () => {
    const html = renderToStaticMarkup(createElement(CalendarEventSkeletonList, { count: 3 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading calendar events"');
  });

  it("renders PlanCardSkeleton and PlanCardSkeletonGrid", () => {
    const singleHtml = renderToStaticMarkup(createElement(PlanCardSkeleton));
    expect(singleHtml).toContain('aria-hidden="true"');
    expect(singleHtml).toContain("animate-shimmer");

    const html = renderToStaticMarkup(createElement(PlanCardSkeletonGrid, { count: 3 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading plans"');
    expect(html).toContain("animate-shimmer");
  });

  it("renders TourCardSkeleton and TourCardSkeletonGrid", () => {
    const singleHtml = renderToStaticMarkup(createElement(TourCardSkeleton));
    expect(singleHtml).toContain('aria-hidden="true"');
    expect(singleHtml).toContain("min-h-[240px]");

    const html = renderToStaticMarkup(createElement(TourCardSkeletonGrid, { count: 2 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading walking tours"');
    expect(html).toContain("min-h-[240px]");
  });

  it("renders TonightEventCardSkeleton and TonightEventSkeletonRow", () => {
    const singleHtml = renderToStaticMarkup(createElement(TonightEventCardSkeleton));
    expect(singleHtml).toContain('aria-hidden="true"');
    expect(singleHtml).toContain("h-40");

    const html = renderToStaticMarkup(createElement(TonightEventSkeletonRow, { count: 4 }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading tonight events"');
    expect(html).toContain("h-40");
    expect(html).toContain("w-56");
  });
});
