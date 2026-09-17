import { describe, expect, it } from "vitest";
import { BIO_CATALOG_MAX, BIO_PUBLIC_PATH, bioButtonLabel, bioKindLabel, catalogDeals, handleFromDomain, handleFromName, handleFromPlaceId, handleError, handleMatchesClaim, isBusinessKind, isHexHandle, isSafeBioHref, isSocialLinkType, normalizeHandle, parseAtHandle, randomHexHandle, resolveStatusPicks, sanitizeBioHref, sanitizeCatalog, socialLinks, stackLinks } from "./bio";

describe("bio handle", () => {
  it("normalizes and validates", () => {
    expect(normalizeHandle("@CutBar")).toBe("cutbar");
    expect(handleError("ab")).toBeTruthy();
    expect(handleError("a".repeat(31))).toBeTruthy();
    expect(handleError("cutbar")).toBeNull();
    expect(handleError("host")).toBe("Taken");
    expect(handleError("vite")).toBe("Taken");
    expect(handleError("privacy")).toBe("Taken");
    expect(handleError("terms")).toBe("Taken");
    expect(handleError("cookies")).toBe("Taken");
    expect(handleError("about")).toBe("Taken");
    expect(handleError("contact")).toBe("Taken");
    expect(handleError("club")).toBe("Taken");
  });

  it("builds a valid hex handle", () => {
    const hex = randomHexHandle(8);
    expect(hex).toHaveLength(8);
    expect(isHexHandle(hex)).toBe(true);
    expect(handleError(hex)).toBeNull();
    expect(isHexHandle("cutbar")).toBe(false);
  });

  it("parses /@handle", () => {
    expect(parseAtHandle("/@cutbar")).toBe("cutbar");
    expect(parseAtHandle("/%40cutbar")).toBe("cutbar");
    expect(parseAtHandle("/q/sydney/cutbar")).toBeNull();
    expect(parseAtHandle("/partners")).toBeNull();
  });

  it("matches the public bio path without swallowing product routes", () => {
    expect(BIO_PUBLIC_PATH.test("/@cutbar")).toBe(true);
    expect(BIO_PUBLIC_PATH.exec("/@cutbar")?.[1]).toBe("cutbar");
    expect(BIO_PUBLIC_PATH.test("/@vite/client")).toBe(false);
    expect(BIO_PUBLIC_PATH.test("/partners")).toBe(false);
    expect(BIO_PUBLIC_PATH.test("/q/sydney/cutbar")).toBe(false);
  });

  it("keeps Maps and Call off the stacked list", () => {
    expect(
      stackLinks([
        { id: "1", type: "book", label: "Book", href: "https://x" },
        { id: "2", type: "maps", label: "Maps", href: "https://maps" },
        { id: "3", type: "call", label: "Call", href: "tel:1" },
      ]).map((l) => l.type),
    ).toEqual(["book"]);
    expect(
      socialLinks([
        { id: "1", type: "book", label: "Book", href: "https://x" },
        { id: "2", type: "instagram", label: "Instagram", href: "https://instagram.com/x" },
      ]).map((l) => l.type),
    ).toEqual(["instagram"]);
    expect(isSocialLinkType("tiktok")).toBe(true);
    expect(handleFromPlaceId("fortune-of-war")).toBe("fortuneofwar");
    expect(handleFromPlaceId("cut-bar-grill")).toBe("cutbargrill");
    expect(bioButtonLabel("CutBar")).toBe("@cutbar");
    expect(handleFromName("The Cut Bar & Grill")).toBe("cutbargrill");
    expect(handleFromName("Fortune of War")).toBe("fortunewar");
    expect(handleFromDomain("https://www.cutbar.com.au/menu")).toBe("cutbar");
    expect(handleMatchesClaim("cutbar", { name: "The Cut Bar", domain: "cutbar.com.au" })).toBe(true);
    expect(handleMatchesClaim("randomguest", { name: "The Cut Bar & Grill" })).toBe(false);
  });

  it("sanitizes catalog rows and caps length", () => {
    const rows = sanitizeCatalog("product", [
      { title: "  Ribeye  ", detail: "Charcoal", price: "$68", extra: true },
      { title: "" },
      ...Array.from({ length: 12 }, (_, i) => ({ title: `Item ${i}` })),
    ]);
    expect(rows[0]).toMatchObject({ kind: "product", title: "Ribeye", price: "$68" });
    expect(rows).toHaveLength(BIO_CATALOG_MAX);
  });

  it("falls back to the legacy single offer as a deal", () => {
    expect(catalogDeals({ deals: [], offer: { badge: "15% off", detail: "Till" } })).toEqual([
      { id: "offer", kind: "deal", title: "15% off", detail: "Till", badge: "Offer" },
    ]);
  });
});

describe("bio href allowlist", () => {
  it("allows http(s), tel, mailto, and site-relative links", () => {
    expect(isSafeBioHref("https://thecut.bar/menu")).toBe(true);
    expect(isSafeBioHref("http://example.com")).toBe(true);
    expect(isSafeBioHref("tel:+61400123123")).toBe(true);
    expect(isSafeBioHref("mailto:hello@airpal.me")).toBe(true);
    expect(isSafeBioHref("/@cutbar")).toBe(true);
  });

  it("blocks javascript, data, and other dangerous schemes", () => {
    expect(isSafeBioHref("javascript:alert(1)")).toBe(false);
    expect(isSafeBioHref("  JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeBioHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeBioHref("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeBioHref("ftp://files.example.com")).toBe(false);
    expect(isSafeBioHref("")).toBe(false);
    expect(isSafeBioHref(undefined)).toBe(false);
  });

  it("strips unsafe hrefs when sanitizing catalog rows", () => {
    const rows = sanitizeCatalog("product", [
      { title: "Good", href: "https://thecut.bar" },
      { title: "Evil", href: "javascript:alert(1)" },
    ]);
    expect(rows[0]?.href).toBe("https://thecut.bar");
    expect(rows[1]?.href).toBeUndefined();
    expect(sanitizeBioHref("data:text/html,x")).toBeUndefined();
  });
});

describe("profile kind identifier", () => {
  it("labels businesses and individuals", () => {
    expect(bioKindLabel("business")).toBe("Business");
    expect(bioKindLabel("person")).toBe("Individual");
    expect(bioKindLabel(undefined)).toBe("Individual");
    expect(bioKindLabel(null)).toBe("Individual");
  });

  it("detects business kind only for exact match", () => {
    expect(isBusinessKind("business")).toBe(true);
    expect(isBusinessKind("person")).toBe(false);
    expect(isBusinessKind(undefined)).toBe(false);
  });
});

describe("status picks", () => {
  it("resolves saved values with safe defaults", () => {
    expect(resolveStatusPicks({})).toEqual({ status: "available", customText: "", emoji: "☕" });
    expect(
      resolveStatusPicks({ status: "busy", customStatus: "Heads down", emoji: "💻" }),
    ).toEqual({ status: "busy", customText: "Heads down", emoji: "💻" });
  });
});
