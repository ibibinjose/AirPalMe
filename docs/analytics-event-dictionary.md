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
| `session_started`     | First page in a browser session                                                                                                        | No                                    |
| `qr_scan`             | Printed QR or in-app scan landing                                                                                                      | No                                    |
| `context_view`        | Stay / marker / campus / event / bio context loaded                                                                                    | No                                    |
| `context_load_failed` | Context failed to load                                                                                                                 | No                                    |
| `first_value`         | First useful action in a session/context/day                                                                                           | Yes, max once per session/context/day |
| `content_action`      | Map (`actionType=map_open`), Wi-Fi reveal, profile open, booking intent                                                                | Yes for allowlisted `actionType`      |
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
| `content_update`      | Operator updated existing content                                                                                                      | No                                    |
| `rating_submitted`    | Guest rating stored                                                                                                                    | Yes                                   |
| `share_created`       | Share sheet used                                                                                                                       | No                                    |
| `calendar_event_view` | Calendar event viewed                                                                                                                  | No                                    |
| `calendar_event_share` | Calendar event share action                                                                                                           | No                                    |
| `calendar_event_going` | Calendar event marked as going                                                                                                        | No                                    |
| `calendar_event_interested` | Calendar event marked as interested                                                                                              | No                                    |
| `calendar_event_liked` | Calendar event liked                                                                                                                  | No                                    |
| `calendar_event_directions` | Directions opened for a calendar event                                                                                           | No                                    |
| `calendar_event_open` | Calendar event opened                                                                                                                   | No                                    |
| `calendar_month_navigate` | Calendar month navigation                                                                                                         | No                                    |
| `calendar_jump_today` | Calendar jump-to-today action                                                                                                           | No                                    |
| `calendar_date_select` | Calendar date selected                                                                                                                 | No                                    |
| `calendar_view_change` | Calendar view changed                                                                                                                  | No                                    |
| `calendar_filter_change` | Calendar filter changed                                                                                                                | No                                    |
| `calendar_category_filter` | Calendar category filter changed                                                                                                      | No                                    |
| `calendar_search`    | Calendar search submitted                                                                                                               | No                                    |
| `calendar_export_batch` | Calendar export batch action                                                                                                           | No                                    |
| `calendar_agenda_export_day` | Calendar agenda day export action                                                                                               | No                                    |
| `calendar_export_selected_day` | Calendar selected-day export action                                                                                              | No                                    |
| `calendar_event_reschedule` | Calendar event rescheduled                                                                                                       | No                                    |
| `favorites_view`     | Favorites view opened                                                                                                                   | No                                    |
| `favorites_place_select` | Place selected from favorites                                                                                                      | No                                    |
| `favorites_filter_change` | Favorites filter changed                                                                                                           | No                                    |
| `companion_cta_viewed` | Companion call-to-action viewed                                                                                                      | No                                    |
| `companion_application_started` | Companion application started                                                                                                  | No                                    |
| `companion_application_submitted` | Companion application submitted                                                                                              | No                                    |
| `companion_application_reviewed` | Companion application reviewed                                                                                                  | No                                    |
| `client_error`        | Uncaught window error, unhandled rejection, or React boundary. No stack, URL, or free text — `errorClass` + `errorSource` + path only. | No                                    |

### Event properties

Property names below are the allowlisted keys from `shared/analytics.ts`. Required properties must be present and non-empty; optional properties are included only when available. Values are clipped to 200 characters and sensitive keys are rejected.

| Event | Required properties | Optional properties |
| --- | --- | --- |
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
| `event_save` | `eventId`, `contextId` | `stallId`, `source` |
| `event_check_in` | `eventId`, `contextId`, `checkInId` | `method` |
| `support_request` | `contextId`, `requestId`, `category` | `priority` |
| `support_resolved` | `contextId`, `requestId`, `resolutionStatus` | `resolutionTimeMs` |
| `host_activation` | `tenantId`, `activationStep` | `contextId`, `actorRole` |
| `content_publish` | `tenantId`, `contentType`, `contentId` | `contextId`, `actorRole` |
| `content_update` | `tenantId`, `contentType`, `contentId` | `contextId`, `actorRole` |
| `rating_submitted` | `targetType`, `targetId`, `contextId` | `ratingBucket` |
| `share_created` | `shareType`, `contextId` | `contentId`, `destination` |
| `subscription_state` | `tenantId`, `planState` | `planId` |
| `calendar_event_view` | None | `eventId`, `slug`, `name`, `category`, `action` |
| `calendar_event_share` | None | `eventId`, `name`, `action` |
| `calendar_event_going` | None | `eventId`, `name`, `action` |
| `calendar_event_interested` | None | `eventId`, `name`, `action` |
| `calendar_event_liked` | None | `eventId`, `name`, `action` |
| `calendar_event_directions` | None | `eventId`, `name`, `action` |
| `calendar_event_open` | None | `eventId`, `name`, `action` |
| `calendar_month_navigate` | None | `direction`, `year`, `month`, `action` |
| `calendar_jump_today` | None | `action` |
| `calendar_date_select` | None | `date`, `hasEvents`, `action` |
| `calendar_view_change` | None | `view`, `action` |
| `calendar_filter_change` | None | `filter`, `action` |
| `calendar_category_filter` | None | `category`, `action` |
| `calendar_search` | None | `query`, `queryLength`, `action` |
| `calendar_export_batch` | None | `type`, `count`, `action` |
| `calendar_agenda_export_day` | None | `date`, `count`, `action` |
| `calendar_export_selected_day` | None | `date`, `count`, `action` |
| `calendar_event_reschedule` | None | `eventId`, `fromDate`, `toDate`, `action` |
| `favorites_view` | None | `contextId`, `lat`, `lng`, `category`, `action` |
| `favorites_place_select` | None | `placeId`, `placeName`, `action` |
| `favorites_filter_change` | None | `category`, `action` |
| `companion_cta_viewed` | None | `source` |
| `companion_application_started` | None | None |
| `companion_application_submitted` | None | `roles` |
| `companion_application_reviewed` | `status` | None |
| `client_error` | `errorClass`, `errorSource` | `path`, `name` |

Not emitted until the product exists: `event_check_in`, `subscription_state`.

## Forbidden in properties

`password`, `wifiPassword`, `email`, `phone`, `question`, `note`, `details`, `token`, `roomToken`, `pin`, `staffPin`, `href`, `url`, `guestName`, and any value over 200 characters.

## Retention (policy)

| Store                           | Retention                          |
| ------------------------------- | ---------------------------------- |
| Raw ledger `analyticsEvents`    | 12 months (business facts)         |
| Rejects `analyticsEventRejects` | 90 days                            |
| Daily aggregates                | Commercial reporting period         |
| GA4 diagnostics                 | Provider default; optional consent |

## KPI formula (code)

`shared/analytics.ts` → `isQualifiedAction`, `northStarFromEvents`.  
Daily rollup → `shared/analytics-aggregate.ts`.
