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
