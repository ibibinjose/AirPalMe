import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";
import { parsePlatformAdminEmails, type AccessClaims, type PropertyMemberRole } from "../../shared/airpal-security";
import type { UserRole } from "../../shared/airpal-data";
import { isAnonymousAuth } from "./abuse";

setGlobalOptions({ region: "us-central1", maxInstances: 20 });

/** Consume App Check tokens. Set ENFORCE_APPCHECK=true after a reCAPTCHA key is live. */
export const CALLABLE = {
  consumeAppCheckToken: true,
  enforceAppCheck: process.env.ENFORCE_APPCHECK === "true",
} as const;

if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();

export function requireAuth(uid: string | undefined): string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  return uid;
}

export function requireAccount(
  request: { auth?: { uid?: string; token?: { firebase?: { sign_in_provider?: string } } } },
  message = "Create an email account.",
): string {
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) throw new HttpsError("failed-precondition", message);
  return uid;
}

export function platformAdminEmails(): string[] {
  return parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS);
}

export function isPlatformAdmin(claims: AccessClaims | undefined): boolean {
  return claims?.platform_admin === true || claims?.role === "super_admin";
}

export function highestRole(properties: Record<string, PropertyMemberRole>, platformAdmin: boolean): UserRole {
  if (platformAdmin) return "super_admin";
  const values = Object.values(properties);
  if (values.includes("host_admin")) return "host_admin";
  if (values.includes("staff")) return "staff";
  return "guest";
}

export async function writeAccessClaims(
  uid: string,
  patch: {
    platformAdmin?: boolean;
    propertyId?: string;
    memberRole?: PropertyMemberRole;
    role?: UserRole;
  },
) {
  const user = await auth.getUser(uid);
  const current = (user.customClaims || {}) as AccessClaims;
  const properties = { ...(current.properties || {}) };
  if (patch.propertyId && patch.memberRole) {
    properties[patch.propertyId] = patch.memberRole;
  }
  const platformAdmin = Boolean(patch.platformAdmin || current.platform_admin);
  const next: AccessClaims = {
    platform_admin: platformAdmin || undefined,
    role: platformAdmin ? "super_admin" : patch.role || highestRole(properties, false),
    properties,
  };
  await auth.setCustomUserClaims(uid, next);
  return next;
}
