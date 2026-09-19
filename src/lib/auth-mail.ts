import {
  EmailAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  linkWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  unlink,
  updateEmail,
  updateProfile,
  verifyPasswordResetCode,
  reload,
  type ActionCodeSettings,
  type User,
} from "firebase/auth";
import { authActionContinueUrl } from "@shared/auth-email";
import { getFirebaseAuth } from "@/lib/firebase";
import { LEGAL } from "@/lib/legal";

export function emailActionSettings(): ActionCodeSettings {
  const origin = typeof window !== "undefined" ? window.location.origin : LEGAL.site;
  return {
    url: authActionContinueUrl(origin),
    handleCodeInApp: false,
  };
}

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("This needs Firebase.");
  return auth;
}

export async function sendAccountVerificationEmail(user?: User | null) {
  const auth = requireAuth();
  const target = user || auth.currentUser;
  if (!target || target.isAnonymous) throw new Error("Sign in with email first.");
  if (target.emailVerified) return;
  await sendEmailVerification(target, emailActionSettings());
}

export async function sendPasswordResetToEmail(email: string) {
  const auth = requireAuth();
  const trimmed = email.trim().toLowerCase();
  try {
    await sendPasswordResetEmail(auth, trimmed, emailActionSettings());
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
    if (code === "auth/user-not-found" || code === "auth/invalid-email") return;
    throw err;
  }
}

export async function applyEmailVerificationCode(oobCode: string) {
  const auth = requireAuth();
  await applyActionCode(auth, oobCode);
  if (auth.currentUser) await reload(auth.currentUser);
}

export async function emailForPasswordResetCode(oobCode: string) {
  const auth = requireAuth();
  return verifyPasswordResetCode(auth, oobCode);
}

export async function submitPasswordReset(oobCode: string, password: string) {
  const auth = requireAuth();
  await confirmPasswordReset(auth, oobCode, password);
}

export async function setAuthDisplayName(user: User, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await updateProfile(user, { displayName: trimmed });
}

/** Link email + password onto a phone-verified account, then send the verify email. */
export async function linkEmailPasswordToAccount(email: string, password: string) {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Confirm your mobile number first.");
  const next = email.trim().toLowerCase();
  if (!next || password.length < 8) throw new Error("Need a real email and password.");
  const cred = EmailAuthProvider.credential(next, password);
  if (!user.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID)) {
    await linkWithCredential(user, cred);
  } else if (user.email && user.email.toLowerCase() !== next) {
    await updateEmail(user, next);
  }
  await user.reload();
  if (!auth.currentUser?.emailVerified) {
    await sendEmailVerification(auth.currentUser || user, emailActionSettings());
  }
}

/** Attach email to a phone account after SMS verification (recent login). */
export async function attachEmailToAccount(email: string) {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Confirm your mobile number first.");
  const next = email.trim().toLowerCase();
  if (!next) throw new Error("Need a real email");
  if (user.email && user.email.toLowerCase() === next) {
    if (!user.emailVerified) await sendEmailVerification(user, emailActionSettings());
    return;
  }
  await updateEmail(user, next);
  try {
    await sendEmailVerification(user, emailActionSettings());
  } catch {
    /* address is on the account; they can resend from Settings */
  }
}

export async function removeEmailFromAccount() {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Sign in first.");
  if (!user.phoneNumber) throw new Error("Add a mobile number first so you can still sign in.");
  const password = user.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID);
  if (!password) {
    throw new Error("This email is tied to the account. Change it instead of removing it.");
  }
  await unlink(user, EmailAuthProvider.PROVIDER_ID);
  await user.reload();
}
