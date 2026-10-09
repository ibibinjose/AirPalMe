import {
  ANALYTICS_AGGREGATION_VERSION,
  analyticsDedupeKey,
  calendarDay,
  isQualifiedAction,
  isProductionEligible,
  wqgaFromEvents,
  type AnalyticsEvent,
  type WqgaResult,
} from "./analytics";

export type AnalyticsDailyFact = {
  periodStart: string;
  periodEnd: string;
  tenantId?: string;
  contextId: string;
  contextType?: string;
  qrCampaignId?: string;
  activeContextDays: number;
  sessions: number;
  uniqueSessions: number;
  qrScans: number;
  contextViews: number;
  firstValueSessions: number;
  qualifiedActions: number;
  qualifiedActionSessions: number;
  offerClaims: number;
  offerRedemptions: number;
  eventSaves: number;
  supportRequests: number;
  supportResolutions: number;
  loadErrors: number;
  localDemoEventsExcluded: number;
  duplicateEventsExcluded: number;
  aggregationVersion: number;
};

export function dailyFactId(contextId: string, day: string, version: number = ANALYTICS_AGGREGATION_VERSION): string {
  const safe = contextId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `${safe}_${day}_${version}`;
}

export function aggregateDailyFacts(
  events: AnalyticsEvent[],
  version = ANALYTICS_AGGREGATION_VERSION,
): AnalyticsDailyFact[] {
  const seen = new Set<string>();
  const buckets = new Map<
    string,
    AnalyticsDailyFact & { sessionSet: Set<string>; firstSet: Set<string>; qualifiedSet: Set<string> }
  >();

  function bucket(contextId: string, day: string) {
    const id = `${contextId}|${day}`;
    const existing = buckets.get(id);
    if (existing) return existing;
    const row: AnalyticsDailyFact & { sessionSet: Set<string>; firstSet: Set<string>; qualifiedSet: Set<string> } = {
      periodStart: `${day}T00:00:00.000Z`,
      periodEnd: `${day}T23:59:59.999Z`,
      contextId,
      contextType: undefined,
      tenantId: undefined,
      qrCampaignId: undefined,
      activeContextDays: 1,
      sessions: 0,
      uniqueSessions: 0,
      qrScans: 0,
      contextViews: 0,
      firstValueSessions: 0,
      qualifiedActions: 0,
      qualifiedActionSessions: 0,
      offerClaims: 0,
      offerRedemptions: 0,
      eventSaves: 0,
      supportRequests: 0,
      supportResolutions: 0,
      loadErrors: 0,
      localDemoEventsExcluded: 0,
      duplicateEventsExcluded: 0,
      aggregationVersion: version,
      sessionSet: new Set<string>(),
      firstSet: new Set<string>(),
      qualifiedSet: new Set<string>(),
    };
    buckets.set(id, row);
    return row;
  }

  for (const event of events) {
    const day = calendarDay(event.occurredAt);
    if (!day) continue;
    const contextId = event.contextId || "_none";
    const row = bucket(contextId, day);
    if (event.contextType) row.contextType = event.contextType;
    if (event.tenantId) row.tenantId = event.tenantId;
    if (event.qrCampaignId) row.qrCampaignId = event.qrCampaignId;

    if (!isProductionEligible(event)) {
      row.localDemoEventsExcluded += 1;
      continue;
    }
    const key = analyticsDedupeKey(event);
    if (seen.has(key)) {
      row.duplicateEventsExcluded += 1;
      continue;
    }
    seen.add(key);

    row.sessionSet.add(event.anonymousSessionId);
    if (event.eventName === "qr_scan") row.qrScans += 1;
    if (event.eventName === "context_view") row.contextViews += 1;
    if (event.eventName === "context_load_failed") row.loadErrors += 1;
    if (event.eventName === "first_value") row.firstSet.add(event.anonymousSessionId);
    if (event.eventName === "offer_claim") row.offerClaims += 1;
    if (event.eventName === "offer_redeem") row.offerRedemptions += 1;
    if (event.eventName === "event_save") row.eventSaves += 1;
    if (event.eventName === "support_request") row.supportRequests += 1;
    if (event.eventName === "support_resolved") row.supportResolutions += 1;
    if (isQualifiedAction(event)) {
      row.qualifiedActions += 1;
      row.qualifiedSet.add(event.anonymousSessionId);
    }
  }

  return Array.from(buckets.values())
    .map((row) => {
      const { sessionSet, firstSet, qualifiedSet, ...fact } = row;
      fact.uniqueSessions = sessionSet.size;
      fact.sessions = sessionSet.size;
      fact.firstValueSessions = firstSet.size;
      fact.qualifiedActionSessions = qualifiedSet.size;
      return fact;
    })
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.contextId.localeCompare(b.contextId));
}

export function wqgaFromFacts(events: AnalyticsEvent[], now?: number): WqgaResult {
  return wqgaFromEvents(events, now);
}
