import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import {
  publicMateFromApplication,
  type CompanionApplication,
  type CompanionStatus,
} from "@shared/companion";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

const APPS = "companion_applications";
const PUBLIC = "mates_public";

function db(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  return getFirebaseDb();
}

/** Fields allowed on applicant create (must match firestore.rules hasOnly). */
export function applicationCreatePayload(app: CompanionApplication): Record<string, unknown> {
  return {
    applicationId: app.applicationId,
    userId: app.userId,
    roles: app.roles,
    fullName: app.fullName,
    photo: app.photo || "",
    email: app.email,
    phone: app.phone,
    city: app.city,
    suburb: app.suburb,
    ageRange: app.ageRange,
    introduction: app.introduction,
    languages: app.languages,
    interests: app.interests,
    hobbies: app.hobbies,
    enjoysWithOthers: app.enjoysWithOthers,
    activities: app.activities,
    availability: app.availability,
    serviceArea: app.serviceArea,
    pricingPreference: app.pricingPreference,
    preferredRate: app.preferredRate || "",
    motivation: app.motivation,
    policeClearanceNumber: app.policeClearanceNumber,
    policeClearanceDoc: app.policeClearanceDoc || "",
    applicantAgreementAccepted: app.applicantAgreementAccepted,
    communityGuidelinesAccepted: app.communityGuidelinesAccepted,
    adultConfirmed: app.adultConfirmed,
    status: app.status,
    submittedAt: app.submittedAt || "",
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export async function persistApplicationRemote(app: CompanionApplication): Promise<void> {
  const firestore = db();
  if (!firestore) return;
  await setDoc(doc(firestore, APPS, app.applicationId), applicationCreatePayload(app), { merge: true });
}

export async function persistAdminApplicationRemote(app: CompanionApplication): Promise<void> {
  const firestore = db();
  if (!firestore) return;
  await setDoc(
    doc(firestore, APPS, app.applicationId),
    {
      ...applicationCreatePayload(app),
      adminNotes: app.adminNotes || "",
      reviewedBy: app.reviewedBy || "",
      reviewedAt: app.reviewedAt || "",
      status: app.status,
      updatedAt: app.updatedAt,
    },
    { merge: true },
  );
  if (app.status === "approved") {
    const card = publicMateFromApplication(app);
    await setDoc(doc(firestore, PUBLIC, app.userId), { ...card, updatedAt: app.updatedAt });
  } else if (app.status === "declined" || app.status === "suspended") {
    await deleteDoc(doc(firestore, PUBLIC, app.userId)).catch(() => undefined);
  }
}

export async function loadMyApplicationsRemote(uid: string): Promise<CompanionApplication[]> {
  const firestore = db();
  if (!firestore || !uid) return [];
  const snap = await getDocs(query(collection(firestore, APPS), where("userId", "==", uid)));
  return snap.docs.map((d) => ({ ...(d.data() as CompanionApplication), applicationId: d.id }));
}

export async function loadAllApplicationsRemote(): Promise<CompanionApplication[]> {
  const firestore = db();
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, APPS));
  return snap.docs.map((d) => ({ ...(d.data() as CompanionApplication), applicationId: d.id }));
}

export async function loadPublicMatesRemote(): Promise<import("@shared/companion").PublicMate[]> {
  const firestore = db();
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, PUBLIC));
  return snap.docs.map((d) => d.data() as import("@shared/companion").PublicMate);
}

export function isLiveCompanionStatus(status: CompanionStatus): boolean {
  return status === "approved";
}
