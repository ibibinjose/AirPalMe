/** Primary guest tabs: Explore (home) / Plan / Stay, plus Mate and Scan. Calendar lives inside Explore + global search. */
export type GuestTab = "scan" | "plan" | "stay" | "explore" | "mate";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/scan")) return "scan";
  if (path.startsWith("/mate")) return "mate";
  if (path.startsWith("/plan") || path.startsWith("/invite")) return "plan";
  if (
    path.startsWith("/calendar") ||
    path.startsWith("/events") ||
    path.startsWith("/guide") ||
    path.startsWith("/circle") ||
    path.startsWith("/explore")
  )
    return "explore";
  if (
    path.startsWith("/concierge") ||
    path.startsWith("/g/") ||
    path.startsWith("/stay") ||
    path.startsWith("/c/") ||
    path.startsWith("/q/")
  ) {
    return "stay";
  }
  return "explore";
}
