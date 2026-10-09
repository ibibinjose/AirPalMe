/**
 * Shipped dock: Home / Now / Plan / Inbox / Me (Phase 6: Explore tab retargeted
 * to the /now composer; legacy /explore + /discover redirect there).
 * "scan" is a path bucket, not a tab — Scan lives behind + Create.
 */
export type GuestTab = "home" | "explore" | "trips" | "scan" | "inbox" | "me";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/me/inbox")) return "inbox";
  if (path.startsWith("/plan") || path.startsWith("/invite") || path.startsWith("/event/new") || path === "/event") {
    return "trips";
  }
  if (
    path === "/now" ||
    path.startsWith("/pass") ||
    path.startsWith("/explore") ||
    path.startsWith("/discover") ||
    path.startsWith("/discovery")
  ) {
    return "explore";
  }
  if (path.startsWith("/me") || path.startsWith("/bio") || path.startsWith("/@") || path.startsWith("/settings")) {
    return "me";
  }
  if (path === "/") return "home";
  return "explore";
}

/** Pass shell dock: Pass / Events / Tickets / Scan / Me. */
export type PassTab = "pass" | "events" | "tickets" | "scan" | "me";

/** Map a route path to the Pass-dock tab it belongs to. Pure: safe to unit test. */
export function passTabFromPath(path: string): PassTab {
  if (path.startsWith("/me/tickets") || path.startsWith("/ticket/")) return "tickets";
  if (path.startsWith("/events") || path.startsWith("/e/")) return "events";
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/me") || path.startsWith("/bio") || path.startsWith("/@") || path.startsWith("/settings")) {
    return "me";
  }
  return "pass";
}
