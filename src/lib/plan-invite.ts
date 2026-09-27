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

export interface GuestRsvpInput {
  /** True inside the native iOS/Android shell, where an account is required. */
  isNative: boolean;
  /** True when the guest already has a signed-in AirPal account. */
  hasAccount: boolean;
}

/**
 * Zero-friction RSVP gate (P0 plan layer): a guest with no account may RSVP
 * straight from an invite link on the website, where an anonymous Firebase
 * session satisfies the signed-in write rules. Native apps stay account-gated
 * per the shipped auth freeze, and signed-in users take the normal path.
 */
export function canRsvpAsGuest(input: GuestRsvpInput): boolean {
  if (input.hasAccount) return false;
  return !input.isNative;
}
