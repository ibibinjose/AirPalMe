import { httpsCallable } from "firebase/functions";
import type {
  AdminSetBirthdayOfferStatusRequest,
  BirthdayOffer,
  BirthdayOfferStatus,
  CreateBirthdayOfferRequest,
  ListBirthdayOffersRequest,
  UpdateBirthdayOfferRequest,
} from "@shared/birthday-freebies";
import { getFirebaseFunctions } from "./firebase";

async function callBirthday<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function createBirthdayOfferRemote(data: CreateBirthdayOfferRequest) {
  return callBirthday<CreateBirthdayOfferRequest, { ok: boolean; offerId: string }>("createBirthdayOffer", data);
}

export function updateBirthdayOfferRemote(data: UpdateBirthdayOfferRequest) {
  return callBirthday<UpdateBirthdayOfferRequest, { ok: boolean }>("updateBirthdayOffer", data);
}

export function listBirthdayOffersRemote(data: ListBirthdayOffersRequest = {}) {
  return callBirthday<ListBirthdayOffersRequest, { ok: boolean; offers: BirthdayOffer[] }>("listBirthdayOffers", data);
}

export function adminSetBirthdayOfferStatusRemote(data: AdminSetBirthdayOfferStatusRequest) {
  return callBirthday<AdminSetBirthdayOfferStatusRequest, { ok: boolean; status: BirthdayOfferStatus }>(
    "adminSetBirthdayOfferStatus",
    data,
  );
}

export function seedBirthdayFreebiesRemote() {
  return callBirthday<Record<string, never>, { ok: boolean; created: number; updated: number; total: number }>(
    "seedBirthdayFreebies",
    {},
  );
}

export function friendlyBirthdayError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || "";
  const message = err instanceof Error ? err.message : "";
  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "You do not have permission for that action.";
  }
  if (code === "functions/unauthenticated" || code === "unauthenticated") {
    return "Sign in to continue.";
  }
  if (code === "functions/invalid-argument" || code === "invalid-argument") {
    return message || "Check the offer details and try again.";
  }
  return message || "Something went wrong. Please try again.";
}
