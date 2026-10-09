# AirPal build checklist

Last audited: 2026-10-10 (post Phase 6 teardown + two-app shells; Sept 16 audit was pre-teardown).
North star: Completed AirPal Experiences (not downloads).
Marking rules: `.grok/skills/airpal-build/SKILL.md`. Product rules: `AGENTS.md`. Binding truth: `docs/AIRPAL.md`.

Status is the second token: `done` | `partial` | `todo` | `later`.
Only `done` is checked.

---

## P0 — Required for the transaction

### Identity

- [ ] `partial` `p0-auth` Sign-up / sign-in — Done when: email+password, phone SMS, email verify, session shared across verticals. Evidence: `src/contexts/AuthContext.tsx`, `src/pages/StartPage.tsx`, `functions/src/account.ts`. Gap: no government IDV; phone+password uses Identity Toolkit with Functions `FIREBASE_WEB_API_KEY` or the public client web key, else SMS is the path.
- [ ] `todo` `p0-idv` Identity verification where required — Done when: Mate supply cannot reach `approved` without the required ID check, admin can review docs privately. Evidence: —
- [ ] `partial` `p0-profile` Consumer profile — Done when: about, interests, general location (not home address), photo, verification badges, privacy/safety controls. Evidence: `src/pages/MePage.tsx`, `src/pages/BioSetupPage.tsx`, `src/contexts/BioContext.tsx`, public `/@handle` with follow/like + status. Gap: no response-rate/reliability badges.

### Mate supply (application) — RETIRED with Phase 6 (consumer UI deleted; admin chain gated per canon G6)

- [ ] `later` `p0-mate-apply` Mate application — why later: consumer application page deleted in Phase 6; strangers deferred per canon G6. Dormant types in `shared/companion.ts`.
- [x] `done` `p0-admin-approve` Admin approval chain (gated machinery, no live supply) — Done when: human can view, approve, reject, request info, suspend. Evidence: `src/components/admin/CompanionAdmin.tsx`. No consumer supply exists; do not treat as a live loop.

### Mate demand (request → match → connect) — RETIRED with Phase 6

- [ ] `later` `p0-mate-request` Create activity request — why later: `MateRequestPage` deleted; strangers deferred per canon G6. Types linger in `shared/mate-request.ts`.
- [ ] `later` `p0-mate-discover` Discover approved Mates — why later: `MatePage` deleted; no stranger supply exists.
- [ ] `later` `p0-match` Match send/accept — why later: no request/demand surfaces. Admin backup `MateRequestsAdmin.tsx` kept as gated machinery.
- [x] `done` `p0-message` On-platform messaging — Done when: plan group conversation + profile chat with timestamps, read state, no phone/email in the thread. Evidence: `ChatBox` + `AirPalChatModal` (profile chat from `/@handle`) with safety banner + `SafetyMenu` on the thread. (Match conversations retired with the Mate loop.)

### Book → pay → complete → review

- [x] `done` `p0-book` Shared booking engine — Done when: customer/provider/date/location/price/fees/status live on `bookings`; statuses Pending → Confirmed → Cancelled / In Progress → Completed / Disputed → Refunded. Evidence: `shared/booking.ts`, `BookingsSection.tsx`. Fees from `platform_settings/marketplace`. $0 = paid; else unpaid until Stripe.
- [x] `done` `p0-pay` Payments (Stripe) — Done when: booking charges through the platform, no raw cards stored, fees from admin config not literals. Evidence: `createBookingCheckoutSession` / `createExperienceCheckoutSession` / `createStayCheckoutSession` in `functions/src/stripe.ts`, `EventPage` buy flow, webhook + dispute handling, secrets in Functions. (Mate-booking variant retired with the Mate loop.)
- [ ] `partial` `p0-payout` Provider payouts — Done when: Stripe Connect for eligible businesses, payout records separate from profiles. Evidence: `createConnectAccountLink`, `refreshConnectAccount`, `createConnectLoginLink`, transfers in `functions/src/stripe.ts`, `PayoutSetupCard`. Gap: live-transfer proof on real payouts.
- [x] `done` `p0-review` Reviews on completed records — Done when: both sides review after `completed`, reportable, never public, no algorithmic trust score. Evidence: `PlanReviewPrompt` + `ExperienceReviews` on the plan thread, gated to completed plans.

### Trust, admin, notifications

- [x] `done` `p0-report` Report — Done when: user can file a safety report that opens an admin case. Evidence: `src/components/safety/SafetyMenu.tsx`, `shared/safety.ts`, `src/components/admin/SafetyInboxAdmin.tsx`.
- [x] `done` `p0-block` Block — Done when: block is immediate and persisted. Evidence: `SafetyMenu` + `blocks` in `firestore.rules`.
- [ ] `partial` `p0-notify` Event notifications — Done when: plan, message, booking, ticket events fire with user controls. Evidence: FCM for host tickets; `createBroadcast` (circle audience) fans out to `promotion_notifications` + `/me/inbox`. Gap: ticket/scan push proofs; `p1-notify-controls` still todo.
- [ ] `partial` `p0-admin` Admin dashboard — Done when: operators can inspect users, Mates, requests, matches, bookings, reports, incidents and intervene. Evidence: `src/pages/AdminPage.tsx` + admin components. Gap: no user search/verification, GMV, finance, disputes.
- [x] `done` `p0-audit` Audit log — Done when: status/safety/booking admin actions write `admin_audits`. Evidence: `src/lib/admin-audit.ts`, `src/components/admin/AuditTrailAdmin.tsx`.

---

## P1 — Required for usability

- [ ] `partial` `p1-search` Shared search — Done when: one search across people, plans, stays, events, businesses. Evidence: `GlobalSearchModal` + live listings (`activePlaces` → `hrefForPlace`). Gap: retired Mate results with the Mate loop; fashion is still not a first-class result.
- [ ] `partial` `p1-filters` Contextual filters — Done when: location/date/category/price appear only when relevant. Evidence: `src/components/discovery/FilterChips.tsx`.
- [ ] `partial` `p1-saved` Saved items — Done when: one saved model across verticals. Evidence: `users/{id}/savedEvents`, `savedStalls`. Gap: not generic `saved_items`.
- [ ] `partial` `p1-cancel` Cancellation flow — Done when: customer/provider cancel with visible policy. Evidence: `canCustomerCancel` in `shared/booking.ts`. Gap: no policy copy, no fees.
- [ ] `todo` `p1-notify-controls` Notification preferences — Done when: user can mute types. Evidence: —
- [x] `done` `p1-gtm-circle-plans` Circle + Plan go-to-market front door — Done when: tabs/home/signup/join promote Circle, Plans, places, Stay, and business listings. Evidence: `src/lib/tabs.ts` (Home/Now/Plan/Inbox/Me), `src/pages/NowPage.tsx`, `src/pages/JoinPage.tsx`. (`DiscoverPage`/`CirclePage` deleted in Phase 6; discovery is `/now`.)
- [ ] `partial` `p1-circle-crm` Circle as creator CRM — Done when: a creator can see audience, set status, announce to followers, and read an inbox. Evidence: `src/lib/circle.ts`, `BioStatusModal` (status), `src/pages/InboxPage.tsx`, `createBroadcast` audience `circle` in `functions/src/notifications.ts`. Gap: `CirclePage` + announce sheet deleted in Phase 6 — no audience/announce UI.
- [x] `done` `biz-google-import` One-click listing import — Done when: a business can search a public listing (OSM/Nominatim without a Maps key; Google Places when a key exists), import address, phone, website, hours, and photo when the source has them. The import is a directory fill, not ownership; Featured needs work-email domain match or ABN. Evidence: `src/lib/osm-place-search.ts`, `src/components/business/GooglePlaceImport.tsx`, `src/pages/BusinessOnboardPage.tsx`, `shared/osm-place.ts`, `shared/google-place.ts`.
- [x] `done` `p1-event-create` Simple event/experience create — Done when: a user can create a free or paid event with a square image, invite Circle, and share a link; guests buy paid tickets on Stripe. Evidence: `src/pages/OrganiserEventPage.tsx` (`/event`, `/event/new`), `ExperienceBookingModal`, `TicketPass`, `functions/src/stripe.ts`. (`EventCreatePage` superseded.)

---

## P2 — Growth (`later` until P0 pay exists)

- [ ] `later` `p2-referrals` Referrals — why later: P0 payments unbuilt.
- [ ] `later` `p2-promos` Promotions / coupons — why later: P0 payments unbuilt.
- [ ] `later` `p2-membership` AirPal Plus membership — why later: core loop unproven.

---

## P3 — Expansion (`later` unless the user named the vertical)

- [ ] `partial` `p3-experiences` AirPal Experiences — Done when: provider apply → create → admin review → publish → book → pay → review. Evidence: public plans sell tickets via Checkout (`EventPage` buy flow → `createBookingCheckoutSession`); campaign types + `CampaignInboxAdmin` kept. (`/experiences` + `ExperiencesPage` deleted in Phase 6; discovery is `/pass` + `/events`.) Gap: campaign still needs admin `live` before it appears.
- [ ] `partial` `p3-stay` AirPal Stay (commercial partners) — Done when: hotel/motel/serviced/hostel partners list rooms, availability, bookings. Evidence: `src/pages/StayPage.tsx`, `src/pages/HostPage.tsx`, `src/pages/ConciergePage.tsx`, `properties` rules. Gap: not a Stay booking marketplace; no residential STRA (correctly deferred).
- [ ] `todo` `p3-fashion` AirPal Fashion — Done when: brand campaign first, not P2P store. Evidence: none (copy-only mentions).
- [ ] `partial` `p3-daily` AirPal Daily — Done when: "What's happening near me?" drives plan/book/stay CTAs. Evidence: `src/pages/NowPage.tsx` composer + `HomePage` What's-on section. (`DiscoverPage` deleted in Phase 6.) Gap: Daily still isn't a separate transaction layer.
- [ ] `partial` `p3-travel` AirPal Travel orchestration — Done when: a trip can hold stay + experiences + events. Evidence: `src/pages/PlanHubPage.tsx`, `shared/plan.ts`, `trips` rules. Gap: plans ≠ marketplace trip.

---

## P4 — Infrastructure (`later` while P0 is incomplete)

- [ ] `todo` `p4-studio` AirPal Studio — Done when: B2B operating layer after consumer demand. Evidence: none (`StudioPage` lead form deleted in Phase 6).
- [ ] `partial` `p4-analytics` Funnel / GMV analytics — Done when: completed experiences, GMV, supply/demand are live admin views. Evidence: `shared/analytics.ts`, `functions/src/analytics.ts`. Gap: north-star from client buffer, not bookings.

---

## AirPal Business (bot target: `/airpal-business`)

Business is a dedicated dashboard on the **same** identity, listing, booking, payment, and review engine. Do not create a second user system.

- [ ] `partial` `biz-onboard` Apply / claim venue — Done when: Find venue → owner → verify claim → plan → sign-off writes a real partner record. Evidence: `partnerAccountPath` (`src/lib/partner-account.ts`) is the same login, then `src/pages/BusinessOnboardPage.tsx` (Google import) and `src/pages/BusinessShowcasePage.tsx`. Guests open the live place from What's on and search. Gap: plan prices are placeholders; Presence is a directory claim; Featured is clamped to domain/ABN proof. Stripe for Featured is not live.
- [ ] `partial` `biz-listing` Manage listing — Done when: owner edits place, hours, photos, deals; hours freshness SLA respected. Evidence: `src/pages/BusinessPage.tsx`, `shared/business.ts`, `listings` rules.
- [ ] `partial` `biz-campaign` Create Experience campaign — Done when: business funds an Experience, admin reviews, guests book through shared bookings. Evidence: `shared/campaign.ts`, `src/components/admin/CampaignInboxAdmin.tsx`, `createBookingForCampaign` bridge. (`BusinessCampaignsPage` deleted in Phase 6 — no campaign-create UI.) Gap: `paymentStatus: "deferred"` on the campaign row; RSVPs not `bookings`.
- [x] `done` `biz-bookings` Business booking inbox — Done when: owner sees/confirm/completes bookings for their listings/experiences. Evidence: `src/components/booking/BusinessBookingsSection.tsx`, `src/pages/BusinessPage.tsx`, `createBookingForCampaign` in `src/components/booking/BookingsSection.tsx`, `src/pages/EventPage.tsx` buy flow.
- [ ] `todo` `biz-payouts` Business payouts — Done when: Connect account + payout view. Evidence: —
- [ ] `todo` `biz-customers` Customers — Done when: owner sees attendees without private PII they should not have. Evidence: —
- [ ] `todo` `biz-reviews` Business reviews — Done when: listing/experience reviews from completed bookings. Evidence: —
- [ ] `todo` `biz-analytics` Business analytics — Done when: bookings, GMV, occupancy for **their** listings. Evidence: —
- [ ] `partial` `biz-verify` Admin/automated checks before publish — Done when: claim review + admin publish; no self-publish of paid supply. Evidence: `submitPartnerClaim` / `reviewPartnerClaim` in `functions/src/deals.ts`. Gap: not wired to event paid supply (organiser events publish without claim review).

---

## MVP acceptance test (canon B5 — plan loop, not the retired Mate loop)

A real user can:

- [x] `done` `mvp-signup` Sign up
- [ ] `partial` `mvp-profile` Create a profile
- [ ] `later` `mvp-apply` Apply as a Mate — retired with the Mate loop (Phase 6).
- [ ] `later` `mvp-approved` Be manually approved — retired (admin chain kept, gated, no supply).
- [ ] `later` `mvp-request` Create an activity request — retired with the Mate loop.
- [ ] `later` `mvp-discover` Discover an approved Mate — retired with the Mate loop.
- [ ] `later` `mvp-match` Match — retired with the Mate loop.
- [x] `done` `mvp-message` Message (plan thread + profile chat)
- [x] `done` `mvp-book` Book
- [x] `done` `mvp-pay` Pay — Checkout Session path live (`EventPage` buy flow); Stripe test card `4242` per `docs/managed-payments.md`.
- [x] `done` `mvp-complete` Complete the activity (plan here/done → memory → repeat)
- [x] `done` `mvp-review` Leave a review (private to the completed record)
- [x] `done` `mvp-report` Report / block
- [ ] `partial` `mvp-admin-lifecycle` Admin inspects and intervenes at every stage

The MVP is not complete until every row above is `done` (retired Mate rows excluded — the V1 loop is plans, per canon B1/B5).

---

## Next 3

1. `p0-payout` — prove a live Connect transfer on a real payout; then Pass store launch needs the G6 tickets/QR-entry loop proven on real events.
2. `p1-notify-controls` — still `todo`: user-mutable notification preferences before scaling push.
3. `biz-onboard` — venue claim still self-attested; tighten verify before paid supply.
