import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  signInWithPhoneNumber,
  unlink,
  updatePhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { phoneReady, toE164 } from "@shared/phone-auth";
import { getFirebaseAuth } from "./firebase";

export const PHONE_RECAPTCHA_ID = "airpal-phone-recaptcha";

let verifier: RecaptchaVerifier | null = null;
let confirmation: ConfirmationResult | null = null;
let accountVerificationId: string | null = null;
let sending = false;

function recaptchaHost(): HTMLElement {
  let el = document.getElementById(PHONE_RECAPTCHA_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PHONE_RECAPTCHA_ID;
    el.dataset.airpalRecaptcha = "owned";
    document.body.appendChild(el);
  }
  return el;
}

function dropRecaptchaHost() {
  const el = document.getElementById(PHONE_RECAPTCHA_ID);
  if (!el) return;
  if (el.dataset.airpalRecaptcha === "owned") {
    el.parentNode?.removeChild(el);
  } else {
    el.innerHTML = "";
  }
}

export function resetPhoneLogin() {
  confirmation = null;
  accountVerificationId = null;
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      /* widget already gone */
    }
    verifier = null;
  }
  dropRecaptchaHost();
}

function verifierOnce(): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Sign-in needs Firebase.");
  if (typeof document === "undefined") throw new Error("Phone verification is not ready. Refresh and try again.");
  recaptchaHost();
  if (verifier) return verifier;
  verifier = new RecaptchaVerifier(auth, PHONE_RECAPTCHA_ID, {
    size: "normal",
    callback: () => undefined,
    "expired-callback": () => {
      confirmation = null;
      accountVerificationId = null;
    },
  });
  return verifier;
}

function alreadyRendered(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err || "");
  return /already been rendered/i.test(message);
}

async function withVerifier<T>(run: (appVerifier: RecaptchaVerifier) => Promise<T>): Promise<T> {
  try {
    return await run(verifierOnce());
  } catch (err) {
    if (!alreadyRendered(err)) {
      resetPhoneLogin();
      throw err;
    }
    resetPhoneLogin();
    return run(verifierOnce());
  }
}

export async function sendPhoneCode(phone: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Sign-in needs Firebase.");
  if (sending) throw new Error("Already sending a code. Wait a moment.");
  if (!phoneReady(phone)) throw new Error("Enter a valid mobile number with country code.");
  sending = true;
  const e164 = toE164(phone);
  try {
    confirmation = await withVerifier((appVerifier) => signInWithPhoneNumber(auth, e164, appVerifier));
  } finally {
    sending = false;
  }
}

export async function confirmPhoneCode(code: string): Promise<string> {
  if (!confirmation) throw new Error("Request a new code first.");
  const auth = getFirebaseAuth();
  const anon = auth?.currentUser && auth.currentUser.isAnonymous ? auth.currentUser : null;
  const clean = code.replace(/\D/g, "");
  // Upgrading keeps the SAME uid, so guest-made content stays attached.
  const cred = anon
    ? await linkWithCredential(anon, PhoneAuthProvider.credential(confirmation.verificationId, clean))
    : await confirmation.confirm(clean);
  confirmation = null;
  return cred.user.uid;
}

export function phoneCodePending(): boolean {
  return Boolean(confirmation);
}

/** Add or change the signed-in user's mobile number (does not switch accounts). */
export async function sendAccountPhoneCode(phone: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user || user.isAnonymous) throw new Error("Sign in first.");
  if (sending) throw new Error("Already sending a code. Wait a moment.");
  sending = true;
  try {
    accountVerificationId = await withVerifier((appVerifier) =>
      new PhoneAuthProvider(auth).verifyPhoneNumber(toE164(phone), appVerifier),
    );
  } finally {
    sending = false;
  }
}

export async function confirmAccountPhoneCode(code: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user || !accountVerificationId) throw new Error("Request a new code first.");
  const cred = PhoneAuthProvider.credential(accountVerificationId, code.replace(/\D/g, ""));
  if (user.phoneNumber) await updatePhoneNumber(user, cred);
  else await linkWithCredential(user, cred);
  accountVerificationId = null;
  await user.reload();
}

export async function removeAccountPhone(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user?.phoneNumber) return;
  const hasOther = user.providerData.some((p) => p.providerId !== PhoneAuthProvider.PROVIDER_ID) || Boolean(user.email);
  if (!hasOther) throw new Error("Add an email first so you can still sign in.");
  await unlink(user, PhoneAuthProvider.PROVIDER_ID);
  await user.reload();
}
