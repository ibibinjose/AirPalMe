import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { CREATE_GROUPS, CREATE_OPTIONS, CreateFab, openGlobalCreate } from "./CreateFab";

const staticHook = (): [string, (to: string) => void] => ["/", () => undefined];

function fabHtml() {
  return renderToStaticMarkup(createElement(Router, { hook: staticHook }, createElement(CreateFab)));
}

function fabHtmlAt(path: string) {
  const hook = (): [string, (to: string) => void] => [path, () => undefined];
  return renderToStaticMarkup(createElement(Router, { hook }, createElement(CreateFab)));
}

describe("CreateFab", () => {
  it("renders floating action button on standard routes", () => {
    const html = fabHtml();
    expect(html).toContain("Create something new");
  });

  it("exports openGlobalCreate utility", () => {
    expect(typeof openGlobalCreate).toBe("function");
  });

  it("hides on the event organizer door (/event/new redirects there)", () => {
    expect(fabHtmlAt("/event")).not.toContain("Create something new");
    expect(fabHtmlAt("/event/new")).not.toContain("Create something new");
  });

  it("groups every action under For you / For business", () => {
    const groups = CREATE_GROUPS.map((g) => g.id);
    expect(groups).toEqual(["you", "business"]);
    expect(CREATE_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of CREATE_OPTIONS) {
      expect(groups).toContain(opt.group);
    }
    // Both groups stay populated — no orphan headers or flat lists.
    for (const group of groups) {
      expect(CREATE_OPTIONS.some((opt) => opt.group === group)).toBe(true);
    }
  });
});
