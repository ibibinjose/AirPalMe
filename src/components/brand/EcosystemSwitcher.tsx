export type EcosystemMode = "me" | "pass";

/**
 * Determine the ecosystem lens from the active route path.
 */
export function getEcosystemMode(path: string): EcosystemMode {
  if (
    path === "/pass" ||
    path.startsWith("/pass/") ||
    path.startsWith("/events") ||
    path.startsWith("/e/") ||
    path.startsWith("/deals") ||
    path.startsWith("/me/tickets") ||
    path.startsWith("/ticket/") ||
    path === "/event" ||
    path.startsWith("/event/") ||
    path.startsWith("/scan") ||
    path.startsWith("/stay") ||
    path.startsWith("/host") ||
    path.startsWith("/business") ||
    path.startsWith("/partners") ||
    path === "/partner" ||
    path.startsWith("/concierge")
  ) {
    return "pass";
  }
  return "me";
}

export interface EcosystemSwitcherProps {
  currentPath?: string;
  variant?: "header" | "pill" | "banner" | "compact";
  className?: string;
}

/**
 * Single Unified App Architecture:
 * The ecosystem switcher is retired in favor of cohesive unified navigation.
 */
export function EcosystemSwitcher(_props: EcosystemSwitcherProps) {
  return null;
}
