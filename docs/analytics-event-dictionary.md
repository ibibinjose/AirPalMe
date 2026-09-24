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

| Field                | Meaning                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `eventId`            | UUID per event                                                          |
| `anonymousSessionId` | First-party session id                                                  |
| `visitorId`          | Optional 30-day random id; not derived from email or device fingerprint |
| `uid`                | Firebase Auth uid when present                                          |
| `tenantId`           | Operator organisation; server-resolved                                  |
| `contextId`           | QR-enabled experience id                                                |
| `contextType`         | `property` `room` `marker` `campus` `event` `business` `bio`            |
| `qrCampaignId`        | Printed placement id when known                                         |
| `source`              | `qr` `direct` `share` `referral` `internal` `unknown`                   |
| `backendState`        | `live` `offline_queued` `local_demo` `failed`                           |

## Events

| Event                 | When it fires                                                                                                                          | Counts toward north-star              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `session_started`     | First page in a browser session; emitted once per session — route changes do not emit additional session events                       | No                                    |
| `qr_scan`             | Printed QR or in-app scan landing                                                                                                      | No                                    |
| `context_view`        | Stay / marker / campus / event / business / bio context loaded                                                                          | No                                    |
| `context_load_failed` | Context failed to load                                                                                                                 | No                                    |
| `first_value`         | First useful action in a session/context/day                                                                                           | Yes, max once per session/context/day |
| `content_action`      | Map (`actionType=map_open`), Wi-Fi reveal, profile open, booking intent, place open, experience completed (`experience_completed`)     | Yes for allowlisted `actionType`      |
| `ask_submitted`       | Guest submitted Ask AirPal                                                                                                             | No                                    |
| `ask_answered`        | Answer shown                                                                                                                           | Yes if `answerStatus=shown`           |
| `offer_view`          | Offer shown                                                                                                                            | No                                    |
| `offer_claim`         | Claim succeeded; uses server `claimId`                                                                                                 | Yes                                   |
| `offer_redeem`        | Staff redeemed; server `claimId`                                                                                                       | Yes                                   |
| `event_save`          | Stall/event saved                                                                                                                      | Yes                                   |
| `support_request`     | Guest ticket created                                                                                                                   | Yes                                   |
| `support_resolved`    | Host closed a ticket                                                                                                                   | Yes                                   |
| `host_activation`     | Host listed a property / listing / event                                                                                               | No                                    |
| `content_publish`     | Operator published content                                                                                                             | No                                    |
| `content_update`      | Operator updated published content                                                                                                     | No                                    |
| `calendar_event_view` | Calendar event detail opened                                                                                                           | No                                    |
| `calendar_event_share` | Share invoked from a calendar event                                                                                                   | No                                    |
| `calendar_event_going` | Going RSVP from a calendar event                                                                                                      | No                                    |
| `calendar_event_interested` | Interested RSVP from a calendar event                                                                                            | No                                    |
| `calendar_event_liked` | Like toggled on a calendar event                                                                                                      | No                                    |
| `calendar_event_directions` | Directions opened for a calendar event                                                                                         | No                                    |
| `calendar_event_open` | Calendar event opened (source tile/link)                                                                                               | No                                    |
| `calendar_month_navigate` | Month grid paged forward/back                                                                                                      | No                                    |
| `calendar_jump_today` | Jumped back to today                                                                                                                   | No                                    |
| `calendar_date_select` | Day cell selected                                                                                                                      | No                                    |
| `calendar_view_change` | Calendar layout changed (month/agenda/…)                                                                                               | No                                    |
| `calendar_filter_change` | Calendar filter changed                                                                                                               | No                                    |
| `calendar_category_filter` | Calendar filtered by category                                                                                                    | No                                    |
| `calendar_search`     | Calendar searched                                                                                                                      | No                                    |
| `calendar_export_batch` | Batch export of calendar events                                                                                                     | No                                    |
| `calendar_agenda_export_day` | Single agenda day exported                                                                                                      | No                                    |
| `calendar_export_selected_day` | Selected day exported                                                                                                          | No                                    |
| `calendar_event_reschedule` | Calendar event moved to a new date                                                                                              | No                                    |
| `favorites_view`      | Local favorites list viewed                                                                                                            | No                                    |
| `favorites_place_select` | Favorite place selected                                                                                                            | No                                    |
| `favorites_filter_change` | Favorites filtered by category                                                                                                    | No                                    |
| `companion_cta_viewed` | Mate application CTA shown                                                                                                            | No                                    |
| `companion_application_started` | Mate application form opened                                                                                                | No                                    |
| `companion_application_submitted` | Mate application submitted                                                                                              | No                                    |
| `companion_application_reviewed` | Mate application reviewed (requires `status`)                                                                             | No                                    |
| `rating_submitted`    | Guest rating stored                                                                                                                    | Yes                                   |
| `share_created`       | Share sheet used                                                                                                                       | No                                    |
| `client_error`        | Uncaught window error, unhandled rejection, or React boundary. No stack, URL, or free text — `errorClass` + `errorSource` + path only. | No                                    |

Not emitted until the product exists: `event_check_in`, `subscription_state`.

## Property contract (required / optional)

Mirrors `EVENT_PROPERTY_ALLOWLIST` in `shared/analytics.ts`. `validateAnalyticsEvent` rejects events missing a required key (`missing:<key>`), drops unlisted keys, and rejects sensitive keys. Collectors must always send every required key for the event they emit — the typed helpers in `src/lib/analytics.ts` (`trackFirstValue`, `trackContentAction`, `trackPageView`) do this by signature; raw `track()` callers must pass them by hand.

| Event | Required | Optional |
| ----- | -------- | -------- |
| `session_started` | `entryPath`, `source` | `referrerClass`, `locale` |
| `qr_scan` | `contextType`, `contextId` | `qrCampaignId`, `placementType`, `source` |
| `context_view` | `contextType`, `contextId`, `loadStatus` | `loadMs`, `backendState` |
| `context_load_failed` | `contextType`, `contextId`, `errorClass` | `loadMs` |
| `first_value` | `valueType`, `contextId` | `contentId`, `timeFromSessionStartMs`, `timeFromQrScanMs`, `loopTargetMet` |
| `content_action` | `actionType`, `contextId` | `contentId`, `category`, `destination` |
| `ask_submitted` | `contextId`, `questionCategory` | `answerSource`, `latencyMs` |
| `ask_answered` | `contextId`, `answerStatus` | `questionCategory`, `helpful` |
| `offer_view` | `offerId`, `partnerId`, `contextId` | `placement` |
| `offer_claim` | `offerId`, `partnerId`, `claimId`, `contextId` | `expiryBucket` |
| `offer_redeem` | `offerId`, `partnerId`, `claimId` | `redemptionChannel` |
| `event_save` | `eventId`, `contextId` | `stallId`, `source`, `action` |
| `event_check_in` | `eventId`, `contextId`, `checkInId` | `method` |
| `support_request` | `contextId`, `requestId`, `category` | `priority` |
| `support_resolved` | `contextId`, `requestId`, `resolutionStatus` | `resolutionTimeMs` |
| `host_activation` | `tenantId`, `activationStep` | `contextId`, `actorRole` |
| `content_publish` | `tenantId`, `contentType`, `contentId` | `contextId`, `actorRole` |
| `content_update` | `tenantId`, `contentType`, `contentId` | `contextId`, `actorRole` |
| `rating_submitted` | `targetType`, `targetId`, `contextId` | `ratingBucket` |
| `share_created` | `shareType`, `contextId` | `contentId`, `destination` |
| `subscription_state` | `tenantId`, `planState` | `planId` |
| `calendar_event_view` | — | `eventId`, `slug`, `name`, `category`, `action` |
| `calendar_event_share` | — | `eventId`, `name`, `action` |
| `calendar_event_going` | — | `eventId`, `name`, `action` |
| `calendar_event_interested` | — | `eventId`, `name`, `action` |
| `calendar_event_liked` | — | `eventId`, `name`, `action` |
| `calendar_event_directions` | — | `eventId`, `name`, `action` |
| `calendar_event_open` | — | `eventId`, `name`, `action` |
| `calendar_month_navigate` | — | `direction`, `year`, `month`, `action` |
| `calendar_jump_today` | — | `date`, `action` |
| `calendar_date_select` | — | `date`, `hasEvents`, `action` |
| `calendar_view_change` | — | `view`, `action` |
| `calendar_filter_change` | — | `filter`, `action` |
| `calendar_category_filter` | — | `category`, `action` |
| `calendar_search` | — | `query`, `queryLength`, `action` |
| `calendar_export_batch` | — | `type`, `count`, `action` |
| `calendar_agenda_export_day` | — | `date`, `count`, `action` |
| `calendar_export_selected_day` | — | `date`, `count`, `action` |
| `calendar_event_reschedule` | — | `eventId`, `fromDate`, `toDate`, `action` |
| `favorites_view` | — | `contextId`, `lat`, `lng`, `category`, `action` |
| `favorites_place_select` | — | `placeId`, `placeName`, `action` |
| `favorites_filter_change` | — | `category`, `action` |
| `companion_cta_viewed` | — | `source` |
| `companion_application_started` | — | — |
| `companion_application_submitted` | — | `roles` |
| `companion_application_reviewed` | `status` | — |
| `client_error` | `errorClass`, `errorSource` | `path`, `name` |

Enumerated values (enforced by `isQualifiedAction`, not by the validator — unknown values validate but never count):

- `valueType`: `wifi` `answer` `map` `profile` `faq` `offer` `save` `support` `booking` `place`
- `actionType`: `map_open` `wifi_reveal` `profile_open` `booking_intent` `place_open`
- `answerStatus`: counts toward the north-star only when `shown`
- `contextType`: `property` `room` `marker` `campus` `event` `business` `bio`
- `source`: `qr` `direct` `share` `referral` `internal` `unknown`
- `backendState`: `live` `offline_queued` `local_demo` `failed`
- `status` (`companion_application_reviewed`): free string from the review flow; required, never omit

`client_error` carries `errorClass` + `errorSource` + `path` only. Stacks, full URLs, and free-text are stripped by design to prevent PII.

## Collector notes

- `trackContentAction()` derives the paired `first_value.valueType` from the action: `wifi_reveal`→`wifi`, `map_open`→`map`, `profile_open`→`profile`, `booking_intent`→`booking`, `place_open`→`place`, anything else→`faq`. The subtype is preserved, never collapsed.
- `trackContentAction()` forwards only `contentId` to `first_value`. Any other `extra` keys (`destination`, `category`, …) belong to `content_action` and would be silently stripped from `first_value` by the validator — callers must not expect them there.
- Map links never send the URL: `openMap()` accepts a URL for navigation but records only `destination` (e.g. `"maps"` or the caller-supplied label). `url` is forbidden — `destination` is the safe replacement.
- `noteQrContext(id, { source })` records that value as `placementType` (the scan surface: `stay`, `marker`, `campus`, `scan`), not as traffic `source`. QR-scan events always carry `source: "qr"`.
- `trackPageView()` emits `context_view` with `loadStatus: "ok"` for every context route. The five context pages (stay, marker, campus, event, bio) separately emit `context_load_failed` with `errorClass: "not_found"` when the id resolves to nothing — read the pair together, or misses read as hits.

## Forbidden in properties

`password`, `wifiPassword`, `email`, `phone`, `question`, `note`, `details`, `token`, `roomToken`, `pin`, `staffPin`, `href`, `url`, `guestName`, `code`, and any value over 200 characters.

## Retention (policy)

| Store                           | Retention                          |
| ------------------------------- | ---------------------------------- |
| Raw ledger `analyticsEvents`    | 12 months (business facts)         |
| Rejects `analyticsEventRejects` | 90 days                            |
| Daily aggregates                | Commercial reporting period         |
| GA4 diagnostics                 | Provider default; optional consent |

## Amplitude tracking plan (project `845386`)

Status: the Amplitude project currently holds only default autocapture/system properties (`[Amplitude] *`, `[Guides-Surveys] *`). None of the custom events or properties below are planned yet, so Amplitude cannot currently validate whether these custom events are being ingested — treat the contract and ledger as source of truth until the plan below is applied. To plan them, create one event per name in the Events table above, then add the properties from the Property contract table with these types:

- Number: `timeFromSessionStartMs`, `timeFromQrScanMs`, `queryLength`, `count`, `year`, `month`, `lat`, `lng`, `loadMs`, `latencyMs`, `resolutionTimeMs`
- Boolean: `loopTargetMet`, `hasEvents`, `helpful`
- String: everything else

Mark each property required in Amplitude exactly when it is required in the Property contract table. Keep the forbidden list (§ Forbidden in properties) out of Amplitude entirely — never plan `password`, `wifiPassword`, `email`, `phone`, `question`, `note`, `details`, `token`, `roomToken`, `pin`, `staffPin`, `href`, `url`, `guestName`, or `code` as event properties.

## KPI formula (code)

`shared/analytics.ts` → `isQualifiedAction`, `northStarFromEvents`.  
Daily rollup → `shared/analytics-aggregate.ts`.
