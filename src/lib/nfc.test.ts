import { describe, expect, it } from "vitest";
import { assertNfcUrl, nfcResultMessage, nfcWriteSupport } from "./nfc";

describe("nfc", () => {
  it("accepts absolute https profile links", () => {
    expect(assertNfcUrl("https://airpal.me/@maya")).toBe("https://airpal.me/@maya");
    expect(assertNfcUrl("  https://airpal.me/@maya  ")).toBe("https://airpal.me/@maya");
  });

  it("rejects non-https and relative links", () => {
    expect(() => assertNfcUrl("http://airpal.me/@maya")).toThrow();
    expect(() => assertNfcUrl("/@maya")).toThrow();
    expect(() => assertNfcUrl("")).toThrow();
    expect(() => assertNfcUrl("notaurl")).toThrow();
  });

  it("reports no write path in this runtime", () => {
    // jsdom has no NDEFReader and no Capacitor NFC plugin.
    expect(nfcWriteSupport()).toBe("none");
  });

  it("explains every write outcome in plain words", () => {
    expect(nfcResultMessage({ ok: true, via: "web" })).toContain("anyone who taps it");
    expect(nfcResultMessage({ ok: false, reason: "cancelled" })).toContain("Cancelled");
    expect(nfcResultMessage({ ok: false, reason: "no-tag" })).toContain("No NFC card detected");
    expect(nfcResultMessage({ ok: false, reason: "permission" })).toContain("permission");
    expect(nfcResultMessage({ ok: false, reason: "native-plugin-missing" })).toContain("plugin");
    expect(nfcResultMessage({ ok: false, reason: "failed" })).toContain("try again");
  });
});
