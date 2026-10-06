import { describe, expect, it } from "vitest";
import {
  absoluteShareImageUrl,
  buildShareMetaHtml,
  escapeShareText,
  isCrawlerUserAgent,
  SHARE_DEFAULTS,
  shareCardFor,
} from "./share-meta";

const ORIGIN = "https://airpal.me";

describe("share meta", () => {
  it("detects link-preview bots but not browsers or JS search crawlers", () => {
    for (const ua of [
      "facebookexternalhit/1.1",
      "Facebot",
      "Twitterbot/1.0",
      "LinkedInBot/1.0",
      "Slackbot-LinkExpanding 1.0",
      "Discordbot/2.0",
      "WhatsApp/2.0",
      "TelegramBot/1.0",
      "Mozilla/5.0 (compatible; Pinterestbot/1.0)",
      "Mozilla/5.0 (compatible; redditbot/1.0)",
    ]) {
      expect(isCrawlerUserAgent(ua)).toBe(true);
    }
    expect(isCrawlerUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(false);
    expect(isCrawlerUserAgent("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120")).toBe(
      false,
    );
    // JS search crawlers render the app — never serve them alternate HTML.
    expect(isCrawlerUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(
      false,
    );
    expect(isCrawlerUserAgent("")).toBe(false);
    expect(isCrawlerUserAgent(undefined)).toBe(false);
  });

  it("escapes card text and caps length", () => {
    expect(escapeShareText(`Rooftop "Sessions" <live> & more`, 90)).toBe(
      "Rooftop &quot;Sessions&quot; &lt;live&gt; &amp; more",
    );
    expect(escapeShareText("a".repeat(100), 90).length).toBeLessThanOrEqual(90);
    expect(escapeShareText("  spaced   out  ", 90)).toBe("spaced out");
    expect(escapeShareText(undefined, 90)).toBe("");
  });

  it("absolutizes images and rejects unsafe schemes", () => {
    expect(absoluteShareImageUrl("/media/harbour.jpg", ORIGIN)).toBe(
      "https://airpal.me/media/harbour.jpg",
    );
    expect(absoluteShareImageUrl("https://cdn.example/x.jpg?a=1&b=2", ORIGIN)).toBe(
      "https://cdn.example/x.jpg?a=1&amp;b=2",
    );
    expect(absoluteShareImageUrl("data:image/png;base64,xx", ORIGIN)).toBe("");
    expect(absoluteShareImageUrl("javascript:alert(1)", ORIGIN)).toBe("");
    expect(absoluteShareImageUrl("", ORIGIN)).toBe("");
  });

  it("cards events with venue fallback copy", () => {
    const card = shareCardFor(
      "event",
      { name: "Rooftop Sessions", venue: "Demo Hotel", city: "Sydney", coverImage: "/c.jpg" },
      ORIGIN,
    );
    expect(card.title).toBe("Rooftop Sessions");
    expect(card.description).toBe("Demo Hotel · Sydney");
    expect(card.image).toBe("https://airpal.me/c.jpg");
  });

  it("cards events with heroImage and title when coverImage and name are absent", () => {
    const card = shareCardFor(
      "event",
      {
        title: "Sunset Music Festival",
        venueName: "Harbour Stage",
        city: "Sydney",
        heroImage: "https://images.example/hero.jpg",
        detail: "Live electronic sets under the sky.",
      },
      ORIGIN,
    );
    expect(card.title).toBe("Sunset Music Festival");
    expect(card.description).toContain("Live electronic sets under the sky.");
    expect(card.image).toBe("https://images.example/hero.jpg");
  });

  it("cards plans with rich invitation copy and hero image", () => {
    const card = shareCardFor(
      "plan",
      {
        title: "Bondi Sunrise Catchup",
        destination: "Bondi Beach",
        city: "Sydney",
        date: "2026-10-12",
        time: "07:00",
        heroImage: "https://images.example/plan-hero.jpg",
        creator: { name: "Alex" },
        inviteCode: "ABC123",
      },
      ORIGIN,
    );
    expect(card.title).toBe("You&#39;re invited: Bondi Sunrise Catchup");
    expect(card.description).toContain("Join Alex");
    expect(card.description).toContain("Bondi Beach, Sydney");
    expect(card.description).toContain("RSVP on AirPal.me");
    expect(card.image).toBe("https://images.example/plan-hero.jpg");
  });

  it("cards pulses with property and question count", () => {
    const card = shareCardFor(
      "pulse",
      { title: "How was dinner?", propertyName: "Harbour Hotel", questions: [{}, {}, {}] },
      ORIGIN,
    );
    expect(card.title).toBe("How was dinner?");
    expect(card.description).toBe("Harbour Hotel · 3 quick questions");
    expect(card.image).toBe(`https://airpal.me${SHARE_DEFAULTS.image}`);
  });

  it("prefers the pulse cover image over the property hero", () => {
    const card = shareCardFor(
      "pulse",
      {
        title: "How was dinner?",
        propertyName: "Harbour Hotel",
        imageUrl: "https://cdn/pulse-cover.jpg",
        propertyHeroImage: "https://cdn/property-hero.jpg",
        questions: [{}],
      },
      ORIGIN,
    );
    expect(card.image).toBe("https://cdn/pulse-cover.jpg");
  });

  it("cards bios with handle and avatar", () => {
    const card = shareCardFor(
      "bio",
      { name: "Ava", handle: "ava", shortWhy: "Bondi local", avatar: "https://cdn/a.png" },
      ORIGIN,
    );
    expect(card.title).toBe("Ava (@ava)");
    expect(card.description).toBe("Bondi local");
    expect(card.image).toBe("https://cdn/a.png");
  });

  it("falls back to brand copy on empty docs", () => {
    for (const kind of ["event", "place", "plan", "bio", "property"] as const) {
      const card = shareCardFor(kind, {}, ORIGIN);
      expect(card.title).toBe(SHARE_DEFAULTS.title);
      expect(card.description).toBe(SHARE_DEFAULTS.description);
      expect(card.image).toBe(`https://airpal.me${SHARE_DEFAULTS.image}`);
    }
  });

  it("builds crawler HTML with og + twitter tags", () => {
    const html = buildShareMetaHtml(
      { title: "T", description: "D", image: "https://airpal.me/i.jpg" },
      "https://airpal.me/e/1",
      "event",
    );
    expect(html).toContain('<meta property="og:title" content="T">');
    expect(html).toContain('<meta property="og:image" content="https://airpal.me/i.jpg">');
    expect(html).toContain('<meta property="og:image:secure_url" content="https://airpal.me/i.jpg">');
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
    expect(html).toContain('<meta property="og:locale" content="en_AU">');
    expect(html).toContain('<meta property="og:type" content="event">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="twitter:site" content="@airpalme">');
    expect(html).toContain('<link rel="canonical" href="https://airpal.me/e/1">');
  });
});
