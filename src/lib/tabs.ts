/**
 * Companion tabs: Explore / Plan / Scan / Inbox / Me.
 * Home is accessed via the top BrandMark / App icon.
 * Scan is the centerpiece tab for QR / Wave / NFC interaction.
 */
export type GuestTab = "home" | "explore" | "trips" | "scan" | "inbox" | "me";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/me/inbox")) return "inbox";
  if (
    path.startsWith("/plan") ||
    path.startsWith("/invite") ||
    path.startsWith("/circle") ||
    path.startsWith("/event/new") ||
    path === "/event"
  ) {
    return "trips";
  }
  if (
    path.startsWith("/explore") ||
    path.startsWith("/discover") ||
    path.startsWith("/discovery")
  ) {
    return "explore";
  }
  if (
    path.startsWith("/me") ||
    path.startsWith("/bio") ||
    path.startsWith("/@") ||
    path.startsWith("/settings")
  ) {
    return "me";
  }
  if (path === "/") return "home";
  return "explore";
}

