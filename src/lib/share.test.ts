import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isShareSupported,
  shareContent,
  shareCurrentLocation,
  shareCuratedGuide,
  shareTour,
} from "./share";

describe("share utility (Web Share API & clipboard fallback)", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("identifies if Web Share is supported", () => {
    Object.defineProperty(global, "navigator", {
      value: { share: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(isShareSupported()).toBe(true);

    Object.defineProperty(global, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isShareSupported()).toBe(false);
  });

  it("calls navigator.share when available", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const result = await shareContent({
      title: "Test Guide",
      text: "Check this out",
      url: "https://airpal.me/guide",
    });

    expect(result).toBe("shared");
    expect(mockShare).toHaveBeenCalledWith({
      title: "Test Guide",
      text: "Check this out",
      url: "https://airpal.me/guide",
    });
  });

  it("handles user cancellation without clipboard fallback or error", async () => {
    const abortErr = new Error("Share canceled");
    abortErr.name = "AbortError";
    const mockShare = vi.fn().mockRejectedValue(abortErr);
    const mockClipboard = { writeText: vi.fn() };

    Object.defineProperty(global, "navigator", {
      value: { share: mockShare, clipboard: mockClipboard },
      writable: true,
      configurable: true,
    });

    const result = await shareContent({
      title: "Test",
      url: "https://airpal.me",
    });

    expect(result).toBe("cancelled");
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
  });

  it("falls back to clipboard copy when navigator.share is not present", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "navigator", {
      value: { clipboard: { writeText: mockWriteText } },
      writable: true,
      configurable: true,
    });

    const result = await shareContent({
      title: "Curated Guide",
      url: "https://airpal.me/guide?city=Melbourne",
      copiedMessage: "Copied!",
    });

    expect(result).toBe("copied");
    expect(mockWriteText).toHaveBeenCalledWith("https://airpal.me/guide?city=Melbourne");
  });

  it("formats shareCurrentLocation with city-tailored link and text", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const result = await shareCurrentLocation("Hobart");
    expect(result).toBe("shared");
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Exploring Hobart · AirPal",
        url: expect.stringContaining("city=Hobart"),
      }),
    );
  });

  it("formats shareCuratedGuide appropriately", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const result = await shareCuratedGuide("Sydney");
    expect(result).toBe("shared");
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Sydney Curated Local Guide · AirPal",
        url: expect.stringContaining("city=Sydney"),
      }),
    );
  });

  it("formats shareTour with tour title and direct route link", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const result = await shareTour({
      id: "rocks-harbour",
      title: "The Rocks Heritage Walk",
      duration: "45 min",
    });

    expect(result).toBe("shared");
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "The Rocks Heritage Walk · Curated Walk",
        url: expect.stringContaining("/tour/rocks-harbour"),
      }),
    );
  });
});
