import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { CreateFab, openGlobalCreate } from "./CreateFab";

const staticHook = (): [string, (to: string) => void] => ["/", () => undefined];

function fabHtml() {
  return renderToStaticMarkup(
    createElement(Router, { hook: staticHook }, createElement(CreateFab)),
  );
}

describe("CreateFab", () => {
  it("renders floating action button on standard routes", () => {
    const html = fabHtml();
    expect(html).toContain("Create something new");
  });

  it("exports openGlobalCreate utility", () => {
    expect(typeof openGlobalCreate).toBe("function");
  });
});
