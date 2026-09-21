import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonalProfileListingHint } from "./GooglePlaceImport";

describe("PersonalProfileListingHint", () => {
  it("sends people without a place to register the business", () => {
    const html = renderToStaticMarkup(
      createElement(PersonalProfileListingHint, { hasBusiness: false, onOpenBusiness: vi.fn() }),
    );
    expect(html).toContain("data-testid=\"personal-listing-hint\"");
    expect(html).toContain("Import the listing on the business profile");
    expect(html).toContain("Register the business");
    expect(html).not.toContain("Import or sync the listing");
  });

  it("opens an existing place instead of importing onto the person", () => {
    const html = renderToStaticMarkup(
      createElement(PersonalProfileListingHint, { hasBusiness: true, onOpenBusiness: vi.fn() }),
    );
    expect(html).toContain("Open your place");
    expect(html).not.toContain("Register the business");
  });
});
