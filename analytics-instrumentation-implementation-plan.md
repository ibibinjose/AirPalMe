# AirPal.me Analytics Instrumentation and North-Star Metric Implementation Plan

**Repository:** `ibibinjose/NewAirPalMe`  
**Baseline:** `main` at `5cd4024fdb6d28e3db5cd20cc6492bb792e73655`  
**Primary goal:** Measure whether each active QR context creates useful guest outcomes for the operator who deployed it.

## 1. Outcome and design principles

AirPal.me should be able to answer four questions for every property, venue, campus, event, business profile, or street marker:

1. **How did the guest arrive?** Which QR code, route, campaign, partner, or referral produced the session?
2. **Did the experience load and become useful?** Did the guest reach a contextual page and complete a first useful action?
3. **What outcome occurred?** Did the guest open a map, reveal Wi-Fi, ask a question, save an event, claim an offer, contact a host, or complete another meaningful action?
4. **Did the operator benefit?** Which contexts, content items, partners, and campaigns produce qualified actions, resolved requests, redemptions, or repeat usage?

The implementation should follow these principles:

- **Measure outcomes rather than clicks alone.** A page view is diagnostic; a qualified action is product value.
- **Keep guest friction low.** Anonymous sessions remain supported; do not require registration for basic utility.
- **Use one typed event contract.** Every event must have a name, version, timestamp, actor/session identifiers, context, source, and privacy classification.
- **Separate raw telemetry from reporting facts.** Raw events are append-oriented and short-lived; daily aggregates are stable reporting records.
- **Do not put sensitive content in analytics.** Never record Wi-Fi passwords, free-text questions, email addresses, phone numbers, access tokens, or full URLs containing personal data.
- **Make backend truth authoritative for business metrics.** Client analytics can describe experience; claims, redemptions, subscriptions, and operator ownership must be verified server-side.
- **Support local/demo mode explicitly.** The existing `localStorage` fallback is useful, but analytics must label local/demo events and exclude them from production KPI reports.

## 2. Architecture options

| Approach                                             | What it does                                                                                                                                                                                                                                                                             | Tradeoffs                                                                                                                                                                  | Cost                                                              | Setup complexity |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| **A. Firebase-first event ledger plus optional GA4** | Sends product events through a typed client module, writes authoritative events through callable Functions or a controlled Firestore path, and optionally mirrors privacy-safe events to Firebase Analytics/GA4. Scheduled aggregation creates per-context and per-tenant KPI documents. | Best operator reporting and auditability; more engineering and Firestore volume; requires retention and aggregation controls.                                              | Firebase usage plus optional GA4; usually modest at pilot volume. | Medium to high   |
| **B. Lightweight GA4/Firebase Analytics only**       | Calls `logEvent()` from the client and builds reports in GA4/Explorations. Backend domain records remain the source for claims and other transactions.                                                                                                                                   | Fastest and cheapest; weak tenant isolation, historical reproducibility, and operator-facing reporting; sampled/retained analytics may not support all business questions. | Low additional cost.                                              | Low              |
| **C. Hybrid recommended for a commercial pilot**     | Uses GA4/Firebase Analytics for UX diagnostics and a minimal server-side event ledger for QR attribution, first value, qualified actions, claims/redemptions, operator activation, and support outcomes. Aggregates only the events needed for business reporting.                       | Balances speed and durable business measurement; requires careful event ownership so the two streams do not drift.                                                         | Low to moderate at pilot volume.                                  | Medium           |

**Suggested implementation baseline:** use **Option C**. It is light enough to ship incrementally, while preserving the server-side facts needed to prove operator value and calculate the north-star metric by tenant, context, and campaign. Option B is acceptable for a short prototype, but should not be the final architecture if AirPal.me intends to sell operator subscriptions or partner reporting.

## 3. North-star metric definition

### 3.1 Metric

> **Weekly Qualified Guest Actions per Active QR Context (WQGA/Context)**

This is the average number of verified, meaningful guest actions generated by each active QR-enabled context in a rolling or calendar week.

A **qualified guest action** is a successful action that indicates the guest received or pursued contextual value, such as:

- Reading a contextual answer or opening a useful FAQ response
- Revealing Wi-Fi through the protected flow
- Opening directions or a map to a recommended place
- Opening a venue/business profile from the context
- Saving an event or stall
- Claiming an offer
- Submitting a host/service request
- Completing a booking-intent click
- Completing an event check-in
- Submitting a rating after an interaction

Raw page views, repeated automatic loads, failed requests, admin activity, seed/demo events, and bot-like events do **not** count.

### 3.2 Formula

For a reporting period `W`:

```text
WQGA/Context(W) =
  verified qualified guest actions during W
  ------------------------------------------------
  active QR contexts during W
```

Where:

```text
active QR contexts = contexts that are published/active
                     and had at least one eligible day during W
```

Also report the components separately:

```text
Qualified-action rate = unique sessions with >= 1 qualified action
                        -------------------------------------------
                        unique eligible guest sessions

First-value rate = unique sessions with a first_value event
                   ---------------------------------------
                   unique eligible guest sessions

Repeat-value rate = sessions returning to the same context or tenant
                    within 7 days and completing a qualified action
                    ------------------------------------------------
                    sessions with an initial qualified action
```

Do not use only the average. A tenant with 2 contexts and 500 actions should not be treated the same as a tenant with 200 contexts and 500 actions. Always show numerator, denominator, median per-context value, and distribution percentiles.

### 3.3 Guardrails

The north-star metric must be accompanied by:

- p95 context load time and load-error rate;
- percentage of events marked `local_demo` or `backend_unavailable`;
- duplicate-event rate;
- anonymous abuse/rate-limit rejection rate;
- content freshness and percentage of public items past expiry;
- unresolved support-request count and age;
- offer claim-to-redemption rate where redemption exists;
- privacy opt-out and deletion-request status.

A rising WQGA/Context with rising errors, stale content, or unverified claims is not healthy growth.

## 4. Measurement model

### 4.1 Core entities

Add or formalize these identifiers across the app:

| Identifier           | Meaning                                                 | Lifetime                      | Examples                                                           |
| -------------------- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `eventId`            | Unique telemetry event ID generated once per event      | Permanent for retained event  | UUID or `nanoid`                                                   |
| `anonymousSessionId` | Browser session identifier, not an account identity     | Session or 30 days            | Stored in first-party session/local storage                        |
| `visitorId`          | Optional privacy-safe first-party identifier            | 30–90 days, consent-dependent | Random UUID; do not derive from email/device fingerprint           |
| `tenantId`           | Paying/operating organisation boundary                  | Permanent                     | Property group, campus, organiser, precinct                        |
| `contextId`          | QR-enabled experience being measured                    | Permanent                     | Property, room, marker, campus, event gate                         |
| `contextType`        | Context taxonomy                                        | Permanent                     | `property`, `room`, `marker`, `campus`, `event`, `business`, `bio` |
| `qrCampaignId`       | Printed or distributed QR placement/campaign            | Permanent                     | `hotel-lobby-2026-q3`, generated placement ID                      |
| `contentId`          | Specific answer, place, offer, event, stall, or profile | Permanent                     | Existing domain IDs                                                |
| `source`             | Acquisition source                                      | Event-level                   | `qr`, `direct`, `share`, `referral`, `internal`, `unknown`         |
| `backendState`       | Whether the action was live, cached, queued, or demo    | Event-level                   | `live`, `offline_queued`, `local_demo`, `failed`                   |

`tenantId` and `contextId` must come from server-authoritative records for reporting. The client may propose them, but a server-side validation step must reject events for unknown or unauthorized reporting contexts.

### 4.2 Event envelope

Create a shared TypeScript type, for example in `shared/analytics.ts`:

```ts
export type AnalyticsEventName =
  | "session_started"
  | "qr_scan"
  | "context_view"
  | "context_load_failed"
  | "first_value"
  | "content_action"
  | "ask_submitted"
  | "ask_answered"
  | "offer_view"
  | "offer_claim"
  | "offer_redeem"
  | "event_save"
  | "event_check_in"
  | "support_request"
  | "support_resolved"
  | "host_activation"
  | "content_publish"
  | "content_update"
  | "rating_submitted"
  | "share_created"
  | "subscription_state";

export type AnalyticsEvent = {
  eventId: string;
  eventName: AnalyticsEventName;
  schemaVersion: 1;
  occurredAt: string;
  receivedAt?: string;
  anonymousSessionId: string;
  visitorId?: string;
  uid?: string;
  tenantId?: string;
  contextId?: string;
  contextType?: "property" | "room" | "marker" | "campus" | "event" | "business" | "bio";
  qrCampaignId?: string;
  source?: "qr" | "direct" | "share" | "referral" | "internal" | "unknown";
  backendState: "live" | "offline_queued" | "local_demo" | "failed";
  properties: Record<string, string | number | boolean | null>;
};
```

Add runtime validation. Only allow an explicit property allowlist per event name. Reject or strip unknown properties before persistence. Limit event payload size, for example to 8 KB, and truncate diagnostic strings rather than persisting unbounded text.

### 4.3 Event property allowlist

| Event                 | Required properties                            | Optional properties                       | Counts toward north star?                |
| --------------------- | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `session_started`     | `entryPath`, `source`                          | `referrerClass`, `locale`                 | No                                       |
| `qr_scan`             | `contextType`, `contextId`                     | `qrCampaignId`, `placementType`, `source` | No                                       |
| `context_view`        | `contextType`, `contextId`, `loadStatus`       | `loadMs`, `backendState`                  | No                                       |
| `context_load_failed` | `contextType`, `contextId`, `errorClass`       | `loadMs`                                  | No                                       |
| `first_value`         | `valueType`, `contextId`                       | `contentId`, `timeFromSessionStartMs`     | Yes, one per session/context/day maximum |
| `content_action`      | `actionType`, `contextId`                      | `contentId`, `category`, `destination`    | Yes for approved action types            |
| `ask_submitted`       | `contextId`, `questionCategory`                | `answerSource`, `latencyMs`               | No; `ask_answered` may count when useful |
| `ask_answered`        | `contextId`, `answerStatus`                    | `questionCategory`, `helpful`             | Yes if the answer is successfully shown  |
| `offer_view`          | `offerId`, `partnerId`, `contextId`            | `placement`                               | No                                       |
| `offer_claim`         | `offerId`, `partnerId`, `claimId`, `contextId` | `expiryBucket`                            | Yes                                      |
| `offer_redeem`        | `offerId`, `partnerId`, `claimId`              | `redemptionChannel`                       | Yes; authoritative server event          |
| `event_save`          | `eventId`, `contextId`                         | `stallId`, `source`                       | Yes                                      |
| `event_check_in`      | `eventId`, `contextId`, `checkInId`            | `method`                                  | Yes; authoritative server event          |
| `support_request`     | `contextId`, `requestId`, `category`           | `priority`                                | Yes when successfully created            |
| `support_resolved`    | `contextId`, `requestId`, `resolutionStatus`   | `resolutionTimeMs`                        | Yes when resolved                        |
| `host_activation`     | `tenantId`, `activationStep`                   | `contextId`, `actorRole`                  | No                                       |
| `content_publish`     | `tenantId`, `contentType`, `contentId`         | `contextId`, `actorRole`                  | No                                       |
| `rating_submitted`    | `targetType`, `targetId`, `contextId`          | `ratingBucket`                            | Yes if tied to an eligible interaction   |
| `share_created`       | `shareType`, `contextId`                       | `contentId`, `destination`                | No                                       |

The taxonomy intentionally avoids recording the actual free-text question, notes, email, phone number, Wi-Fi password, or full referral URL.

## 5. Repository implementation map

### 5.1 New shared analytics contract

**Add:** `shared/analytics.ts` and `shared/analytics.test.ts`

Responsibilities:

- Event names, context types, source values, action/value enums
- Envelope and per-event property types
- Runtime validation and normalization
- North-star eligibility function
- Deduplication key generation
- PII/sensitive-field rejection
- Payload size and string-length limits

Tests should cover:

- Valid event acceptance
- Unknown event/property rejection
- Sensitive keys rejected
- Duplicate key stability
- Demo/offline events excluded from production aggregates
- Only approved `first_value`/`content_action` events count as qualified actions

### 5.2 Client event collector

**Add:** `src/lib/analytics.ts`

Responsibilities:

- Create or retrieve `anonymousSessionId`
- Preserve campaign parameters and QR placement metadata without persisting sensitive URLs
- Add route/context information from the current page
- Validate events using the shared contract
- Send to Firebase Analytics for diagnostic UX reporting when measurement consent allows
- Send the subset of business-critical events to a callable Function or controlled Firestore write path
- Queue events during temporary network failure
- Mark local/demo events as `local_demo`
- Never block the primary guest action on analytics failure

Suggested interface:

```ts
track(eventName, properties, options?): Promise<void>;
trackFirstValue(valueType, context, properties?): Promise<void>;
trackQualifiedAction(actionType, context, properties?): Promise<void>;
setAnalyticsConsent(consent): void;
flushAnalyticsQueue(): Promise<void>;
```

Use fire-and-forget behavior for diagnostic events. For business-critical events such as `offer_claim`, `support_request`, `offer_redeem`, `event_check_in`, and `host_activation`, the domain operation must complete first and the server response must supply the authoritative ID used in the event.

### 5.3 Firebase initialization

**Modify:** `src/lib/firebase.ts`

The file already initializes Firebase Analytics conditionally. Add:

- A single cached Analytics instance and an explicit `analyticsEnabled()` result
- Consent gating before calling `getAnalytics()` or `logEvent()` where required by the deployment/privacy policy
- Environment labels such as `development`, `staging`, or `production`
- No hard-coded measurement IDs or secrets

Do not treat Analytics initialization alone as instrumentation. Every event call should pass through `src/lib/analytics.ts`.

### 5.4 Context propagation

**Modify:** the context/session and route-related modules, including:

- `src/contexts/StayContext.tsx`
- `src/contexts/ListingsContext.tsx`
- `src/contexts/EventsContext.tsx`
- `src/contexts/BioContext.tsx`
- `src/contexts/ClubContext.tsx`
- `src/app/routes.tsx`
- `src/pages/ScanPage.tsx`
- `src/pages/MarkerPage.tsx`
- `src/pages/StayPage.tsx`
- `src/pages/CampusPage.tsx`
- `src/pages/EventPage.tsx`
- `src/pages/PlacePage.tsx`
- `src/pages/BioPublicPage.tsx`

Create a context object once per entry route and pass it to child components rather than reconstructing IDs from display text. Emit `qr_scan` only when the entry can be attributed to a QR campaign; a direct route visit should be `source: "direct"`.

The app must distinguish:

- URL opened from a printed QR code
- Shared public link
- Internal navigation
- Seed/demo context
- Backend-backed live context

### 5.5 Server-side event ingestion

**Add to:** `functions/src/index.ts` or a new `functions/src/analytics.ts`, then export from the Functions entry point.

Recommended callable: `recordAnalyticsBatch`.

Server responsibilities:

1. Verify App Check where available and apply anonymous/session quotas.
2. Validate event schema and payload size.
3. Normalize server timestamp and environment.
4. Resolve `contextId` to a known active context and derive `tenantId` from the trusted record.
5. Reject or quarantine unknown contexts, expired campaigns, impossible transitions, or suspicious volume.
6. Deduplicate by `eventId` and a business-specific key.
7. Write a batch to an append-only collection.
8. Return accepted, rejected, and duplicate counts without exposing internal errors.

Suggested collections:

```text
analyticsEvents/{eventId}
analyticsEventRejects/{rejectId}       // restricted; optional
analyticsDaily/{tenantId_YYYYMMDD}
analyticsContextDaily/{contextId_YYYYMMDD}
analyticsCampaignDaily/{qrCampaignId_YYYYMMDD}
analyticsActivation/{tenantId}
```

For higher event volume, use a partitioned event ID and a collection strategy that avoids hot documents. Do not increment a single tenant counter directly for every client event; aggregate in bounded batches or scheduled jobs.

### 5.6 Firestore security rules

**Modify:** `firestore.rules`.

Do not allow arbitrary clients to write arbitrary analytics documents. Use one of these controls:

- Prefer callable Functions for ingestion; allow no direct client writes to raw analytics collections.
- If direct writes are necessary for low-risk diagnostic events, permit only a strict schema and only for the caller’s anonymous session, with bounded fields and no tenant-controlled IDs.
- Permit operators to read only aggregate documents for tenants they manage.
- Permit platform admins to read raw/reject collections.
- Deny client update/delete on raw events. Retention cleanup should run through server credentials.

Add rules tests using the Firebase emulator for cross-tenant read isolation and forbidden writes.

### 5.7 Aggregation job

**Add:** `functions/src/analytics-aggregate.ts` and a scheduled export from `functions/src/index.ts`.

Run hourly for operational freshness and once daily for finalized reporting. The job should:

- Read new events using a cursor or time window
- Deduplicate by `eventId` and business dedupe key
- Exclude `local_demo`, `failed`, bot/quota-rejected, and invalid events
- Resolve active context status for the event date
- Calculate daily facts per tenant, context, campaign, and event type
- Update idempotently using deterministic document IDs
- Store `aggregationVersion` and `computedAt`
- Record job status, duration, input count, output count, and failure reason

Daily aggregate fields should include:

```text
periodStart
periodEnd
tenantId
contextId
contextType
qrCampaignId
activeContextDays
sessions
uniqueSessions
qrScans
contextViews
firstValueSessions
qualifiedActions
qualifiedActionSessions
repeatQualifiedSessions
offerClaims
offerRedemptions
eventSaves
eventCheckIns
supportRequests
supportResolutions
loadErrors
p95LoadMs
localDemoEventsExcluded
duplicateEventsExcluded
aggregationVersion
computedAt
```

Use deterministic document IDs such as `{contextId}_{YYYY-MM-DD}_{aggregationVersion}` so rerunning the job is safe.

## 6. North-star computation details

### 6.1 Event eligibility

Define a shared server-side function:

```ts
isQualifiedAction(event, facts): boolean
```

Eligibility requires:

- Event schema is valid
- Event is from production, not `local_demo`
- Context was active on the event date
- Event is associated with a known tenant/context
- Event is not duplicate, rejected, or bot/quota-flagged
- Session has not already counted the same action type/content combination inside the dedupe window
- Event is not generated by an admin/operator preview session

Recommended dedupe windows:

| Event type         | Dedupe key                                   | Window                       |
| ------------------ | -------------------------------------------- | ---------------------------- |
| `first_value`      | session + context + calendar day             | Once per session/context/day |
| `content_action`   | session + context + action type + content ID | 24 hours                     |
| `offer_claim`      | claim ID                                     | Permanent                    |
| `offer_redeem`     | redemption ID                                | Permanent                    |
| `event_check_in`   | check-in ID                                  | Permanent                    |
| `support_request`  | request ID                                   | Permanent                    |
| `rating_submitted` | rating ID or session + target                | 24 hours                     |

### 6.2 Reporting views

Build the initial operator dashboard from aggregate documents rather than raw client telemetry.

Required views:

1. **Executive summary:** active contexts, WQGA/Context, qualified-action rate, first-value rate, repeat rate, errors, and stale content.
2. **Context performance:** rank contexts by scans, qualified actions, action rate, and p95 load time.
3. **QR campaign performance:** placement, source, scan-to-first-value, scan-to-qualified-action, and repeat usage.
4. **Guest action mix:** Wi-Fi, answers, maps, offers, saves, support, check-ins, and ratings.
5. **Operator activation:** setup steps completed, time to publish, test scan completed, first guest action, staff invitations.
6. **Partner outcomes:** offer views, claims, redemptions, disputes, and attributable actions.
7. **Reliability and trust:** rejected events, duplicate events, load failures, content age, unresolved requests, and privacy requests.

The first version can be an admin-only page using the existing `/admin` area. Tenant-specific reporting should be a separate protected route after the aggregate read rules and organisation permissions are in place.

## 7. Privacy, consent, and data governance

Before production instrumentation:

- Update the privacy notice to describe event categories, purposes, retention, analytics providers, anonymous identifiers, and deletion rights.
- Separate necessary operational telemetry from optional analytics/marketing measurement.
- Do not send raw question text, notes, email, phone, Wi-Fi, room secrets, or arbitrary URLs.
- Hash or avoid partner/customer identifiers in diagnostic analytics; use internal IDs in server-side reporting.
- Set a retention policy, for example: raw diagnostic events 90 days, business event ledger 12–24 months, daily aggregates retained for the commercial reporting period.
- Implement deletion/export handling for account-linked data. Anonymous telemetry should be deletable by visitor/session token where technically required by policy.
- Document data residency and access roles for operator, staff, platform admin, and support.
- Add a test that scans the serialized event payload for prohibited keys and sensitive patterns.

## 8. Delivery phases

### Phase 0 — contract and decisions, 1–2 days

- Confirm the north-star definition and eligible action list.
- Choose event retention and consent policy.
- Decide whether the pilot needs GA4, the server ledger, or both.
- Assign tenant/context ownership for current seed and production records.
- Create a measurement dictionary in `docs/analytics-event-dictionary.md`.

**Exit evidence:** approved event list, context taxonomy, privacy classification, and KPI formula.

### Phase 1 — shared contract and client collector, 3–5 days

- Add `shared/analytics.ts` and tests.
- Add `src/lib/analytics.ts`.
- Implement session ID, campaign/source persistence, consent gating, local/demo labeling, and offline queue.
- Instrument `session_started`, `qr_scan`, `context_view`, `context_load_failed`, `first_value`, and the main `content_action` events.
- Add console/development diagnostics behind a feature flag, never in production payloads.

**Exit evidence:** local event inspector shows valid events for `/`, `/scan`, `/g/:id`, `/q/:city/:handle`, `/c/:id`, `/e/:id`, and `/@handle`.

### Phase 2 — server ingestion and protection, 4–7 days

- Add `recordAnalyticsBatch`.
- Add schema validation, App Check handling, quotas, deduplication, context/tenant resolution, and restricted raw storage.
- Add Firestore rule tests and emulator tests.
- Wire authoritative domain events: offer claim, support request, event save/check-in, host activation, content publish, rating.

**Exit evidence:** accepted/rejected/duplicate counts are observable; unauthorized tenants cannot read or write another tenant’s analytics.

### Phase 3 — daily aggregation and north-star reporting, 4–6 days

- Add scheduled aggregation and idempotent daily facts.
- Add WQGA/Context, first-value rate, qualified-action rate, repeat rate, and guardrails.
- Add an admin-only dashboard or export endpoint.
- Compare aggregate results against raw fixture data in deterministic tests.

**Exit evidence:** rerunning aggregation produces the same totals; a seeded fixture yields a known WQGA/Context result.

### Phase 4 — pilot validation, 2–4 weeks

- Instrument a small number of real QR placements.
- Review event rejection, duplicate, and local/demo rates daily.
- Interview operators about whether reports answer renewal questions.
- Compare contexts by placement and content freshness.
- Refine eligible action definitions only through versioned schema changes.

**Exit evidence:** at least one pilot can identify its highest-performing QR placements, first-value rate, qualified actions, and unresolved operational gaps.

## 9. Testing and observability plan

### Automated tests

- Unit tests for normalization, validation, deduplication, eligibility, aggregation, and PII rejection.
- React tests for context propagation and first-value emission.
- Firebase emulator tests for callable authentication, App Check behavior where testable, tenant resolution, and aggregate read rules.
- Integration fixtures for guest scan → context view → action → offer claim/support request.
- Idempotency tests that run an aggregation job twice and assert identical results.
- Regression tests confirming analytics failures never prevent the guest from opening a map, reading help, or completing a domain action.

### Operational dashboards and alerts

Alert on:

- ingestion failure rate above 2% for 15 minutes;
- rejected events above a defined baseline;
- duplicate rate above 10%;
- p95 context load time above 2.5 seconds;
- context load failure above 1%;
- aggregation job missing or delayed by more than 2 hours;
- sudden spike in anonymous claims, ratings, or check-ins;
- more than 10% of active public content past expiry;
- support requests unresolved beyond the operator SLA.

Log only structured metadata: event name, batch size, tenant/context IDs where permitted, status, latency, and error class. Do not log payloads containing user-entered text.

## 10. Definition of done

The analytics implementation is ready for pilot use when:

- Every production QR/context entry emits a validated `qr_scan` or clearly records a non-QR source.
- At least one `first_value` event is emitted for each supported guest value path.
- Qualified actions are defined in code, versioned, deduplicated, and calculated server-side.
- Local/demo/offline events cannot inflate production KPI reports.
- Raw events are protected from arbitrary client writes and cross-tenant reads.
- Offer claims, redemptions, support requests, event check-ins, and operator activation use authoritative IDs.
- Daily aggregation is idempotent and observable.
- Admin/operator reporting shows numerator, denominator, WQGA/Context, first-value rate, action mix, and guardrails.
- Privacy documentation and consent behavior match the deployed measurement model.
- Tests cover event validation, PII rejection, authorization, deduplication, aggregation, and analytics failure isolation.

## 11. Initial success targets for a pilot

Set targets after a one-week baseline, but use provisional thresholds to guide the pilot:

| Metric                                             |                        Initial target |
| -------------------------------------------------- | ------------------------------------: |
| Context view success                               |                                 ≥ 99% |
| p95 context load time                              |                         ≤ 2.5 seconds |
| First-value rate                                   |      ≥ 40% of eligible guest sessions |
| Qualified-action rate                              |      ≥ 30% of eligible guest sessions |
| Analytics accepted-event rate                      |                                 ≥ 98% |
| Duplicate/rejected event rate                      | < 5% excluding deliberate abuse tests |
| Local/demo events in production reports            |                                    0% |
| Active contexts with owner and freshness timestamp |                                  100% |
| Operator setup completed without staff repair      |                                 ≥ 80% |
| Support requests with a final status               |                                 ≥ 95% |

These are starting hypotheses, not universal benchmarks. The purpose of the first pilot is to establish a trustworthy baseline and identify which qualified actions actually correlate with operator renewal.

## Final recommendation

Implement the instrumentation in four layers: **typed shared contract → resilient client collector → protected server event ledger → idempotent aggregate reporting**. Start with QR scans, context views, first value, qualified actions, offer claims, support requests, event saves/check-ins, and operator activation. Keep GA4/Firebase Analytics for UX diagnostics, but make the server-side aggregate the source of truth for the north-star metric.

The first dashboard does not need to be sophisticated. It needs to be trustworthy, tenant-safe, and able to answer: **which QR contexts created useful guest outcomes this week, and why?**
