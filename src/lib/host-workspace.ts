/** Live Harbour stay written by seed — platform admins operate this when they have no own property. */
export const LIVE_HOST_PROPERTY_ID = "harbour-hotel";

/** Room QR pairs from the live property. Never invent tok-101-demo. */
export function roomTokenEntries(roomTokens?: Record<string, string> | null): Array<[token: string, room: string]> {
  if (!roomTokens) return [];
  return Object.entries(roomTokens).filter(([token, room]) => token.trim() && room.trim());
}

/** Properties the host header and /host should watch. */
export function hostWatchPropertyIds(propertyIds: string[] | undefined, isAdmin: boolean): string[] {
  const ids = [...(propertyIds || [])].filter(Boolean);
  if (isAdmin && !ids.includes(LIVE_HOST_PROPERTY_ID)) ids.push(LIVE_HOST_PROPERTY_ID);
  return ids;
}

export function hostWorkspacePropertyId(propertyIds: string[] | undefined, isAdmin: boolean): string {
  return propertyIds?.[0] || (isAdmin ? LIVE_HOST_PROPERTY_ID : "");
}
