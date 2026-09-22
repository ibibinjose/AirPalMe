/**
 * Companion tabs: Home / Explore / Trips / Inbox / Me.
 * Scan and Stay are not tabs — Scan lives behind the + Create action,
 * Stay lives inside Explore/Home. Every shipped route still resolves;
 * this only decides which tab lights up.
 */
export type GuestTab = "home" | "explore" | "trips" | "inbox" | "me";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
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
  // Discovery content (calendar, events, places, stays, mate, club, …)
  // and the Scan create-action all belong to Explore's world except
  // the personal home dashboard itself.
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "home";
  return "explore";
}
