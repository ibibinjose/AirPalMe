import type { UserRole } from "./airpal-data";

export type PropertyMemberRole = "host_admin" | "staff";

export type AccessClaims = {
  platform_admin?: boolean;
  role?: UserRole;
  properties?: Record<string, PropertyMemberRole>;
};

export const TICKET_CATEGORIES = ["reception", "housekeeping", "maintenance", "dining", "late_checkout"] as const;

export const FUNCTIONS_REGION = "us-central1";

export const CALLABLES = {
  completeRegistration: "completeRegistration",
  ensurePlatformAdmin: "ensurePlatformAdmin",
  setPropertyMember: "setPropertyMember",
  claimDeal: "claimDeal",
  redeemVoucher: "redeemVoucher",
  providePartnerDeal: "providePartnerDeal",
  submitPartnerClaim: "submitPartnerClaim",
  reviewPartnerClaim: "reviewPartnerClaim",
  backfillOwnerClaims: "backfillOwnerClaims",
  getPropertyWifi: "getPropertyWifi",
  updatePropertyWifi: "updatePropertyWifi",
  updatePropertyProfile: "updatePropertyProfile",
  rotateRoomToken: "rotateRoomToken",
  claimFreeVenuePresence: "claimFreeVenuePresence",
  upsertBusinessListing: "upsertBusinessListing",
  upsertBusinessDeal: "upsertBusinessDeal",
  upsertEvent: "upsertEvent",
  upsertEventStall: "upsertEventStall",
  saveAttendeeStall: "saveAttendeeStall",
  submitVenueRating: "submitVenueRating",
  checkHandleAvailable: "checkHandleAvailable",
  createBusinessProfile: "createBusinessProfile",
  updateBusinessProfile: "updateBusinessProfile",
  setBioOffer: "setBioOffer",
  recordBioTap: "recordBioTap",
  claimBioOffer: "claimBioOffer",
  transferHandle: "transferHandle",
  listBioDirectory: "listBioDirectory",
  recordAnalyticsBatch: "recordAnalyticsBatch",
  runAnalyticsAggregation: "runAnalyticsAggregation",
  createExperienceCheckoutSession: "createExperienceCheckoutSession",
  confirmExperienceBookingRemote: "confirmExperienceBookingRemote",
  createBookingCheckoutSession: "createBookingCheckoutSession",
  payBookingBalance: "payBookingBalance",
  createStayCheckoutSession: "createStayCheckoutSession",
  createConnectAccountLink: "createConnectAccountLink",
  refreshConnectAccount: "refreshConnectAccount",
  createConnectLoginLink: "createConnectLoginLink",
  releaseHeldPayouts: "releaseHeldPayouts",
  completePaidBooking: "completePaidBooking",
  refundPaidBooking: "refundPaidBooking",
  createSubscriptionCheckout: "createSubscriptionCheckout",
  createSubscriptionPortal: "createSubscriptionPortal",
  createStaffTicket: "createStaffTicket",
  resolveStaffTicket: "resolveStaffTicket",
  createManagedProduct: "createManagedProduct",
  createManagedCheckoutSession: "createManagedCheckoutSession",
  placeDiningOrder: "placeDiningOrder",
  updateDiningOrderStatus: "updateDiningOrderStatus",
  askAirPal: "askAirPal",
  createPlan: "createPlanRemote",
  createPlanRemote: "createPlanRemote",
  rsvpPlan: "rsvpPlanRemote",
  rsvpPlanRemote: "rsvpPlanRemote",
  addPlanStop: "addPlanStopRemote",
  addPlanStopRemote: "addPlanStopRemote",
  votePlanStop: "votePlanStopRemote",
  votePlanStopRemote: "votePlanStopRemote",
  postPlanComment: "postPlanCommentRemote",
  postPlanCommentRemote: "postPlanCommentRemote",
  completePlan: "completePlanRemote",
  completePlanRemote: "completePlanRemote",
  getPlanByInviteCode: "getPlanByInviteCode",
  confirmExperienceBooking: "confirmExperienceBookingRemote",
  completeAccountSignup: "completeAccountSignup",
  ensureUserProfile: "ensureUserProfile",
  loginWithPhonePassword: "loginWithPhonePassword",
  shareHere: "shareHere",
  stopHere: "stopHere",
  startWave: "startWave",
  waveAt: "waveAt",
  stopWave: "stopWave",
  getPulseByToken: "getPulseByToken",
  submitPulseResponse: "submitPulseResponse",
  createPulse: "createPulse",
  publishPulse: "publishPulse",
  acknowledgePulseIssue: "acknowledgePulseIssue",
  resolvePulseIssue: "resolvePulseIssue",
  setPulseStatus: "setPulseStatus",
  recordPulseFollowup: "recordPulseFollowup",
} as const;

export type CompleteAccountSignupRequest = {
  handle: string;
  name: string;
  email: string;
  /** YYYY-MM-DD birth date. Server verifies 18+ and stores only a boolean. */
  birthDate: string;
};

export type LoginWithPhonePasswordRequest = {
  phone: string;
  password: string;
  /** Public web API key (same as the client app). Optional if Functions has FIREBASE_WEB_API_KEY. */
  apiKey?: string;
};

export type LoginWithPhonePasswordResponse = {
  token: string;
};

/** Canonical platform Super Admin. Extra addresses can be added via PLATFORM_ADMIN_EMAILS. */
export const CANONICAL_PLATFORM_ADMIN_EMAILS = ["bibin.inc@gmail.com"];

export type StayContextPayload = {
  type: "hotel" | "hostel" | "campus" | "event" | "tour";
  title: string;
  identifier: string;
  guestName: string;
  destination: string;
  badgeLabel: string;
};

export type CompleteRegistrationRequest = {
  displayName: string;
  role: "host_admin" | "guest";
  propertyName?: string;
  kind?: "hotel" | "motel" | "serviced-apartment" | "hostel" | "boutique" | "campus" | "venue";
  city?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  postalCode?: string;
  phoneCountryCode?: string;
  geoLat?: number;
  geoLng?: number;
  wifiNetwork?: string;
  wifiPassword?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  roomsCount?: number;
  checkIn?: string;
  checkOut?: string;
  breakfastHours?: string;
  breakfastLocation?: string;
  breakfastType?: string;
  breakfastPrice?: string;
};

export type CompleteRegistrationResponse = {
  uid: string;
  role: UserRole;
  propertyId: string;
  propertyIds: string[];
  /** Opaque room token for the default room QR (?r=). */
  defaultRoomToken?: string;
  defaultRoomNumber?: string;
  lobbyMarkerId?: string;
  handle?: string;
  city?: string;
};

export type ClaimDealRequest = {
  dealId: string;
  stayContext: StayContextPayload;
};

export type ClaimDealResponse = {
  voucher: {
    id: string;
    dealId: string;
    venueId: string;
    venueName: string;
    venueAddress: string;
    category: string;
    dealTitle: string;
    guestPerk: string;
    userContext: StayContextPayload;
    claimedAt: string;
    expiresAt: string;
    status: "active" | "redeemed" | "expired";
    discountSummary: string;
  };
};

export type RedeemVoucherRequest = {
  voucherId: string;
  staffPin: string;
};

export type RedeemVoucherResponse = {
  ok: true;
  success: true;
  message: string;
  redeemedAt: string;
};

export type GetPropertyWifiRequest = {
  propertyId: string;
  /** Opaque room QR token (`?r=`). Required for guests. */
  roomToken?: string;
  /** Lobby / room marker id from `/q/{id}`. */
  markerId?: string;
};

export type GetPropertyWifiResponse = {
  network: string;
  password: string;
  speed: string;
};

export type ProvidePartnerDealRequest = {
  venueId: string;
  venueName: string;
  venueAddress: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  guestPerk: string;
  dealType: "table_booking" | "service_booking" | "walk_in_voucher" | "all";
  discountBadge?: string;
  targetAudiences: StayContextPayload["type"][];
  terms: string;
  staffPin: string;
  claimLimit?: number;
  expiresAt?: string;
  priceLevel?: string;
};

export type SubmitPartnerClaimRequest = {
  venueId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  customPerk?: string;
  abnOrTaxId?: string;
  plan?: string;
};

export type ReviewPartnerClaimRequest = {
  claimId: string;
  decision: "approved" | "rejected";
};

export type ClaimFreeVenuePresenceRequest = {
  venueName: string;
  address: string;
  category: string;
  shortWhy: string;
  hours?: string;
  phone?: string;
  precinctId?: string;
  lat?: number;
  lng?: number;
  guestPerk?: string;
  mapsPlaceId?: string;
  website?: string;
  heroImage?: string;
  plan?: string;
  abnOrTaxId?: string;
};

export type ClaimFreeVenuePresenceResponse = {
  venueId: string;
  markerId: string;
  placeId: string;
  markerPath: string;
};

export type UpsertBusinessListingRequest = {
  listingId?: string;
  name: string;
  category: string;
  address: string;
  hours?: string;
  shortWhy: string;
  phone?: string;
  lat?: number;
  lng?: number;
  precinctId?: string;
  heroImage?: string;
  handle?: string;
  hoursVerifiedAt?: string;
  mapsPlaceId?: string;
  website?: string;
  plan?: string;
  abnOrTaxId?: string;
};

export type UpsertBusinessDealRequest = {
  listingId: string;
  badge: string;
  detail: string;
  expiry?: string;
  active?: boolean;
};

export type UpsertEventRequest = {
  eventId?: string;
  name: string;
  flavour: string;
  city?: string;
  venue?: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  categoryChips?: string[];
  scheduleVerifiedAt?: string;
  room?: string;
  ticketPriceCents?: number;
  capacity?: number;
  /** Festival program slug (festivals/{slug}) this session belongs to. */
  festivalSlug?: string;
  track?: string;
  registrationUrl?: string;
  registrationNote?: string;
  speakers?: { name: string; role?: string; handle?: string }[];
};

export type UpsertEventStallRequest = {
  id?: string;
  eventId: string;
  name: string;
  category: string;
  booth?: string;
  location?: string;
  shortWhy?: string;
  offer?: string;
  handle?: string;
};

export type SaveAttendeeStallRequest = {
  eventId: string;
  stallId: string;
};

export type CheckHandleAvailableRequest = { handle: string };
export type CreateBusinessProfileRequest = {
  handle: string;
  name: string;
  city?: string;
  category: string;
  shortWhy: string;
  placeId?: string;
  listingId?: string;
  kind?: "person" | "business";
};
export type UpdateBusinessProfileRequest = {
  handle: string;
  name?: string;
  shortWhy?: string;
  city?: string;
  category?: string;
  hours?: string;
  openNow?: boolean;
  phone?: string;
  avatar?: string;
  cover?: string;
  mapsPlaceId?: string;
  listingId?: string;
  placeId?: string;
  kind?: "person" | "business";
  aboutText?: string;
  pronouns?: string;
  languages?: string;
  categoryTag?: string;
  primaryCta?: string;
  availabilityStatus?: string;
  customStatus?: string;
  customStatusEmoji?: string;
  geo?: { lat: number; lng: number };
  zooHunt?: boolean;
  links?: Array<{ id: string; type: string; label: string; href: string }>;
  products?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
  services?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
  deals?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
};
export type ClaimBioOfferRequest = { handle: string; dealId: string };
export type ClaimBioOfferResponse = { code: string; badge: string; detail: string; expiresAt: string };
export type TransferHandleRequest = { from: string; to: string };
export type ListBioDirectoryRow = { handle: string; name: string; ownerUid?: string; taps: number };
export type SetBioOfferRequest = {
  handle: string;
  badge: string;
  detail: string;
  active?: boolean;
};
export type RecordBioTapRequest = { handle: string; kind?: string };

export type SubmitVenueRatingRequest = {
  mood: string;
  emoji: string;
  note?: string;
  target: "stall" | "event" | "stay";
  eventId?: string;
  stallId?: string;
  stallName?: string;
  propertyId?: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parsePlatformAdminEmails(raw: string | undefined): string[] {
  const extra = String(raw || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...CANONICAL_PLATFORM_ADMIN_EMAILS, ...extra]));
}

export function isPlatformAdminEmail(email: string, extra: string[] = []): boolean {
  return parsePlatformAdminEmails(extra.join(",")).includes(normalizeEmail(email));
}

/** Client-requested roles never include staff or super_admin. Allowlist is server-only. */
export function resolveRegistrationRole(email: string, requested: string, platformAdminEmails: string[]): UserRole {
  const normalized = normalizeEmail(email);
  const allow = new Set([...CANONICAL_PLATFORM_ADMIN_EMAILS, ...platformAdminEmails.map(normalizeEmail)]);
  if (allow.has(normalized)) return "super_admin";
  if (requested === "host_admin") return "host_admin";
  return "guest";
}

export function roleFromAccessToken(
  claims: AccessClaims | Record<string, unknown> | undefined,
  profileRole?: UserRole,
): UserRole {
  if (!claims) return profileRole || "guest";
  if (claims.platform_admin === true) return "super_admin";
  const tokenRole = claims.role;
  if (tokenRole === "super_admin" || tokenRole === "host_admin" || tokenRole === "staff" || tokenRole === "guest") {
    return tokenRole;
  }
  return profileRole || "guest";
}

export function pinIsWellFormed(pin: string): boolean {
  return /^\d{4,8}$/.test(pin.trim());
}

export function canClaimDeal(input: {
  active: boolean;
  claimLimit?: number;
  claimsCount: number;
  existingActiveForUser: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.active) return { ok: false, reason: "This deal is no longer active." };
  if (input.existingActiveForUser) {
    return { ok: false, reason: "You already have an active pass for this deal." };
  }
  if (typeof input.claimLimit === "number" && input.claimsCount >= input.claimLimit) {
    return { ok: false, reason: "This deal has reached its claim limit." };
  }
  return { ok: true };
}

/** Guests need a scanned room token or a marker that belongs to the property. Hosts always pass. */
export function canReadPropertyWifi(input: {
  isHost: boolean;
  roomTokens?: Record<string, string> | null;
  lobbyMarkerId?: string | null;
  roomToken?: string | null;
  markerId?: string | null;
  markerBelongsToProperty?: boolean;
}): boolean {
  if (input.isHost) return true;
  const token = input.roomToken?.trim();
  if (token && input.roomTokens && Object.prototype.hasOwnProperty.call(input.roomTokens, token)) return true;
  const markerId = input.markerId?.trim();
  if (!markerId) return false;
  if (input.lobbyMarkerId && markerId === input.lobbyMarkerId) return true;
  return Boolean(input.markerBelongsToProperty);
}
