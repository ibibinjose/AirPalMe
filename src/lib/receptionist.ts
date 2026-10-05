export type StaffNeedKind = "linen" | "late_checkout" | "maintenance" | "cleaning" | "general";

/**
 * Detects whether a guest message needs physical staff action, and which kind.
 * Null means answerable from property knowledge — no escalation offered.
 */
export function staffNeedKind(text: string): StaffNeedKind | null {
  const q = text.toLowerCase();
  if (
    !/towel|pillow|blanket|housekeep|clean|linen|amenity|ac|air.?con|plumb|leak|broken|fix|maintenance|late\s*(out|checkout)|taxi|shuttle|luggage|key|door/i.test(
      q,
    )
  ) {
    return null;
  }
  if (/towel|pillow|blanket|linen/i.test(q)) return "linen";
  if (/late\s*(out|checkout)/i.test(q)) return "late_checkout";
  if (/ac|air.?con|leak|broken|fix|maintenance/i.test(q)) return "maintenance";
  if (/clean|housekeep/i.test(q)) return "cleaning";
  return "general";
}

/** Urgency for a staff ticket from guest wording: leaks and emergencies only. */
export function isUrgentRequest(details: string): boolean {
  return /urgent|leak|emergency/i.test(details);
}
