export type ShareFileOutcome = "shared" | "downloaded" | "failed";

export interface ShareFileDeps {
  /** Capacitor native shell (no DOM download manager). */
  isNative: boolean;
  /** Web Share Level 2 file sharing available (mobile Safari/Chrome). */
  canShareFiles: boolean;
  shareText: (title: string, text: string) => Promise<boolean>;
  shareFile: (file: File) => Promise<boolean>;
  anchorDownload: (filename: string, mime: string, text: string) => boolean;
}

/**
 * Tiered text-file export that works on web, mobile web, and native:
 * native share sheet → Web Share file → anchor download. Never throws.
 */
export async function shareOrDownloadTextFile(
  filename: string,
  mime: string,
  text: string,
  deps: ShareFileDeps,
): Promise<ShareFileOutcome> {
  if (deps.isNative) {
    try {
      return (await deps.shareText(filename, text)) ? "shared" : "failed";
    } catch {
      return "failed";
    }
  }
  if (deps.canShareFiles) {
    try {
      const file = new File([text], filename, { type: mime });
      return (await deps.shareFile(file)) ? "shared" : "failed";
    } catch {
      /* fall through to anchor download */
    }
  }
  try {
    return deps.anchorDownload(filename, mime, text) ? "downloaded" : "failed";
  } catch {
    return "failed";
  }
}

/** Plain anchor download for desktop web. False when DOM download is unavailable. */
export function anchorDownloadTextFile(filename: string, mime: string, text: string): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
