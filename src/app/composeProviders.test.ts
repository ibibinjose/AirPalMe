import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { composeProviders } from "./composeProviders";

function stub(name: string) {
  return function Stub({ children }: { children: React.ReactNode }) {
    return createElement("div", { "data-provider": name }, children);
  };
}

describe("composeProviders", () => {
  it("renders children through every provider", () => {
    const Composed = composeProviders([stub("a"), stub("b"), stub("c")]);
    const html = renderToStaticMarkup(createElement(Composed, null, createElement("span", { id: "leaf" })));
    expect(html).toContain('data-provider="a"');
    expect(html).toContain('data-provider="b"');
    expect(html).toContain('data-provider="c"');
    expect(html).toContain('id="leaf"');
  });

  it("keeps outermost-first order", () => {
    const Composed = composeProviders([stub("outer"), stub("inner")]);
    const html = renderToStaticMarkup(createElement(Composed, null, "x"));
    expect(html.indexOf('data-provider="outer"')).toBeLessThan(html.indexOf('data-provider="inner"'));
  });

  it("renders children with an empty list", () => {
    const Composed = composeProviders([]);
    const html = renderToStaticMarkup(createElement(Composed, null, "bare"));
    expect(html).toBe("bare");
  });
});
