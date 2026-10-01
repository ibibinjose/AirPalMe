import { describe, expect, it, vi } from "vitest";
import { anchorDownloadTextFile, shareOrDownloadTextFile, type ShareFileDeps } from "./share-file";

function deps(overrides: Partial<ShareFileDeps> = {}): ShareFileDeps & {
  shareText: ReturnType<typeof vi.fn>;
  shareFile: ReturnType<typeof vi.fn>;
  anchorDownload: ReturnType<typeof vi.fn>;
} {
  return {
    isNative: false,
    canShareFiles: false,
    shareText: vi.fn().mockResolvedValue(true),
    shareFile: vi.fn().mockResolvedValue(true),
    anchorDownload: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe("shareOrDownloadTextFile", () => {
  it("uses the native share sheet on Capacitor and never touches the DOM", async () => {
    const d = deps({ isNative: true, canShareFiles: true });
    await expect(shareOrDownloadTextFile("a.csv", "text/csv", "x", d)).resolves.toBe("shared");
    expect(d.shareText).toHaveBeenCalledWith("a.csv", "x");
    expect(d.shareFile).not.toHaveBeenCalled();
    expect(d.anchorDownload).not.toHaveBeenCalled();
  });

  it("prefers Web Share files on mobile web", async () => {
    const d = deps({ canShareFiles: true });
    await expect(shareOrDownloadTextFile("a.csv", "text/csv", "x", d)).resolves.toBe("shared");
    expect(d.shareFile).toHaveBeenCalledOnce();
    expect(d.anchorDownload).not.toHaveBeenCalled();
  });

  it("falls back to anchor download on desktop web", async () => {
    const d = deps();
    await expect(shareOrDownloadTextFile("a.csv", "text/csv", "x", d)).resolves.toBe("downloaded");
    expect(d.anchorDownload).toHaveBeenCalledWith("a.csv", "text/csv", "x");
  });

  it("reports failure instead of throwing", async () => {
    const d = deps({
      isNative: true,
      shareText: vi.fn().mockRejectedValue(new Error("dismissed")),
    });
    await expect(shareOrDownloadTextFile("a.csv", "text/csv", "x", d)).resolves.toBe("failed");
  });
});

describe("anchorDownloadTextFile", () => {
  it("returns false without a DOM", () => {
    expect(anchorDownloadTextFile("a.csv", "text/csv", "x")).toBe(false);
  });
});
