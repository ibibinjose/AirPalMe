import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DebugInfoOverlay, openDebugOverlay, closeDebugOverlay } from "./DebugInfoOverlay";

describe("DebugInfoOverlay", () => {
  it("exports trigger functions", () => {
    expect(typeof openDebugOverlay).toBe("function");
    expect(typeof closeDebugOverlay).toBe("function");
  });

  it("does not render modal to DOM when closed", () => {
    const html = renderToStaticMarkup(createElement(DebugInfoOverlay));
    expect(html).toBe("");
  });
});
