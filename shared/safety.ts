/** Trust moat, first slice: report user / report booking / emergency + immediate block. Every report opens an admin case. */

export const REPORT_TARGETS = ["user", "booking"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = [
  "harassment",
  "unsafe-behaviour",
  "scam-or-payment",
  "fake-profile",
  "no-show",
  "emergency",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or abuse",
  "unsafe-behaviour": "Unsafe behaviour at the meetup",
  "scam-or-payment": "Asked for money off-platform",
  "fake-profile": "Fake profile or impersonation",
  "no-show": "Didn't show up",
  emergency: "Emergency — someone may be hurt",
  other: "Something else",
};

export type SafetyReportStatus = "new" | "reviewed" | "actioned";

export interface SafetyReportInput {
  target: ReportTarget;
  targetUid: string;
  planId: string;
  reason: ReportReason;
  details: string;
}

export function emptyReport(planId: string, targetUid: string): SafetyReportInput {
  return { target: "user", targetUid, planId, reason: "harassment", details: "" };
}

export function isReportTarget(t: string): t is ReportTarget {
  return (REPORT_TARGETS as readonly string[]).includes(t);
}

export function isReportReason(r: string): r is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(r);
}

export function reportValid(input: SafetyReportInput): boolean {
  return (
    isReportTarget(input.target) &&
    input.targetUid.trim().length > 0 &&
    isReportReason(input.reason) &&
    input.details.trim().length >= 10
  );
}

export function blockDocId(blockerUid: string, blockedUid: string): string {
  return `${blockerUid}_${blockedUid}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Launch triage: emergency cases sort before all others, then newest first. */
export function isEmergencyReason(reason: string): boolean {
  return reason === "emergency";
}

export function sortSafetyCasesEmergenciesFirst<
  T extends { reason: string; createdAt: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aEmergency = isEmergencyReason(a.reason) ? 0 : 1;
    const bEmergency = isEmergencyReason(b.reason) ? 0 : 1;
    if (aEmergency !== bEmergency) return aEmergency - bEmergency;
    if (b.createdAt < a.createdAt) return -1;
    if (b.createdAt > a.createdAt) return 1;
    return 0;
  });
}

/** Launch SLA: emergencies target review within 4 hours, everything else within a day. */
export function slaDeadlineHours(reason: string): number {
  return isEmergencyReason(reason) ? 4 : 24;
}

export type SlaState = "ok" | "due" | "overdue";

export function slaState(
  report: { reason: string; status: string; createdAt: string },
  nowMs = Date.now(),
): SlaState {
  if (report.status !== "new") return "ok";
  const created = new Date(report.createdAt).getTime();
  if (!Number.isFinite(created)) return "due";
  return nowMs - created > slaDeadlineHours(report.reason) * 3600_000 ? "overdue" : "due";
}

export function slaAgeLabel(createdAt: string, nowMs = Date.now()): string {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return "—";
  const mins = Math.max(0, Math.floor((nowMs - created) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
