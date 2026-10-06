import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(import.meta.dirname, "../index.css"), "utf8");

/** Automatic dark-mode contract: semantic tokens must flip with the OS scheme
 * (docs/AIRPAL.md Part E). These guards catch regressions like re-adding
 * `@theme inline` (which would freeze utilities to light values). */
describe("theme dark-mode contract", () => {
  it("keeps @theme non-inline so utilities reference variables at runtime", () => {
    expect(css).toMatch(/^@theme \{$/m);
    expect(css).not.toMatch("@theme inline");
  });

  it("declares light+dark color-scheme support", () => {
    expect(css).toMatch(/color-scheme:\s*light dark;/);
  });

  it("re-points every semantic surface token under prefers-color-scheme: dark", () => {
    const darkBlock = css.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}\n\n?\/\*/);
    expect(darkBlock, "missing prefers-color-scheme: dark block").not.toBeNull();
    const body = darkBlock?.[1] ?? "";
    for (const token of [
      "--color-paper",
      "--color-card",
      "--color-ink",
      "--color-mute",
      "--color-line",
      "--color-surface-lowest",
      "--color-surface-low",
      "--color-surface:",
      "--color-surface-high",
      "--color-surface-highest",
      "--shadow-clay",
    ]) {
      expect(body).toContain(token);
    }
  });

  it("adapts Liquid Glass nav/dock materials to the dark scheme", () => {
    const darkBlock = css.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}\n\n?\/\*/);
    const body = darkBlock?.[1] ?? "";
    for (const material of [
      ".apple-liquid-glass-dock",
      ".apple-liquid-glass-nav",
      ".apple-liquid-glass-card",
      ".apple-liquid-glass-light",
    ]) {
      expect(body).toContain(material);
    }
  });

  it("keeps brand fills fixed but lightens the accent text token", () => {
    const darkBlock = css.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}\n\n?\/\*/);
    const body = darkBlock?.[1] ?? "";
    expect(body).not.toMatch(/--color-brand:/);
    expect(body).not.toMatch(/--color-gold:/);
    expect(body).toMatch(/--color-accent:\s*#[0-9a-f]{6};/);
  });
});
