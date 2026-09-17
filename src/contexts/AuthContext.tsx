import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { UserProfile, UserRole } from "@shared/airpal-data";
import { buildHostProperty, parseHostPropertyKind, type HostPropertyKind } from "@shared/host-property";
import {
  attachEmailToAccount,
  removeEmailFromAccount,
  sendAccountVerificationEmail,
  sendPasswordResetToEmail,
  setAuthDisplayName,
} from "@/lib/auth-mail";
import { normalizeEmail } from "@shared/validate";
import {
  confirmAccountPhoneCode as confirmLinkedSms,
  confirmPhoneCode as confirmSms,
  removeAccountPhone,
  resetPhoneLogin,
  sendAccountPhoneCode as sendLinkedSms,
  sendPhoneCode as sendSms,
} from "@/lib/phone-auth";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { clearPendingIntent, savePendingIntent, type PendingIntent } from "@/lib/pending-intent";
import { completeRegistration, liveBackendEnabled } from "@/lib/functions";
import { saveCachedProperty } from "@/lib/properties";
import { track } from "@/lib/analytics";

type RegisterOpts = {
  kind?: HostPropertyKind;
  propertyName?: string;
  city?: string;
  password?: string;
};

type AuthValue = {
  user: UserProfile | null;
  authReady: boolean;
  role: UserRole;
  isHost: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, opts?: RegisterOpts) => Promise<{ propertyId?: string }>;
  sendPhoneCode: (phone: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  completePhoneProfile: (input: { name: string; email: string }) => Promise<void>;
  updateEmailAddress: (email: string) => Promise<void>;
  removeEmailAddress: () => Promise<void>;
  sendAccountPhoneCode: (phone: string) => Promise<void>;
  confirmAccountPhoneCode: (code: string) => Promise<void>;
  removePhoneNumber: () => Promise<void>;
  refreshUser: () => Promise<void>;
  createHostProperty: (input: {
    propertyName: string;
    kind?: HostPropertyKind;
    city?: string;
  }) => Promise<{ propertyId: string }>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  /** Open sign-in nudge (null when hidden). Guests see this before gated actions. */
  signInPrompt: { reason: string } | null;
  /**
   * Ask a guest to sign in before a gated action. Stores the intent so it can
   * resume after login, then opens the sign-in prompt. Returns true when the
   * caller already has a signed-in user and may proceed immediately.
   */
  requireUser: (reason: string, intent?: PendingIntent) => boolean;
  promptSignIn: (reason: string, intent?: PendingIntent) => void;
  dismissSignInPrompt: () => void;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [signInPrompt, setSignInPrompt] = useState<{ reason: string } | null>(null);

  useEffect(() => {
    if (user) setSignInPrompt(null);
  }, [user]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthReady(true);
      return;
    }
    let gen = 0;
    return onAuthStateChanged(auth, async (fb) => {
      const mine = ++gen;
      if (!fb || fb.isAnonymous) {
        if (mine === gen) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }
      const db = getFirebaseDb();
      let profile: UserProfile = {
        uid: fb.uid,
        email: fb.email || "",
        displayName: fb.displayName || fb.email || fb.phoneNumber || "You",
        role: "guest",
        emailVerified: fb.emailVerified,
        phone: fb.phoneNumber || undefined,
        phoneVerified: Boolean(fb.phoneNumber),
        photoURL: fb.photoURL || undefined,
      };
      if (db) {
        try {
          const snap = await getDoc(doc(db, "users", fb.uid));
          if (snap.exists()) {
            const row = snap.data() as UserProfile;
            profile = {
              ...profile,
              ...row,
              email: fb.email || row.email || "",
              phone: fb.phoneNumber || row.phone,
              emailVerified: fb.emailVerified,
              phoneVerified: Boolean(fb.phoneNumber),
              photoURL: fb.photoURL || profile.photoURL,
            };
          }
        } catch {
          /* ignore */
        }
      }
      try {
        const claims = (await fb.getIdTokenResult()).claims as {
          role?: UserRole;
          platform_admin?: boolean;
          propertyId?: string;
        };
        if (claims.platform_admin) profile.role = "super_admin";
        else if (claims.role) profile.role = claims.role;
        if (claims.propertyId) {
          const ids = profile.propertyIds || [];
          if (!ids.includes(claims.propertyId)) {
            profile.propertyIds = [claims.propertyId, ...ids];
          }
        }
      } catch {
        /* ignore */
      }

      // If user is a host but propertyIds not set on user doc, query owned properties
      if (db && (!profile.propertyIds || !profile.propertyIds.length)) {
        try {
          const propQuery = query(collection(db, "properties"), where("ownerId", "==", fb.uid));
          const propSnaps = await getDocs(propQuery);
          if (!propSnaps.empty) {
            profile.propertyIds = propSnaps.docs.map((d) => d.id);
            if (profile.role === "guest") profile.role = "host_admin";
          }
        } catch {
          /* ignore */
        }
      }

      profile.email = fb.email || "";
      profile.emailVerified = fb.emailVerified;
      profile.phone = fb.phoneNumber || undefined;
      profile.phoneVerified = Boolean(fb.phoneNumber);
      profile.photoURL = fb.photoURL || profile.photoURL;
      if (mine !== gen) return;
      setUser(profile);
      setAuthReady(true);
    });
  }, []);

  const value = useMemo<AuthValue>(() => {
    async function pullUser() {
      const auth = getFirebaseAuth();
      const fb = auth?.currentUser;
      if (!fb || fb.isAnonymous) return;
      await fb.reload();
      const next = auth.currentUser || fb;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              email: next.email || "",
              displayName: next.displayName || prev.displayName,
              emailVerified: next.emailVerified,
              phone: next.phoneNumber || undefined,
              phoneVerified: Boolean(next.phoneNumber),
              photoURL: next.photoURL || prev.photoURL,
            }
          : prev,
      );
    }
    return {
      user,
      authReady,
      role: user?.role || "guest",
      isHost:
        user?.role === "host_admin" ||
        user?.role === "super_admin" ||
        user?.role === "staff" ||
        Boolean(user?.propertyIds?.length),
      isAdmin: user?.role === "super_admin",
      async login(email, password) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Sign-in needs Firebase.");
        await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      },
      async sendPhoneCode(phone) {
        await sendSms(phone);
      },
      async confirmPhoneCode(code) {
        await confirmSms(code);
      },
      refreshUser: pullUser,
      async updateEmailAddress(email) {
        await attachEmailToAccount(normalizeEmail(email));
        await pullUser();
      },
      async removeEmailAddress() {
        await removeEmailFromAccount();
        await pullUser();
      },
      async sendAccountPhoneCode(phone) {
        await sendLinkedSms(phone);
      },
      async confirmAccountPhoneCode(code) {
        await confirmLinkedSms(code);
        await pullUser();
      },
      async removePhoneNumber() {
        await removeAccountPhone();
        await pullUser();
      },
      async completePhoneProfile(input) {
        const auth = getFirebaseAuth();
        const fb = auth?.currentUser;
        if (!fb || fb.isAnonymous) throw new Error("Confirm your mobile number first.");
        await setAuthDisplayName(fb, input.name);
        await attachEmailToAccount(input.email);
        await fb.reload();
        setUser((prev) =>
          prev
            ? {
                ...prev,
                displayName: input.name.trim(),
                email: input.email.trim().toLowerCase(),
                emailVerified: auth.currentUser?.emailVerified ?? false,
                phone: auth.currentUser?.phoneNumber || prev.phone,
                phoneVerified: Boolean(auth.currentUser?.phoneNumber),
              }
            : prev,
        );
      },
      async register(email, name, opts) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Sign-up needs Firebase.");
        const cleanEmail = normalizeEmail(email);
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, opts?.password || "");
        await setAuthDisplayName(cred.user, name);
        try {
          await sendAccountVerificationEmail(cred.user);
        } catch {
          /* account exists; they can resend from /me */
        }
        if (opts?.propertyName) {
          let propertyId: string | undefined;
          if (liveBackendEnabled()) {
            const res = await completeRegistration({
              displayName: name,
              role: "host_admin",
              propertyName: opts.propertyName,
              kind: opts.kind || "hotel",
              city: opts.city,
            });
            propertyId = res.propertyId;
            if (auth.currentUser) {
              try {
                await auth.currentUser.getIdToken(true);
              } catch {
                /* ignore */
              }
            }
          } else {
            const prop = buildHostProperty({
              propertyName: opts.propertyName,
              ownerEmail: cleanEmail,
              ownerId: auth.currentUser?.uid || "host-local",
              kind: parseHostPropertyKind(opts.kind),
              city: opts.city,
            });
            saveCachedProperty(prop);
            propertyId = prop.id;
          }
          if (propertyId) {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    role: "host_admin",
                    propertyIds: [propertyId!, ...(prev.propertyIds || []).filter((id) => id !== propertyId)],
                  }
                : {
                    uid: auth.currentUser?.uid || "host-local",
                    email: cleanEmail,
                    displayName: name,
                    role: "host_admin",
                    propertyIds: [propertyId!],
                    emailVerified: auth.currentUser?.emailVerified ?? false,
                  },
            );
            void track("host_activation", {
              tenantId: auth.currentUser?.uid || "local",
              activationStep: "property_created",
              contextId: propertyId,
              actorRole: "host_admin",
            });
            return { propertyId };
          }
        }
        return {};
      },
      async createHostProperty(input) {
        let propertyId = "";
        if (liveBackendEnabled()) {
          const res = await completeRegistration({
            displayName: user?.displayName || "Host",
            role: "host_admin",
            propertyName: input.propertyName,
            kind: input.kind || "hotel",
            city: input.city,
          });
          propertyId = res.propertyId;
          const auth = getFirebaseAuth();
          if (auth?.currentUser) {
            try {
              await auth.currentUser.getIdToken(true);
            } catch {
              /* ignore */
            }
          }
        } else {
          const prop = buildHostProperty({
            propertyName: input.propertyName,
            ownerEmail: user?.email || "",
            ownerId: user?.uid || "host-local",
            kind: parseHostPropertyKind(input.kind),
            city: input.city,
          });
          saveCachedProperty(prop);
          propertyId = prop.id;
        }
        if (propertyId) {
          void track("host_activation", {
            tenantId: user?.uid || "local",
            activationStep: "property_created",
            contextId: propertyId,
            actorRole: "host_admin",
          });
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  role: "host_admin",
                  propertyIds: [propertyId, ...(prev.propertyIds || []).filter((id) => id !== propertyId)],
                }
              : null,
          );
        }
        return { propertyId };
      },
      async logout() {
        resetPhoneLogin();
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
        setUser(null);
      },
      async sendVerificationEmail() {
        await sendAccountVerificationEmail();
      },
      async requestPasswordReset(email) {
        await sendPasswordResetToEmail(email);
      },
      signInPrompt,
      promptSignIn(reason, intent) {
        if (intent) savePendingIntent(intent);
        else clearPendingIntent();
        setSignInPrompt({ reason });
      },
      requireUser(reason, intent) {
        if (user) return true;
        if (intent) savePendingIntent(intent);
        else clearPendingIntent();
        setSignInPrompt({ reason });
        return false;
      },
      dismissSignInPrompt() {
        setSignInPrompt(null);
      },
    };
  }, [user, authReady, signInPrompt]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth");
  return ctx;
}
