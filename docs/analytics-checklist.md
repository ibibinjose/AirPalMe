# Analytics implementation checklist

Source of truth: `analytics-instrumentation-implementation-plan.md`.  
Product north star per canon (`docs/AIRPAL.md`): **Completed Experiences per Active User**. This plan tracks **WQGA/Context** (Weekly Qualified Guest Actions per Active QR Context) as the QR-context diagnostic in Admin → Telemetry.  
Architecture: Option C — GA4/Firebase Analytics for UX diagnostics + server ledger for business facts.

Mark items only when code, tests, and rules match the plan. Do not invent events that have no product flow.

## Phase 0 — contract and decisions

- [x] QR-context diagnostic definition: WQGA/Context (Admin telemetry; product north star stays Completed Experiences per canon)
- [x] Architecture: hybrid server ledger + optional GA4
- [x] Event dictionary: `docs/analytics-event-dictionary.md`
- [x] Privacy: no passwords, free-text questions, email, phone, tokens, or full URLs in events
- [x] Local/demo events labelled `local_demo` and excluded from production KPIs
- [ ] Tenant ownership backfill for every live property (ops; not a code path)

## Phase 1 — shared contract and client collector

- [x] `shared/analytics.ts` envelope, allowlists, validation, eligibility, dedupe
- [x] `shared/analytics.test.ts` (valid, reject unknown/sensitive, demo exclusion, qualified actions)
- [x] `src/lib/analytics.ts` session ID, consent, queue, local_demo, fire-and-forget
- [x] `session_started`, `qr_scan`, `context_view`, `context_load_failed`, `first_value`, `content_action`
- [x] QR vs direct vs internal vs share vs demo distinguished
- [x] Analytics failure never blocks map, Wi-Fi, ask, or claim
- [x] Stay map `content_action` / `map_open` (Local favorites, arrival, bio)

## Phase 2 — server ingestion

- [x] Callable `recordAnalyticsBatch`
- [x] Schema, App Check, quotas, dedupe, context resolution
- [x] No client writes to `analyticsEvents`
- [x] Authoritative: offer claim/redeem, event save, host activation, rating, support
- [x] Operators cannot read another tenant’s raw events

## Phase 3 — aggregation and reporting

- [x] Idempotent daily facts (`aggregationVersion` + deterministic IDs)
- [x] WQGA/Context, first-value rate, qualified-action rate
- [x] Admin dashboard: numerator, denominator, mix, guardrails
- [x] Fixture test: known events → known WQGA/Context; rerun identical

## Explicitly not built (no product flow yet)

- `event_check_in` emission (no guest check-in product)
- `subscription_state` emission (no billing product)
- Cookie consent banner (policy documents first-party operational telemetry; GA4 remains optional)
