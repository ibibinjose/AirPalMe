import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PLAN_COVERS, PlanCoverPicker } from "./PlanCoverPicker";

describe("PlanCoverPicker", () => {
  it("offers curated self-hosted artwork plus an upload field", () => {
    const markup = renderToStaticMarkup(
      createElement(PlanCoverPicker, { value: undefined, onChange: vi.fn() }),
    );
    expect(markup).toContain('role="radiogroup"');
    for (const cover of PLAN_COVERS) {
      expect(markup).toContain(cover.src);
      expect(markup).toContain(cover.label);
    }
    expect(PLAN_COVERS.length).toBeGreaterThanOrEqual(5);
    // Upload path stays available next to the curated art.
    expect(markup).toContain("Or upload your own");
    expect(markup).toContain('type="file"');
  });

  it("marks exactly the chosen cover as selected", () => {
    const markup = renderToStaticMarkup(
      createElement(PlanCoverPicker, { value: PLAN_COVERS[1]!.src, onChange: vi.fn() }),
    );
    expect(markup.match(/aria-checked="true"/g)?.length).toBe(1);
    expect(markup).toContain(`aria-label="${PLAN_COVERS[1]!.label}"`);
  });
});
