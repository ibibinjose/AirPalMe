import { describe, expect, it } from "vitest";
import { ALTERNATIVES, ALTERNATIVE_SLUGS } from "./alternatives";

/** Phrases that would signal invented proof or guarantees. Never allowed. */
const BANNED_PHRASES = ["guarantee", "best", "#1", "five-star", "testimonial", "rated"];

function allConfigText(slug: string): string {
  const config = ALTERNATIVES[slug]!;
  return [
    config.headline,
    config.intro,
    config.competitorDescriptor,
    ...config.useCases.flatMap((u) => [u.title, u.body, u.cta]),
    ...config.criteria.flatMap((c) => [c.check, c.airpal]),
    config.primaryCta.label,
  ]
    .join(" ")
    .toLowerCase();
}

describe("alternatives config", () => {
  it("covers exactly the four approved comparisons", () => {
    expect(ALTERNATIVE_SLUGS).toEqual(["eventbrite", "hostfully", "meetup", "touch-stay"]);
  });

  it("gives every page complete structure with internal links", () => {
    for (const slug of ALTERNATIVE_SLUGS) {
      const config = ALTERNATIVES[slug]!;
      expect(config.headline.trim().length).toBeGreaterThan(0);
      expect(config.intro.trim().length).toBeGreaterThan(0);
      expect(config.useCases.length).toBeGreaterThanOrEqual(3);
      expect(config.criteria.length).toBeGreaterThanOrEqual(4);
      for (const useCase of config.useCases) {
        expect(useCase.href.startsWith("/"), `${slug} use-case link`).toBe(true);
      }
      expect(config.primaryCta.href.startsWith("/")).toBe(true);
    }
  });

  it("names the competitor only as query context, never in claims", () => {
    for (const slug of ALTERNATIVE_SLUGS) {
      const config = ALTERNATIVES[slug]!;
      const name = config.competitor.toLowerCase();
      expect(config.headline.toLowerCase().includes(name)).toBe(true);
      expect(config.intro.toLowerCase().includes(name)).toBe(true);
      const claimText = [
        ...config.useCases.flatMap((u) => [u.title, u.body]),
        ...config.criteria.flatMap((c) => [c.check, c.airpal]),
      ]
        .join(" ")
        .toLowerCase();
      expect(claimText.includes(name), `${slug} claims must not mention ${name}`).toBe(false);
    }
  });

  it("contains no superlatives, ratings, or guarantees", () => {
    for (const slug of ALTERNATIVE_SLUGS) {
      const text = allConfigText(slug);
      for (const phrase of BANNED_PHRASES) {
        expect(text.includes(phrase), `${slug} must not contain "${phrase}"`).toBe(false);
      }
    }
  });
});
