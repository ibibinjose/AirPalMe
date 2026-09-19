/** Mobile tabs: What's on / Plan / Scan / Stay / @ Me. Circle lives in Plan. */
export type GuestTab = "explore" | "plan" | "scan" | "stay" | "me";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/plan") || path.startsWith("/invite") || path.startsWith("/circle")) return "plan";
  if (
    path.startsWith("/concierge") ||
    path.startsWith("/g/") ||
    path.startsWith("/stay") ||
    path.startsWith("/c/") ||
    path.startsWith("/q/")
  ) {
    return "stay";
  }
  if (path.startsWith("/me") || path.startsWith("/bio") || path.startsWith("/@")) return "me";
  return "explore";
}
