import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import type { PulseIssue, PulseResponse } from "@shared/pulse";
import { getFirebaseDb } from "./firebase";
import {
  acknowledgePulseIssueRemote,
  createPulseRemote,
  getPulseByTokenRemote,
  liveBackendEnabled,
  publishPulseRemote,
  resolvePulseIssueRemote,
  submitPulseResponseRemote,
} from "./functions";

function asIso(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return "";
}

export function pulseResponseFromDoc(id: string, data: Record<string, unknown>): PulseResponse | null {
  if (!Array.isArray(data.answers)) return null;
  return {
    id,
    propertyId: String(data.propertyId || ""),
    pulseId: String(data.pulseId || ""),
    deploymentId: String(data.deploymentId || ""),
    publicToken: String(data.publicToken || ""),
    answers: data.answers as PulseResponse["answers"],
    primaryScore: typeof data.primaryScore === "number" ? data.primaryScore : undefined,
    contactRequested: data.contactRequested === true,
    contactName: typeof data.contactName === "string" ? data.contactName : undefined,
    contactMethod: typeof data.contactMethod === "string" ? data.contactMethod : undefined,
    roomNumber: typeof data.roomNumber === "string" ? data.roomNumber : undefined,
    issueId: typeof data.issueId === "string" ? data.issueId : undefined,
    createdAt: asIso(data.createdAtIso) || asIso(data.createdAt) || new Date().toISOString(),
    uid: typeof data.uid === "string" ? data.uid : undefined,
    anonymous: data.anonymous !== false,
  };
}

export function pulseIssueFromDoc(id: string, data: Record<string, unknown>): PulseIssue | null {
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  if (!summary) return null;
  const status =
    data.status === "acknowledged" || data.status === "resolved" || data.status === "open"
      ? data.status
      : "open";
  return {
    id,
    propertyId: String(data.propertyId || ""),
    pulseId: String(data.pulseId || ""),
    responseId: String(data.responseId || ""),
    deploymentId: String(data.deploymentId || ""),
    status,
    category: (typeof data.category === "string" ? data.category : "other") as PulseIssue["category"],
    summary,
    primaryScore: typeof data.primaryScore === "number" ? data.primaryScore : undefined,
    roomNumber: typeof data.roomNumber === "string" ? data.roomNumber : undefined,
    contactRequested: data.contactRequested === true,
    contactName: typeof data.contactName === "string" ? data.contactName : undefined,
    contactMethod: typeof data.contactMethod === "string" ? data.contactMethod : undefined,
    assigneeUid: typeof data.assigneeUid === "string" ? data.assigneeUid : undefined,
    acknowledgedAt: asIso(data.acknowledgedAt) || undefined,
    acknowledgedBy: typeof data.acknowledgedBy === "string" ? data.acknowledgedBy : undefined,
    resolvedAt: asIso(data.resolvedAt) || undefined,
    resolvedBy: typeof data.resolvedBy === "string" ? data.resolvedBy : undefined,
    resolutionNote: typeof data.resolutionNote === "string" ? data.resolutionNote : undefined,
    followupScore: typeof data.followupScore === "number" ? data.followupScore : undefined,
    followupAt: asIso(data.followupAt) || undefined,
    staffTicketId: typeof data.staffTicketId === "string" ? data.staffTicketId : undefined,
    createdAt: asIso(data.createdAtIso) || asIso(data.createdAt) || new Date().toISOString(),
  };
}

export async function fetchPulseByToken(publicToken: string) {
  if (!liveBackendEnabled()) throw new Error("Pulse needs a live connection.");
  return getPulseByTokenRemote({ publicToken });
}

export async function submitPulse(input: Parameters<typeof submitPulseResponseRemote>[0]) {
  if (!liveBackendEnabled()) throw new Error("Pulse needs a live connection.");
  return submitPulseResponseRemote(input);
}

export async function createDuringStayPulse(propertyId: string, name?: string) {
  if (!liveBackendEnabled()) throw new Error("Pulse needs a live connection.");
  return createPulseRemote({ propertyId, template: "stay_during", name });
}

export async function publishPulse(propertyId: string, pulseId: string) {
  if (!liveBackendEnabled()) throw new Error("Pulse needs a live connection.");
  return publishPulseRemote({ propertyId, pulseId, placement: "room", label: "Room card" });
}

export async function acknowledgePulseIssue(propertyId: string, issueId: string) {
  return acknowledgePulseIssueRemote({ propertyId, issueId });
}

export async function resolvePulseIssue(propertyId: string, issueId: string, resolutionNote?: string) {
  return resolvePulseIssueRemote({ propertyId, issueId, resolutionNote });
}

export function subscribePropertyPulseResponses(
  propertyId: string,
  onChange: (rows: PulseResponse[]) => void,
): () => void {
  if (!propertyId || propertyId === "unknown" || !liveBackendEnabled()) {
    onChange([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "pulseResponses"),
    (snap) => {
      const rows: PulseResponse[] = [];
      for (const doc of snap.docs) {
        const row = pulseResponseFromDoc(doc.id, doc.data() as Record<string, unknown>);
        if (row) rows.push(row);
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(rows);
    },
    () => onChange([]),
  );
}

export function subscribePropertyPulseIssues(
  propertyId: string,
  onChange: (rows: PulseIssue[]) => void,
): () => void {
  if (!propertyId || propertyId === "unknown" || !liveBackendEnabled()) {
    onChange([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "pulseIssues"),
    (snap) => {
      const rows: PulseIssue[] = [];
      for (const doc of snap.docs) {
        const row = pulseIssueFromDoc(doc.id, doc.data() as Record<string, unknown>);
        if (row) rows.push(row);
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(rows);
    },
    () => onChange([]),
  );
}

export function openPulseIssueCount(issues: PulseIssue[]) {
  return issues.filter((i) => i.status !== "resolved").length;
}

export function averagePrimaryScore(responses: PulseResponse[]): number | null {
  const scores = responses.map((r) => r.primaryScore).filter((n): n is number => typeof n === "number");
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
