import { describe, expect, it } from "vitest";
import * as api from "./index";

// Callable names are the deployed API surface: renaming or dropping one breaks
// clients and deploys, so the barrel re-export list is pinned here.
const CALLABLES = [
  "completeAccountSignup",
  "loginWithPhonePassword",
  "completeRegistration",
  "ensurePlatformAdmin",
  "setPropertyMember",
  "backfillOwnerClaims",
  "claimDeal",
  "redeemVoucher",
  "providePartnerDeal",
  "submitPartnerClaim",
  "claimFreeVenuePresence",
  "reviewPartnerClaim",
  "getPropertyWifi",
  "updatePropertyWifi",
  "updatePropertyProfile",
  "rotateRoomToken",
  "askAirPal",
  "upsertBusinessListing",
  "upsertBusinessDeal",
  "upsertEvent",
  "upsertEventStall",
  "saveAttendeeStall",
  "submitVenueRating",
  "checkHandleAvailable",
  "createBusinessProfile",
  "updateBusinessProfile",
  "setBioOffer",
  "recordBioTap",
  "claimBioOffer",
  "transferHandle",
  "listBioDirectory",
  "recordAnalyticsBatch",
  "runAnalyticsAggregation",
  "aggregateAnalyticsHourly",
  "createStaffTicket",
  "resolveStaffTicket",
  "onStaffTicketCreated",
  "createManagedProduct",
  "createManagedCheckoutSession",
  "placeDiningOrder",
  "updateDiningOrderStatus",
  "createPlanRemote",
  "rsvpPlanRemote",
  "addPlanStopRemote",
  "votePlanStopRemote",
  "postPlanCommentRemote",
  "getPlanByInviteCode",
  "createExperienceCheckoutSession",
  "confirmExperienceBookingRemote",
  "createBookingCheckoutSession",
  "createConnectAccountLink",
  "refreshConnectAccount",
  "createConnectLoginLink",
  "releaseHeldPayouts",
  "completePaidBooking",
  "stripeWebhook",
  "createPlan",
  "rsvpPlan",
  "addPlanStop",
  "votePlanStop",
  "postPlanComment",
  "confirmExperienceBooking",
];

describe("functions barrel", () => {
  it("re-exports every callable under its deployed name", () => {
    for (const name of CALLABLES) {
      expect((api as Record<string, unknown>)[name], name).toBeDefined();
    }
  });
});
