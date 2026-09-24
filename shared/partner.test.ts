import { describe, expect, it } from "vitest";
import { isPartnerEmail, isPartnerSegment, isPartnerSource, validatePartnerLead } from "./partner";

const good = {
  segment: "stay",
  source: "google",
  company: "Harbour Hotel",
  name: "Ava Chen",
  email: "ava@harbourhotel.com.au",
  phone: "0400 000 000",
  message: "We run a 40-room boutique hotel and want to list on AirPal Stay.",
};

describe("partner leads", () => {
  it("accepts a complete inquiry", () => {
    expect(validatePartnerLead(good)).toEqual([]);
  });

  it("rejects bad segments, sources, emails, and short messages", () => {
    expect(validatePartnerLead({ ...good, segment: "hotel" })).toContain("Choose what kind of partner you are.");
    expect(validatePartnerLead({ ...good, source: "billboard" })).toContain("Tell us how you found us.");
    expect(validatePartnerLead({ ...good, email: "not-an-email" })).toContain("Enter a valid email.");
    expect(validatePartnerLead({ ...good, message: "hi" })).toContain("Tell us a little more (10+ characters).");
    expect(validatePartnerLead({ ...good, company: "" })).toContain("Company name is required.");
  });

  it("validates helpers", () => {
    expect(isPartnerSegment("event")).toBe(true);
    expect(isPartnerSegment("hotel")).toBe(false);
    expect(isPartnerSource("ai")).toBe(true);
    expect(isPartnerSource("tv")).toBe(false);
    expect(isPartnerEmail("a@b.co")).toBe(true);
    expect(isPartnerEmail("a@b")).toBe(false);
  });
});
