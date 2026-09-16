# AirPal.me analytics event dictionary

Schema version: `1`.  
Collector: `src/lib/analytics.ts`.  
Contract: `shared/analytics.ts`.  
Business ledger: callable `recordAnalyticsBatch` → `analyticsEvents/{eventId}`.

## North-star

**WQGA/Context** = verified qualified guest actions in week W ÷ active QR contexts in week W.

A context is active in W if it is a known published context and recorded at least one eligible `qr_scan` or `context_view` that day/week. Seed/demo (`backendState: local_demo`), failed, duplicate, and quota-rejected events are excluded.

Always report numerator, denominator, and the per-context distribution — never the average alone.

## Identifiers

| Field | Meaning |
|---|---|
| `eventId` | UUID per event |
| `anonymousSessionId` | First-party session id |
| `visitorId` | Optional 30-day random id; not derived from email or device fingerprint |
| `uid` | Firebase Auth uid when present |
| `tenantId` | Operator organisation; server-resolved |
| `contextId` | QR-enabled experience id |
| `contextType` | `property` `room` `marker` `campus` `event` `business` `bio` |
| `qrCampaignId` | Printed placement id when known |
| `source` | `qr` `direct` `share` `referral` `internal` `unknown` |
| `backendState` | `live` `offline_queued` `local_demo` `failed` |

## Events

| Event | When it fires | Counts toward north-star |
|---|---|---|
| `session_started` | First page in a browser session | No |
| `qr_scan` | Printed QR or in-app scan landing | No |
| `context_view` | Stay / marker / campus / event / bio context loaded | No |
| `context_load_failed` | Context failed to load | No |
| `first_value` | First useful action in a session/context/day | Yes, max once per session/context/day |
| `content_action` | Map (`actionType=map_open`), Wi-Fi reveal, profile open, booking intent | Yes for allowlisted `actionType` |
| `ask_submitted` | Guest submitted Ask AirPal | No |
| `ask_answered` | Answer shown | Yes if `answerStatus=shown` |
| `offer_view` | Offer shown | No |
| `offer_claim` | Claim succeeded; uses server `claimId` | Yes |
| `offer_redeem` | Staff redeemed; server `claimId` | Yes |
| `event_save` | Stall/event saved | Yes |
| `support_request` | Guest ticket created | Yes |
| `support_resolved` | Host closed a ticket | Yes |
| `host_activation` | Host listed a property / listing / event | No |
| `content_publish` | Operator published content | No |
| `rating_submitted` | Guest rating stored | Yes |
| `share_created` | Share sheet used | No |
| `client_error` | Uncaught window error, unhandled rejection, or React boundary. No stack, URL, or free text — `errorClass` + `errorSource` + path only. | No |

Not emitted until the product exists: `event_check_in`, `subscription_state`.

## Forbidden in properties

`password`, `wifiPassword`, `email`, `phone`, `question`, `note`, `details`, `token`, `roomToken`, `pin`, `staffPin`, `href`, `url`, `guestName`, and any value over 200 characters.

## Retention (policy)

| Store | Retention |
|---|---|
| Raw ledger `analyticsEvents` | 12 months (business facts) |
| Rejects `analyticsEventRejects` | 90 days |
| Daily aggregates | Commercial reporting period |
| GA4 diagnostics | Provider default; optional consent |

## KPI formula (code)

`shared/analytics.ts` → `isQualifiedAction`, `northStarFromEvents`.  
Daily rollup → `shared/analytics-aggregate.ts`.
