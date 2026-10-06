import { describe, expect, it } from "vitest";
import {
  resolveIconSize,
  resolveIconVariantClass,
  SIZE_MAP,
  VARIANT_CLASS_MAP,
  BADGE_VARIANT_MAP,
  BADGE_SIZE_MAP,
  Icon,
  IconBadge,
  IconButton,
  VerifiedBadgeIcon,
  Search,
  MapPin,
  Heart,
} from "./index";

describe("AirPal Central Icon Library", () => {
  it("resolves size tokens correctly to numeric pixels", () => {
    expect(SIZE_MAP["2xs"]).toBe(12);
    expect(SIZE_MAP["3xl"]).toBe(40);
    expect(resolveIconSize("2xs")).toBe(12);
    expect(resolveIconSize("xs")).toBe(14);
    expect(resolveIconSize("sm")).toBe(16);
    expect(resolveIconSize("md")).toBe(18);
    expect(resolveIconSize("base")).toBe(20);
    expect(resolveIconSize("lg")).toBe(24);
    expect(resolveIconSize("xl")).toBe(28);
    expect(resolveIconSize("2xl")).toBe(32);
    expect(resolveIconSize("3xl")).toBe(40);
    expect(resolveIconSize(22)).toBe(22);
    expect(resolveIconSize(undefined)).toBe(18); // Default fallback
  });

  it("maps brand variants to exact index.css color utility classes", () => {
    // Brand-hued icons use the adaptive accent token (AirPal Blue in light
    // mode, lightened in dark mode) — never fixed text-brand.
    expect(VARIANT_CLASS_MAP.brand).toBe("text-accent");
    expect(VARIANT_CLASS_MAP.rose).toBe("text-rose");
    expect(resolveIconVariantClass("brand")).toBe("text-accent");
    expect(resolveIconVariantClass("brand-ink")).toBe("text-brand-ink");
    expect(resolveIconVariantClass("ink")).toBe("text-ink");
    expect(resolveIconVariantClass("mute")).toBe("text-mute");
    expect(resolveIconVariantClass("rose")).toBe("text-rose");
    expect(resolveIconVariantClass("leaf")).toBe("text-leaf");
    expect(resolveIconVariantClass("mango")).toBe("text-mango");
    expect(resolveIconVariantClass("white")).toBe("text-white");
    expect(resolveIconVariantClass("current")).toBe("text-current");
  });

  it("provides liquid glass badge variants and container dimensions", () => {
    expect(BADGE_VARIANT_MAP.brand).toContain("bg-brand/10");
    expect(BADGE_VARIANT_MAP.brand).toContain("text-accent");
    expect(BADGE_VARIANT_MAP.glass).toContain("backdrop-blur-md");
    expect(BADGE_SIZE_MAP.md.container).toContain("h-10 w-10");
    expect(BADGE_SIZE_MAP.lg.container).toContain("h-12 w-12");
  });

  it("exports core components and re-exports Lucide icons", () => {
    expect(Icon).toBeDefined();
    expect(IconBadge).toBeDefined();
    expect(IconButton).toBeDefined();
    expect(VerifiedBadgeIcon).toBeDefined();
    expect(Search).toBeDefined();
    expect(MapPin).toBeDefined();
    expect(Heart).toBeDefined();
  });
});
