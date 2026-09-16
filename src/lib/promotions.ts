import { httpsCallable } from "firebase/functions";
import type {
  CreatePromotionRequest,
  EnterPromotionRequest,
  PromotionStatus,
  ReviewPromotionRequest,
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

export function seedPromotionDemoRemote() {
  return callPromotion<Record<string, never>, { ok: boolean; created: number }>(
    "seedPromotionDemo",
    {},
  );
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
