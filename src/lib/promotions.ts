import { httpsCallable } from "firebase/functions";
import type {
  CreatePromotionRequest,
  DrawWinnersRequest,
  EnterPromotionRequest,
  PromotionStatus,
  RedeemPointsRequest,
  ReviewPromotionRequest,
  SetWeeklyCampaignRequest,
  SetWinnerStatusRequest,
  WinnerStatus,
} from "@shared/promotions";
import { getFirebaseFunctions } from "./firebase";

async function callPromotion<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function createPromotionRemote(data: CreatePromotionRequest) {
  return callPromotion<CreatePromotionRequest, { ok: boolean; promotionId: string }>(
    "createPromotion",
    data,
  );
}

export function updatePromotionRemote(data: { promotionId: string; patch: Record<string, unknown> }) {
  return callPromotion<{ promotionId: string; patch: Record<string, unknown> }, { ok: boolean }>(
    "updatePromotion",
    data,
  );
}

export function submitPromotionRemote(data: { promotionId: string }) {
  return callPromotion<{ promotionId: string }, { ok: boolean; status: PromotionStatus }>(
    "submitPromotion",
    data,
  );
}

export function reviewPromotionRemote(data: ReviewPromotionRequest) {
  return callPromotion<ReviewPromotionRequest, { ok: boolean; status?: PromotionStatus; featured?: boolean }>(
    "reviewPromotion",
    data,
  );
}

export function enterPromotionRemote(data: EnterPromotionRequest) {
  return callPromotion<EnterPromotionRequest, { ok: boolean; duplicate: boolean; reference: string }>(
    "enterPromotion",
    data,
  );
}

export function closeAndDrawRemote(data: DrawWinnersRequest) {
  return callPromotion<DrawWinnersRequest, { ok: boolean; winners: number; entries: number }>(
    "closeAndDraw",
    data,
  );
}

export function setWinnerStatusRemote(data: SetWinnerStatusRequest) {
  return callPromotion<SetWinnerStatusRequest, { ok: boolean; status: WinnerStatus }>(
    "setWinnerStatus",
    data,
  );
}

export function recordPromotionViewRemote(promotionId: string) {
  return callPromotion<{ promotionId: string }, { ok: boolean }>("recordPromotionView", { promotionId });
}

export function recordPromotionClickRemote(promotionId: string) {
  return callPromotion<{ promotionId: string }, { ok: boolean }>("recordPromotionClick", { promotionId });
}

export function setWeeklyCampaignRemote(data: SetWeeklyCampaignRequest) {
  return callPromotion<SetWeeklyCampaignRequest, { ok: boolean; weekId: string }>(
    "setWeeklyCampaign",
    data,
  );
}

export function redeemPointsRemote(data: RedeemPointsRequest) {
  return callPromotion<RedeemPointsRequest, { ok: boolean; code: string }>("redeemPoints", data);
}

export function seedPromotionDemoRemote() {
  return callPromotion<Record<string, never>, { ok: boolean; created: number }>(
    "seedPromotionDemo",
    {},
  );
}

/**
 * Category fallback art from the bundled Kerala photo set.
 * Used when a campaign has no hero image of its own.
 */
export function promoArtFor(category: string, heroImage?: string): string {
  if (heroImage) return heroImage;
  switch (category) {
    case "Stays":
      return "/media/room.jpg";
    case "Experiences":
      return "/media/walk.jpg";
    case "Travel":
      return "/media/harbour.jpg";
    case "Local":
      return "/media/laneway.jpg";
    case "Events":
      return "/media/campus.jpg";
    case "AirPal":
      return "/brand/og-share-preview.jpg";
    default:
      return "";
  }
}

export function friendlyPromotionError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || "";
  const message = err instanceof Error ? err.message : "";
  if (code === "functions/failed-precondition" || code === "failed-precondition") {
    return message || "This campaign is not open right now.";
  }
  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "You do not have permission for that action.";
  }
  if (code === "functions/unauthenticated" || code === "unauthenticated") {
    return "Sign in to continue.";
  }
  return message || "Something went wrong. Please try again.";
}
