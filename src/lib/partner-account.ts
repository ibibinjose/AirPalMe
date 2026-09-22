/**
 * Partner account is the same AirPal login plus a live place.
 * Guests find that place on What's on and in search. It is not a second user.
 */
export function partnerAccountPath(input: { signedIn: boolean; hasPlace: boolean }): string {
  if (input.hasPlace) return "/business";
  if (input.signedIn) return "/business/onboard";
  return "/start?role=business&tab=signup&next=/business/onboard";
}
