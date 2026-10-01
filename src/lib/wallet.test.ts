import { describe, expect, it } from "vitest";
import {
  ticketWalletPassUrl,
  businessCardWalletPassUrl,
  googleWalletTicketUrl,
  googleWalletCardUrl,
  isApplePlatform,
} from "./wallet";

describe("wallet helper", () => {
  it("formats ticket wallet pass URL with booking id", () => {
    const url = ticketWalletPassUrl("booking-12345");
    expect(url).toContain("/api/wallet/ticket/booking-12345.pkpass");
  });

  it("formats business card wallet pass URL with handle", () => {
    const url = businessCardWalletPassUrl("airpalmate");
    expect(url).toContain("/api/wallet/card/airpalmate.pkpass");
  });

  it("handles handle characters safely with encoding", () => {
    const url = businessCardWalletPassUrl("mate special");
    expect(url).toContain("/api/wallet/card/mate%20special.pkpass");
  });

  it("isApplePlatform returns a boolean", () => {
    expect(typeof isApplePlatform()).toBe("boolean");
  });

  it("formats Google Wallet save-link URLs for tickets and cards", () => {
    expect(googleWalletTicketUrl("booking-12345")).toContain("/api/wallet/google/ticket/booking-12345");
    expect(googleWalletCardUrl("airpalmate")).toContain("/api/wallet/google/card/airpalmate");
  });
});
