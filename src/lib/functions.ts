import { httpsCallable } from "firebase/functions";
import {
  CALLABLES,
  type ClaimFreeVenuePresenceRequest,
  type ClaimFreeVenuePresenceResponse,
  type CompleteRegistrationRequest,
  type CompleteRegistrationResponse,
  type GetPropertyWifiRequest,
  type GetPropertyWifiResponse,
  type SubmitPartnerClaimRequest,
  type CompleteAccountSignupRequest,
  type LoginWithPhonePasswordRequest,
  type LoginWithPhonePasswordResponse,
} from "@shared/airpal-security";
import type {
  CreatePlanRequest,
  CreatePlanResponse,
  RsvpPlanRequest,
  RsvpPlanResponse,
  AddPlanStopRequest,
  AddPlanStopResponse,
  VotePlanStopRequest,
  VotePlanStopResponse,
  VoteDateOptionRequest,
  VoteDateOptionResponse,
  PostPlanCommentRequest,
  PostPlanCommentResponse,
  CompletePlanRequest,
  CompletePlanResponse,
  GetPlanByInviteCodeRequest,
  GetPlanByInviteCodeResponse,
  ExperienceProofResponse,
} from "@shared/plan";
import type {
  InviteToPlanRequest,
  InviteToPlanResponse,
  SendPlanBroadcastRequest,
  SendPlanBroadcastResponse,
} from "@shared/plan-notify";
import { getFirebaseFunctions, isFirebaseConfigured } from "./firebase";

export function liveBackendEnabled() {
  return isFirebaseConfigured;
}

async function callFunction<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function completeRegistrationRemote(data: CompleteRegistrationRequest) {
  return callFunction<CompleteRegistrationRequest, CompleteRegistrationResponse>(CALLABLES.completeRegistration, data);
}
export const completeRegistration = completeRegistrationRemote;

export function completeAccountSignupRemote(data: CompleteAccountSignupRequest) {
  return callFunction<CompleteAccountSignupRequest, { ok: true; phone: string }>(CALLABLES.completeAccountSignup, data);
}

export function loginWithPhonePasswordRemote(data: LoginWithPhonePasswordRequest) {
  return callFunction<LoginWithPhonePasswordRequest, LoginWithPhonePasswordResponse>(
    CALLABLES.loginWithPhonePassword,
    data,
  );
}

export function ensureUserProfileRemote() {
  return callFunction<Record<string, never>, { ok: true; created: boolean }>(CALLABLES.ensureUserProfile, {});
}

export function getPropertyWifiRemote(data: GetPropertyWifiRequest) {
  return callFunction<GetPropertyWifiRequest, GetPropertyWifiResponse>(CALLABLES.getPropertyWifi, data);
}

export function updatePropertyWifiRemote(data: {
  propertyId: string;
  network: string;
  password: string;
  speed: string;
}) {
  return callFunction<typeof data, { ok: true; updatedAt: string }>(CALLABLES.updatePropertyWifi, data);
}

export function updatePropertyProfileRemote(data: {
  propertyId: string;
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  heroImage?: string;
  breakfast?: { hours: string; location: string; type: string; price: string };
  facilities?: Array<{ name: string; hours: string; floor: string; details?: string; icon: string }>;
  roomTypes?: Array<{
    id: string;
    name: string;
    category: string;
    capacity: number;
    sizeSqm?: number;
    bedConfig: string;
    totalRooms: number;
    startingPrice?: number;
    features: string[];
    roomNumbers?: string[];
  }>;
  roomStatuses?: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">;
  confirmHours?: boolean;
}) {
  return callFunction<typeof data, { ok: true; updatedAt: string }>(CALLABLES.updatePropertyProfile, data);
}

export function rotateRoomTokenRemote(data: { propertyId: string; roomNumber: string }) {
  return callFunction<typeof data, { ok: true; roomNumber: string; roomToken: string; previousToken: string | null }>(
    CALLABLES.rotateRoomToken,
    data,
  );
}

export function askAirPalRemote(data: { propertyId?: string; markerId?: string; question: string }) {
  return callFunction<typeof data, { title: string; body: string }>(CALLABLES.askAirPal, data);
}

export function upsertBusinessListingRemote(data: {
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
  mapsPlaceId?: string;
  website?: string;
  plan?: string;
  abnOrTaxId?: string;
  demo?: boolean;
}) {
  return callFunction<typeof data, { listingId: string; placeId: string }>(CALLABLES.upsertBusinessListing, data);
}

export function upsertBusinessDealRemote(data: {
  listingId: string;
  badge: string;
  detail: string;
  expiry?: string;
  active?: boolean;
}) {
  return callFunction<typeof data, { ok: true; deal: { badge: string; detail: string } | null }>(
    CALLABLES.upsertBusinessDeal,
    data,
  );
}

export function upsertEventRemote(data: {
  eventId?: string;
  name: string;
  flavour: string;
  city?: string;
  venue?: string;
  room?: string;
  address?: string;
  description?: string;
  shortWhy?: string;
  mapsPlaceId?: string;
  geo?: { lat: number; lng: number };
  coverImage?: string;
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  businessName?: string;
  businessHandle?: string;
  collaboratorHandles?: string[];
  startsAt?: string;
  endsAt?: string;
  status?: string;
  categoryChips?: string[];
  ticketPriceCents?: number;
  capacity?: number;
  festivalSlug?: string;
  track?: string;
  registrationUrl?: string;
  registrationNote?: string;
  speakers?: { name: string; role?: string }[];
  demo?: boolean;
}) {
  return callFunction<typeof data, { eventId: string }>(CALLABLES.upsertEvent, data);
}

export function upsertEventStallRemote(data: {
  id?: string;
  eventId: string;
  name: string;
  category: string;
  booth?: string;
  location?: string;
  shortWhy?: string;
  offer?: string;
  handle?: string;
}) {
  return callFunction<typeof data, { stallId: string }>(CALLABLES.upsertEventStall, data);
}

export function saveAttendeeStallRemote(data: { eventId: string; stallId: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.saveAttendeeStall, data);
}

export function checkHandleAvailableRemote(data: { handle: string }) {
  return callFunction<typeof data, { ok: boolean; reason?: string }>(CALLABLES.checkHandleAvailable, data);
}

export function createBusinessProfileRemote(data: {
  handle: string;
  name: string;
  city?: string;
  category: string;
  shortWhy: string;
  placeId?: string;
  listingId?: string;
  kind?: "person" | "business";
}) {
  return callFunction<typeof data, { profileId: string; handle: string }>(CALLABLES.createBusinessProfile, data);
}

export function updateBusinessProfileRemote(data: {
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
}) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.updateBusinessProfile, data);
}

export function setBioOfferRemote(data: { handle: string; badge: string; detail: string; active?: boolean }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.setBioOffer, data);
}

export function recordBioTapRemote(data: { handle: string; kind?: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.recordBioTap, data);
}

export function claimBioOfferRemote(data: { handle: string; dealId: string }) {
  return callFunction<typeof data, { code: string; badge: string; detail: string; expiresAt: string }>(
    CALLABLES.claimBioOffer,
    data,
  );
}

export function transferHandleRemote(data: { from: string; to: string }) {
  return callFunction<typeof data, { handle: string; profileId: string }>(CALLABLES.transferHandle, data);
}

export function listBioDirectoryRemote() {
  return callFunction<
    Record<string, never>,
    { rows: Array<{ handle: string; name: string; ownerUid?: string; taps: number }> }
  >(CALLABLES.listBioDirectory, {});
}

export function recordAnalyticsBatchRemote(data: { events: unknown[] }) {
  return callFunction<typeof data, { accepted: number; rejected: number; duplicates: number; acceptedIds: string[] }>(
    CALLABLES.recordAnalyticsBatch,
    data,
  );
}

export function runAnalyticsAggregationRemote() {
  return callFunction<Record<string, never>, { input: number; output: number }>(CALLABLES.runAnalyticsAggregation, {});
}

export function submitVenueRatingRemote(data: {
  mood: string;
  emoji: string;
  note?: string;
  target: "stall" | "event" | "stay";
  eventId?: string;
  stallId?: string;
  stallName?: string;
  propertyId?: string;
}) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.submitVenueRating, data);
}

export function createPlanRemote(data: CreatePlanRequest) {
  return callFunction<CreatePlanRequest, CreatePlanResponse>(CALLABLES.createPlan, data);
}
export const createPlanRemoteCall = createPlanRemote;

export function rsvpPlanRemote(data: RsvpPlanRequest) {
  return callFunction<RsvpPlanRequest, RsvpPlanResponse>(CALLABLES.rsvpPlan, data);
}
export const rsvpPlanRemoteCall = rsvpPlanRemote;

export function addPlanStopRemote(data: AddPlanStopRequest) {
  return callFunction<AddPlanStopRequest, AddPlanStopResponse>(CALLABLES.addPlanStop, data);
}
export const addPlanStopRemoteCall = addPlanStopRemote;

export function votePlanStopRemote(data: VotePlanStopRequest) {
  return callFunction<VotePlanStopRequest, VotePlanStopResponse>(CALLABLES.votePlanStop, data);
}
export const votePlanStopRemoteCall = votePlanStopRemote;

export function voteDateOptionRemote(data: VoteDateOptionRequest) {
  return callFunction<VoteDateOptionRequest, VoteDateOptionResponse>(CALLABLES.voteDateOption, data);
}

export function postPlanCommentRemote(data: PostPlanCommentRequest) {
  return callFunction<PostPlanCommentRequest, PostPlanCommentResponse>(CALLABLES.postPlanComment, data);
}
export const postPlanCommentRemoteCall = postPlanCommentRemote;

export function completePlanRemoteCall(data: CompletePlanRequest) {
  return callFunction<CompletePlanRequest, CompletePlanResponse>(CALLABLES.completePlan, data);
}
export const completePlanRemote = completePlanRemoteCall;

export function getPlanByInviteCodeRemote(data: GetPlanByInviteCodeRequest) {
  return callFunction<GetPlanByInviteCodeRequest, GetPlanByInviteCodeResponse>(CALLABLES.getPlanByInviteCode, data);
}
export const getPlanByInviteCodeRemoteCall = getPlanByInviteCodeRemote;

export function getExperienceProofRemote() {
  return callFunction<Record<string, never>, ExperienceProofResponse>(CALLABLES.getExperienceProof, {});
}

export function sendPlanBroadcastRemote(data: SendPlanBroadcastRequest) {
  return callFunction<SendPlanBroadcastRequest, SendPlanBroadcastResponse>(CALLABLES.sendPlanBroadcast, data);
}

export function inviteToPlanRemote(data: InviteToPlanRequest) {
  return callFunction<InviteToPlanRequest, InviteToPlanResponse>(CALLABLES.inviteToPlan, data);
}

export function scheduleCatchUpRemote(data: {
  catchupId: string;
  action: "open" | "accept";
  slotId?: string;
}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      conversationId: string;
      status: string;
      proposals: { id: string; date: string; time: string; label: string }[];
    }
  >(CALLABLES.scheduleCatchUp, data);
}

export function createExperienceCheckoutSessionRemote(data: {
  planId: string;
  tierId?: string;
  spots?: number;
  isDeposit?: boolean;
  guestName?: string;
  guestEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      mode?: string;
      bookingId?: string;
      sessionId?: string;
      checkoutUrl?: string;
      totalAmount?: number;
      currency?: string;
      message?: string;
    }
  >(CALLABLES.createExperienceCheckoutSession, data);
}

export function confirmExperienceBookingRemote(data: { planId: string; bookingId: string; paymentIntentId?: string }) {
  return callFunction<typeof data, { ok: boolean; status: string; bookingId: string }>(
    CALLABLES.confirmExperienceBooking,
    data,
  );
}
export const confirmExperienceBookingRemoteCall = confirmExperienceBookingRemote;

export function createBookingCheckoutSessionRemote(data: { bookingId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      mode?: string;
      bookingId?: string;
      sessionId?: string;
      checkoutUrl?: string | null;
    }
  >(CALLABLES.createBookingCheckoutSession, data);
}

export function createStayCheckoutSessionRemote(data: {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      mode?: string;
      bookingId?: string;
      sessionId?: string;
      checkoutUrl?: string | null;
    }
  >(CALLABLES.createStayCheckoutSession, data);
}

export function payBookingBalanceRemote(data: { planBookingId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      mode?: string;
      bookingId?: string;
      planBookingId?: string;
      sessionId?: string;
      checkoutUrl?: string | null;
    }
  >(CALLABLES.payBookingBalance, data);
}

export function createManagedProductRemote(data: {
  name: string;
  description?: string;
  amountCents: number;
  currency?: string;
  taxCode?: string;
  planId?: string;
}) {
  return callFunction<typeof data, { ok: boolean; productId: string; stripeProductId: string; stripePriceId: string }>(
    CALLABLES.createManagedProduct,
    data,
  );
}

export function createManagedCheckoutSessionRemote(data: {
  productId: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  return callFunction<typeof data, { ok: boolean; paymentId: string; sessionId: string; checkoutUrl?: string | null }>(
    CALLABLES.createManagedCheckoutSession,
    data,
  );
}

export function placeDiningOrderRemote(data: {
  propertyId: string;
  roomNumber?: string;
  items: Array<{ menuItemId: string; qty: number }>;
  successUrl?: string;
  cancelUrl?: string;
}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      orderId: string;
      totalCents: number;
      currency: string;
      payAtDesk?: boolean;
      checkoutUrl?: string | null;
      sessionId?: string;
    }
  >(CALLABLES.placeDiningOrder, data);
}

export function updateDiningOrderStatusRemote(data: { propertyId: string; orderId: string; status: string }) {
  return callFunction<typeof data, { ok: boolean; orderId: string; status: string }>(
    CALLABLES.updateDiningOrderStatus,
    data,
  );
}

export function createConnectAccountLinkRemote(data: { returnPath?: string } = {}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      url: string;
      stripeAccountId: string;
      transfersActive: boolean;
    }
  >(CALLABLES.createConnectAccountLink, data);
}

export function refreshConnectAccountRemote() {
  return callFunction<
    Record<string, never>,
    {
      ok: boolean;
      transfersActive: boolean;
      stripeAccountId: string;
    }
  >(CALLABLES.refreshConnectAccount, {});
}

export function createConnectLoginLinkRemote() {
  return callFunction<Record<string, never>, { ok: boolean; url: string }>(CALLABLES.createConnectLoginLink, {});
}

export function teardownDemoBusinessRemote() {
  return callFunction<Record<string, never>, { deleted: Record<string, number> }>(CALLABLES.teardownDemoBusiness, {});
}

export function verifyTicketRemote(data: { ticketId: string }) {
  return callFunction<
    typeof data,
    {
      ticketId: string;
      eventId: string;
      eventName: string;
      title: string;
      date: string;
      time: string;
      spots: number;
      paymentStatus: string;
      displayPaid: boolean;
      status: string;
      valid: boolean;
      reason: string | null;
      admittedAt: string | null;
    }
  >(CALLABLES.verifyTicket, data);
}

export function admitTicketRemote(data: { ticketId: string }) {
  return callFunction<typeof data, { ticketId: string; admittedAt: string; already: boolean }>(
    CALLABLES.admitTicket,
    data,
  );
}

export function checkInGuestRemote(data: { scope: "event" | "plan"; id: string; entryId: string }) {
  return callFunction<
    typeof data,
    { scope: "event" | "plan"; id: string; entryId: string; checkedInAt: string; already: boolean }
  >(CALLABLES.checkInGuest, data);
}

export function closeGuestlistRemote(data: { scope: "event" | "plan"; id: string }) {
  return callFunction<typeof data, { scope: "event" | "plan"; id: string; closed: number }>(
    CALLABLES.closeGuestlist,
    data,
  );
}

export function joinGuestlistSignupRemote(data: {
  name: string;
  city: string;
  email: string;
  interests: string[];
  source?: string;
}) {
  return callFunction<typeof data, { ok: boolean; email: string }>(CALLABLES.joinGuestlistSignup, data);
}

export function listGuestlistSignupsRemote(data: {
  city?: string;
  interest?: string;
  limit?: number;
  startAfter?: string;
}) {
  return callFunction<
    typeof data,
    {
      rows: Array<{
        email: string;
        name: string;
        city: string;
        interests: string[];
        source: string;
        consentAt: string;
        createdAt: string;
        unsubscribedAt: string | null;
      }>;
      hasMore: boolean;
      total: number;
    }
  >(CALLABLES.listGuestlistSignups, data);
}

export function unsubscribeGuestlistRemote(data: { email: string }) {
  return callFunction<typeof data, { ok: boolean }>(CALLABLES.unsubscribeGuestlist, data);
}

export function listDoorTeamRemote(data: { scope: "event" | "plan"; id: string }) {
  return callFunction<
    typeof data,
    {
      scope: "event" | "plan";
      id: string;
      members: Array<{ uid: string; name: string; handle?: string; owner: boolean }>;
    }
  >(CALLABLES.listDoorTeam, data);
}

export function releaseHeldPayoutsRemote() {
  return callFunction<
    Record<string, never>,
    {
      ok: boolean;
      released: number;
      held: number;
      amountCents: number;
    }
  >(CALLABLES.releaseHeldPayouts, {});
}

export function refundPaidBookingRemote(data: { bookingId: string }) {
  return callFunction<typeof data, { ok: boolean; status: string; bookingId: string }>(
    CALLABLES.refundPaidBooking,
    data,
  );
}

export function createSubscriptionCheckoutRemote() {
  return callFunction<Record<string, never>, { ok: boolean; sessionId?: string; checkoutUrl?: string | null }>(
    CALLABLES.createSubscriptionCheckout,
    {},
  );
}

export function createSubscriptionPortalRemote() {
  return callFunction<Record<string, never>, { ok: boolean; portalUrl?: string | null }>(
    CALLABLES.createSubscriptionPortal,
    {},
  );
}

export function completePaidBookingRemote(data: { bookingId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      status: string;
      payoutStatus: string;
      transferId: string | null;
      payoutReason?: string | null;
    }
  >(CALLABLES.completePaidBooking, data);
}

export function createStaffTicketRemote(data: {
  propertyId: string;
  details: string;
  roomNumber?: string;
  category?: string;
  urgency?: string;
}) {
  return callFunction<typeof data, { ok: true; ticketId: string }>(CALLABLES.createStaffTicket, data);
}

export function resolveStaffTicketRemote(data: { propertyId: string; ticketId: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.resolveStaffTicket, data);
}

export function submitPartnerClaimRemote(data: SubmitPartnerClaimRequest) {
  return callFunction<SubmitPartnerClaimRequest, { claimId: string; status: string }>(
    CALLABLES.submitPartnerClaim,
    data,
  );
}

export function claimFreeVenuePresenceRemote(data: ClaimFreeVenuePresenceRequest) {
  return callFunction<ClaimFreeVenuePresenceRequest, ClaimFreeVenuePresenceResponse>(
    CALLABLES.claimFreeVenuePresence,
    data,
  );
}

export function getPulseByTokenRemote(data: { publicToken: string }) {
  return callFunction<typeof data, import("@shared/pulse").PulsePublicDto>(CALLABLES.getPulseByToken, data);
}

export function getBioPulseRemote(data: { propertyId: string }) {
  return callFunction<typeof data, import("@shared/pulse").BioPulseResult>(CALLABLES.getBioPulse, data);
}

export function submitPulseResponseRemote(data: {
  publicToken: string;
  answers: import("@shared/pulse").PulseAnswer[];
  contactRequested?: boolean;
  contactName?: string;
  contactMethod?: string;
  roomNumber?: string;
  clientKey?: string;
}) {
  return callFunction<
    typeof data,
    { responseId: string; issueId: string | null; createIssue: boolean; duplicate?: boolean }
  >(CALLABLES.submitPulseResponse, data);
}

export function createPulseRemote(data: {
  propertyId: string;
  template?: string;
  name?: string;
  title?: string;
  imageUrl?: string;
}) {
  return callFunction<typeof data, { pulseId: string; status: "draft" }>(CALLABLES.createPulse, data);
}

export function publishPulseRemote(data: {
  propertyId: string;
  pulseId: string;
  placement?: "room" | "lobby" | "other";
  label?: string;
}) {
  return callFunction<typeof data, { deploymentId: string; publicToken: string; path: string }>(
    CALLABLES.publishPulse,
    data,
  );
}

export function acknowledgePulseIssueRemote(data: { propertyId: string; issueId: string; assigneeUid?: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.acknowledgePulseIssue, data);
}

export function resolvePulseIssueRemote(data: { propertyId: string; issueId: string; resolutionNote?: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.resolvePulseIssue, data);
}

export function setPulseStatusRemote(data: {
  propertyId: string;
  pulseId: string;
  status: "live" | "paused" | "archived";
}) {
  return callFunction<typeof data, { status: "live" | "paused" | "archived" }>(CALLABLES.setPulseStatus, data);
}

export function recordPulseFollowupRemote(data: { propertyId: string; issueId: string; score: number; note?: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.recordPulseFollowup, data);
}
