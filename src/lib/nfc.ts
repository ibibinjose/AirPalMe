/**
 * NFC profile sharing: write your bio link onto a physical NFC card/sticker,
 * then anyone who taps it opens your profile — no app needed on their side.
 *
 * Phone-to-phone beaming is not available on modern phones (Android Beam is
 * gone, Web NFC only talks to tags), so tag-writing is the real flow:
 *  - Android Chrome (web/PWA): works now via Web NFC, no install needed.
 *  - Native iOS/Android app: works once an NFC plugin is installed; the
 *    bridge below shape-checks the plugin at runtime instead of hard-coding
 *    one fork's import (several forks share isSupported/startScan/writeNDEF).
 *  - iPhone web browser: Web NFC is unsupported — the UI says so honestly.
 */
import { Capacitor } from "@capacitor/core";

export type NfcWriteSupport = "web" | "native" | "none";

export type NfcWriteResult =
  | { ok: true; via: "web" | "native" }
  | { ok: false; reason: "unsupported" | "cancelled" | "no-tag" | "permission" | "native-plugin-missing" | "failed" };

interface NdefReaderLike {
  write(message: { records: Array<{ recordType: string; data: string }> }): Promise<void>;
}

function getNdefReader(): (new () => NdefReaderLike) | null {
  try {
    const ctor = (window as unknown as Record<string, unknown>).NDEFReader;
    return typeof ctor === "function" ? (ctor as new () => NdefReaderLike) : null;
  } catch {
    return null;
  }
}

function isIosWeb(): boolean {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  } catch {
    return false;
  }
}

/** NDEF url records need an absolute https URL — refuse anything else. */
export function assertNfcUrl(url: string): string {
  const trimmed = String(url || "").trim();
  if (!/^https:\/\/[^/]+\//.test(`${trimmed}/`)) {
    throw new Error("NFC needs a full https profile link.");
  }
  return trimmed;
}

/** Which write path (if any) can trigger an NFC share on this device? */
export function nfcWriteSupport(): NfcWriteSupport {
  try {
    if (getNdefReader()) return "web";
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("NFC")) return "native";
  } catch {
    /* detection must never throw */
  }
  return "none";
}

export function nfcUnavailableHint(): string {
  if (isIosWeb()) {
    return "iPhones can't write NFC from the browser — use the AirPal app, or share your QR instead.";
  }
  return "This device can't write NFC tags — share your QR instead.";
}

async function writeViaWeb(url: string): Promise<NfcWriteResult> {
  const NDEFReader = getNdefReader();
  if (!NDEFReader) return { ok: false, reason: "unsupported" };
  try {
    const reader = new NDEFReader();
    await reader.write({ records: [{ recordType: "url", data: url }] });
    return { ok: true, via: "web" };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const msg = e instanceof Error ? e.message : "";
    if (name === "AbortError") return { ok: false, reason: "cancelled" };
    if (name === "NotAllowedError") return { ok: false, reason: "permission" };
    if (name === "NotSupportedError" || /not supported|no tag|timeout/i.test(msg)) {
      return { ok: false, reason: "no-tag" };
    }
    return { ok: false, reason: "failed" };
  }
}

interface NfcPluginLike {
  isSupported?: () => Promise<{ supported?: boolean }>;
  startScan?: () => Promise<void>;
  writeNDEF?: (options: { message: string }) => Promise<void>;
  cancelScan?: () => Promise<void>;
}

function getNfcPlugin(): NfcPluginLike | null {
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("NFC")) return null;
    const plugin = (Capacitor as unknown as { Plugins?: Record<string, unknown> }).Plugins?.NFC;
    if (!plugin || typeof plugin !== "object") return null;
    const candidate = plugin as NfcPluginLike;
    // Accept any installed fork that speaks the common shape.
    if (typeof candidate.writeNDEF !== "function") return null;
    return candidate;
  } catch {
    return null;
  }
}

async function writeViaNative(url: string): Promise<NfcWriteResult> {
  const plugin = getNfcPlugin();
  if (!plugin?.writeNDEF) return { ok: false, reason: "native-plugin-missing" };
  try {
    const supported = await plugin.isSupported?.();
    if (supported && supported.supported === false) return { ok: false, reason: "unsupported" };
    // iOS needs an explicit scan session before the tag is presented.
    await plugin.startScan?.().catch(() => undefined);
    await plugin.writeNDEF({ message: url });
    return { ok: true, via: "native" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/cancel|abort/i.test(msg)) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: "failed" };
  } finally {
    await plugin.cancelScan?.().catch(() => undefined);
  }
}

/**
 * Trigger an NFC share of this profile link. The browser/system prompts you
 * to hold a blank NFC card to the phone; the link is written onto the card.
 */
export async function writeProfileTag(rawUrl: string): Promise<NfcWriteResult> {
  let url: string;
  try {
    url = assertNfcUrl(rawUrl);
  } catch {
    return { ok: false, reason: "failed" };
  }
  const support = nfcWriteSupport();
  if (support === "web") return writeViaWeb(url);
  if (support === "native") return writeViaNative(url);
  return { ok: false, reason: "unsupported" };
}

export function nfcResultMessage(result: NfcWriteResult): string {
  if (result.ok) return "Card written — anyone who taps it opens your bio.";
  switch (result.reason) {
    case "cancelled":
      return "Cancelled — no card was written.";
    case "no-tag":
      return "No NFC card detected — hold a blank card to the back of the phone and try again.";
    case "permission":
      return "NFC permission was blocked — allow it in the browser site settings and retry.";
    case "native-plugin-missing":
      return "The native app needs its NFC plugin installed — share your QR for now.";
    case "unsupported":
      return nfcUnavailableHint();
    default:
      return "Couldn't write that card — try again.";
  }
}
