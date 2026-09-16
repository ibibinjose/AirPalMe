export interface InviteAutoRsvpInput {
  arrivedViaInvite: boolean;
  planLoaded: boolean;
  isHost: boolean;
  alreadyAttendee: boolean;
  planDate: string;
  planStatus: string;
  todayStr: string;
}

/**
 * Opening an /invite/:code link should drop the guest straight into the
 * RSVP sheet — but only once, only for upcoming plans, and never for the
 * host or someone who already joined.
 */
export function shouldAutoOpenInviteRsvp(input: InviteAutoRsvpInput): boolean {
  if (!input.arrivedViaInvite) return false;
  if (!input.planLoaded) return false;
  if (input.isHost || input.alreadyAttendee) return false;
  if (input.planStatus === "completed") return false;
  if (!input.planDate || input.planDate < input.todayStr) return false;
  return true;
}

/** Local YYYY-MM-DD for comparing plan dates. */
export function localTodayStr(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
