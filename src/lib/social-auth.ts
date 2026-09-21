import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export type SocialProvider = "google" | "apple";

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Sign-in needs Firebase.");
  return auth;
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function appleProvider() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}

async function signInNative(provider: SocialProvider): Promise<UserCredential> {
  const auth = requireAuth();
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  if (provider === "google") {
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("Google did not return an ID token.");
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }
  const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  const nonce = result.credential?.nonce;
  if (!idToken) throw new Error("Apple did not return an ID token.");
  return signInWithCredential(auth, appleProvider().credential({ idToken, rawNonce: nonce }));
}

async function signInWeb(provider: SocialProvider): Promise<UserCredential> {
  const auth = requireAuth();
  return signInWithPopup(auth, provider === "google" ? googleProvider() : appleProvider());
}

export async function signInWithSocial(provider: SocialProvider): Promise<UserCredential> {
  if (Capacitor.isNativePlatform()) return signInNative(provider);
  return signInWeb(provider);
}
