import {
  type HangoutPlan,
  type PlanAttendee,
  type PlanComment,
  type PlanStop,
  type StopChangeAction,
  buildStopChangeMessage,
  randomInviteCode,
  planInviteUrl,
  reorderStops,
  stopChangeRecipients,
} from "@shared/plan";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import { omitUndefinedDeep } from "./firestore-data";
import { publicSiteOrigin } from "./public-origin";

const STORAGE_KEY = "airpal.plans.v3";

let cachedPlans: HangoutPlan[] = [];
const subscribers = new Set<() => void>();
let firestoreSyncInitialized = false;

/** User plans only: device cache + Firestore `plans` sync. No bundled seeds — empty means empty. */
function readFromStorage(): HangoutPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const map = new Map<string, HangoutPlan>();
    for (const p of parsed) {
      if (p && typeof p.id === "string") map.set(p.id, p);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function writeToStorage(plans: HangoutPlan[]): void {
  cachedPlans = plans;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      /* ignore */
    }
  }
  subscribers.forEach((fn) => fn());
}

export function initPlanFirestoreSync(): () => void {
  if (firestoreSyncInitialized || !isFirebaseConfigured || typeof window === "undefined") {
    return () => {};
  }
  const db = getFirebaseDb();
  if (!db) return () => {};

  firestoreSyncInitialized = true;
  const plansColl = collection(db, "plans");
  const unsubscribe = onSnapshot(
    plansColl,
    (snapshot) => {
      if (!snapshot.empty) {
        const remotePlans: HangoutPlan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as HangoutPlan;
          if (data && data.id) remotePlans.push(data);
        });

        const currentLocal = loadPlans();
        const map = new Map<string, HangoutPlan>();
        for (const l of currentLocal) map.set(l.id, l);
        for (const r of remotePlans) map.set(r.id, r);

        writeToStorage(Array.from(map.values()));
      }
    },
    () => {
      /* local cache remains the source while Firestore is unreachable */
    },
  );

  return unsubscribe;
}

export function subscribePlans(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function loadPlans(): HangoutPlan[] {
  if (cachedPlans.length === 0) {
    cachedPlans = readFromStorage();
  }
  return cachedPlans;
}

export function getPlan(idOrCode: string): HangoutPlan | undefined {
  const norm = idOrCode.trim().toLowerCase();
  const all = loadPlans();
  return all.find(
    (p) => p.id.toLowerCase() === norm || p.inviteCode.toLowerCase() === norm || p.id.toLowerCase() === `plan-${norm}`,
  );
}

export async function fetchRemotePlan(idOrCode: string): Promise<HangoutPlan | undefined> {
  const local = getPlan(idOrCode);
  if (!isFirebaseConfigured) return local;
  const db = getFirebaseDb();
  if (!db) return local;

  const norm = idOrCode.trim();
  try {
    const docRef = doc(db, "plans", norm);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const plan = snap.data() as HangoutPlan;
      savePlan(plan, false);
      return plan;
    }

    // Query by inviteCode
    const q = query(collection(db, "plans"), where("inviteCode", "==", norm.toUpperCase()));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const plan = qSnap.docs[0]!.data() as HangoutPlan;
      savePlan(plan, false);
      return plan;
    }
  } catch {
    /* keep the local copy */
  }
  return local;
}

export function savePlan(plan: HangoutPlan, syncRemote = true): HangoutPlan {
  const all = loadPlans();
  const index = all.findIndex((p) => p.id === plan.id);
  const now = new Date().toISOString();

  const finalPlan: HangoutPlan = {
    ...plan,
    updatedAt: now,
    inviteCode: plan.inviteCode || randomInviteCode(),
    stops: plan.stops || [],
    attendees: plan.attendees || [],
    comments: plan.comments || [],
    subscribers: plan.subscribers || [],
  };

  let updated: HangoutPlan[];
  if (index >= 0) {
    updated = [...all];
    updated[index] = finalPlan;
  } else {
    updated = [finalPlan, ...all];
  }

  writeToStorage(updated);

  if (syncRemote && isFirebaseConfigured) {
    const db = getFirebaseDb();
    if (db) {
      setDoc(doc(db, "plans", finalPlan.id), omitUndefinedDeep(finalPlan), { merge: true }).catch(() => {
        /* stay on the device copy until sync retries */
      });
    }
  }

  return finalPlan;
}


/** Close the AirPal loop: plan → show up → completed experience. */
export function completePlan(planId: string): HangoutPlan | undefined {
  const current = getPlan(planId);
  if (!current) return undefined;
  if (current.status === "cancelled") return current;
  if (current.status === "completed") return current;
  return savePlan({
    ...current,
    status: "completed",
    updatedAt: new Date().toISOString(),
  });
}

export function deletePlan(planId: string): boolean {
  const all = loadPlans();
  const next = all.filter((p) => p.id !== planId);
  writeToStorage(next);

  if (isFirebaseConfigured) {
    const db = getFirebaseDb();
    if (db) {
      deleteDoc(doc(db, "plans", planId)).catch(() => undefined);
    }
  }
  return true;
}

export function respondToPlan(planId: string, attendee: Omit<PlanAttendee, "respondedAt">): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const existingIdx = plan.attendees.findIndex((a) => a.id === attendee.id);
  const now = new Date().toISOString();
  const newAttendee: PlanAttendee = { ...attendee, respondedAt: now };

  const nextAttendees = [...plan.attendees];
  if (existingIdx >= 0) {
    nextAttendees[existingIdx] = newAttendee;
  } else {
    nextAttendees.push(newAttendee);
  }

  const updatedPlan: HangoutPlan = {
    ...plan,
    attendees: nextAttendees,
    updatedAt: now,
  };

  return savePlan(updatedPlan);
}

export function addStopToPlan(planId: string, stop: Omit<PlanStop, "id">): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const newStop: PlanStop = {
    ...stop,
    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    votes: stop.votes ?? 1,
    voterUids: stop.voterUids || (stop.addedByUid ? [stop.addedByUid] : []),
  };

  const updatedPlan: HangoutPlan = {
    ...plan,
    stops: [...plan.stops, newStop],
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

export function updateStopInPlan(
  planId: string,
  stopId: string,
  patch: Partial<Omit<PlanStop, "id">>,
): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const nextStops = plan.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s));
  const updatedPlan: HangoutPlan = {
    ...plan,
    stops: nextStops,
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

export function removeStopFromPlan(planId: string, stopId: string): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;
  if (!plan.stops.some((s) => s.id === stopId)) return plan;

  const updatedPlan: HangoutPlan = {
    ...plan,
    stops: plan.stops.filter((s) => s.id !== stopId),
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

export function reorderStopsInPlan(planId: string, fromIndex: number, toIndex: number): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const updatedPlan: HangoutPlan = {
    ...plan,
    stops: reorderStops(plan.stops, fromIndex, toIndex),
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

export function voteStopInPlan(planId: string, stopId: string, userId: string): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const nextStops = plan.stops.map((s) => {
    if (s.id !== stopId) return s;
    const voters = new Set(s.voterUids || []);
    if (voters.has(userId)) {
      voters.delete(userId);
    } else {
      voters.add(userId);
    }
    return {
      ...s,
      voterUids: Array.from(voters),
      votes: voters.size,
    };
  });

  const updatedPlan: HangoutPlan = {
    ...plan,
    stops: nextStops,
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

/** Date-poll votes ride the plan doc (`dateOptions`); guests vote through the callable (rules keep direct writes host-only). */
export function votePlanDateOption(
  planId: string,
  optionId: string,
  userId: string,
  syncRemote = true,
): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan || !plan.dateOptions?.some((o) => o.id === optionId)) return undefined;

  const nextOptions = plan.dateOptions.map((o) => {
    if (o.id !== optionId) return o;
    const voters = new Set(o.voterUids || []);
    if (voters.has(userId)) voters.delete(userId);
    else voters.add(userId);
    return { ...o, voterUids: Array.from(voters), votes: voters.size };
  });

  return savePlan({ ...plan, dateOptions: nextOptions }, syncRemote);
}

export const PLAN_COMMENT_MAX = 500;

/** Crew discussion stays on the plan doc (`comments`) so rules §plans stay the single gate. */
export function commentValid(text: string): boolean {
  const t = text.trim();
  return t.length >= 1 && t.length <= PLAN_COMMENT_MAX;
}

export function addCommentToPlan(
  planId: string,
  comment: Omit<PlanComment, "id" | "createdAt">,
): HangoutPlan | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;
  if (!commentValid(comment.text)) return undefined;

  const newComment: PlanComment = {
    ...comment,
    text: comment.text.trim(),
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedPlan: HangoutPlan = {
    ...plan,
    comments: [...(plan.comments || []), newComment],
    updatedAt: new Date().toISOString(),
  };

  return savePlan(updatedPlan);
}

export interface StopChangeNotification {
  id: string;
  planId: string;
  action: StopChangeAction;
  stopName: string;
  message: string;
  recipientIds: string[];
  createdAt: string;
}

const NOTIFICATIONS_KEY = "airpal.plan-notifications.v2";
const MAX_NOTIFICATIONS = 100;
let memoryNotifications: StopChangeNotification[] = [];

function readNotifications(): StopChangeNotification[] {
  if (typeof window === "undefined") return [...memoryNotifications];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(all: StopChangeNotification[]): void {
  const trimmed = all.slice(-MAX_NOTIFICATIONS);
  if (typeof window === "undefined") {
    memoryNotifications = trimmed;
    return;
  }
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function notifyStopChange(
  planId: string,
  action: StopChangeAction,
  opts?: { stopName?: string; actorName?: string },
): StopChangeNotification | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const stopName = opts?.stopName ?? "";
  const record: StopChangeNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    planId: plan.id,
    action,
    stopName,
    message: buildStopChangeMessage(action, stopName, opts?.actorName),
    recipientIds: stopChangeRecipients(plan),
    createdAt: new Date().toISOString(),
  };

  writeNotifications([...readNotifications(), record]);
  return record;
}

export function listStopNotifications(planId?: string): StopChangeNotification[] {
  const all = readNotifications();
  return planId ? all.filter((n) => n.planId === planId) : all;
}

export function clearStopNotifications(): void {
  writeNotifications([]);
}

export function togglePlanSubscription(
  planId: string,
  subscriberId: string,
): { plan: HangoutPlan; subscribed: boolean } | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;

  const norm = subscriberId.trim().toLowerCase();
  const isSubscribed = plan.subscribers.some((s) => s.toLowerCase() === norm);

  let nextSubscribers: string[];
  if (isSubscribed) {
    nextSubscribers = plan.subscribers.filter((s) => s.toLowerCase() !== norm);
  } else {
    nextSubscribers = [...plan.subscribers, subscriberId];
  }

  const updatedPlan = savePlan({
    ...plan,
    subscribers: nextSubscribers,
    updatedAt: new Date().toISOString(),
  });

  return { plan: updatedPlan, subscribed: !isSubscribed };
}

/**
 * Generates an .ics calendar file content for the social plan
 */
export function generatePlanIcs(plan: HangoutPlan): string {
  const startD = new Date(`${plan.date}T${plan.time}:00`);
  const endD = new Date(startD.getTime() + 3 * 60 * 60 * 1000); // 3-hour duration

  const formatIcsTime = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const stopsSummary = plan.stops.map((s, i) => `${i + 1}. ${s.name}${s.time ? ` (${s.time})` : ""}`).join("\\n");
  const fullDesc = `${plan.notes || ""}\\n\\nItinerary:\\n${stopsSummary}\\n\\nCreated on AirPal.Me: ${planInviteUrl(plan.id, publicSiteOrigin())}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AirPal//Social Mates Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:plan-${plan.id}@airpal.me`,
    `DTSTAMP:${formatIcsTime(new Date())}`,
    `DTSTART:${formatIcsTime(startD)}`,
    `DTEND:${formatIcsTime(endD)}`,
    `SUMMARY:${plan.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${fullDesc}`,
    `LOCATION:${(plan.destination || plan.city).replace(/[,;]/g, " ")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadPlanIcs(plan: HangoutPlan): void {
  const ics = generatePlanIcs(plan);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getPlanGoogleCalendarUrl(plan: HangoutPlan): string {
  const startD = new Date(`${plan.date}T${plan.time}:00`);
  const endD = new Date(startD.getTime() + 3 * 60 * 60 * 1000);

  const formatIsoUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const stopsSummary = plan.stops.map((s, i) => `${i + 1}. ${s.name}${s.time ? ` (${s.time})` : ""}`).join("\n");
  const details = `${plan.notes || ""}\n\nItinerary:\n${stopsSummary}\n\nAirPal Invite: ${planInviteUrl(plan.id, publicSiteOrigin())}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.title,
    dates: `${formatIsoUtc(startD)}/${formatIsoUtc(endD)}`,
    details,
    location: plan.destination || plan.city,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
