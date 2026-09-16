# AirPal build checklist

Last audited: 2026-09-16 (local .env + Mate inbox)
North star: Completed AirPal Experiences (not downloads).
Marking rules: `.grok/skills/airpal-build/SKILL.md`. Product rules: `AGENTS.md`.

Status is the second token: `done` | `partial` | `todo` | `later`.
Only `done` is checked.

---

## P0 — Required for the transaction

### Identity

- [ ] `partial` `p0-auth` Sign-up / sign-in — Done when: email+password, phone SMS, email verify, session shared across verticals. Evidence: `src/contexts/AuthContext.tsx`, `src/pages/StartPage.tsx`, `src/lib/phone-auth.ts`. Gap: no government IDV; anonymous guests still used for browse.
- [ ] `todo` `p0-idv` Identity verification where required — Done when: Mate supply cannot reach `approved` without the required ID check, admin can review docs privately. Evidence: —
- [ ] `partial` `p0-profile` Consumer profile — Done when: about, interests, general location (not home address), photo, verification badges, privacy/safety controls. Evidence: `src/pages/MePage.tsx`, `src/pages/BioSetupPage.tsx`, `src/contexts/BioContext.tsx`. Gap: no wallet, no response-rate/reliability, Mate public profile incomplete.

### Mate supply (application)

- [x] `done` `p0-mate-apply` Mate application — Done when: anyone can apply with identity, interests, categories, availability, location area, motivation, terms. Evidence: `src/pages/CompanionPage.tsx`, `shared/companion.ts`, `companion_applications` in `firestore.rules`.
- [x] `done` `p0-admin-approve` Admin approval of Mates — Done when: human can view, approve, reject, request info, suspend; only `approved` is paid supply. Evidence: `src/components/admin/CompanionAdmin.tsx`. Gap worth a later row: remove-from-platform + full audit on every transition.

### Mate demand (request → match → connect)

- [x] `done` `p0-mate-request` Create activity request — Done when: what, category, date, time, location, party size, budget persist to `mate_requests`. Evidence: `src/pages/MateRequestPage.tsx`, `shared/mate-request.ts`.
- [ ] `partial` `p0-mate-discover` Discover approved Mates — Done when: requester sees approved Mates with understandable reasons (availability, area, interests), never a mystery score. Evidence: `src/pages/MatePage.tsx`. Gap: no browse/match-reason UI; matching is admin-only.
- [ ] `partial` `p0-match` Match send/accept — Done when: admin (MVP) or Mate can assign/accept; request becomes `matched` with `matchedMateUid`. Evidence: `src/components/admin/MateRequestsAdmin.tsx`, assigned inbox + `matchReasons()` on `src/pages/MatePage.tsx`. Gap: Mate still cannot accept an open request themselves; admin assigns first.
- [ ] `partial` `p0-message` On-platform messaging — Done when: match conversation with timestamps, read state, no phone/email in the thread. Evidence: `src/components/messaging/ChatBox.tsx`, `shared/messaging.ts`, `request_chats` rules. Gap: no system messages, no report/block from thread, no booking conversation.

### Book → pay → complete → review

- [ ] `partial` `p0-book` Shared booking engine — Done when: customer/provider/date/location/price/fees/status live on `bookings`; statuses Pending → Confirmed → Cancelled / In Progress → Completed / Disputed → Refunded. Evidence: `shared/booking.ts`, `src/components/booking/BookingsSection.tsx`, `bookings` rules. Gap: `paymentStatus` is always `"deferred"`; fee bps hard-coded in `PLATFORM_FEE_BPS`.
- [ ] `todo` `p0-pay` Payments (Stripe) — Done when: Mate booking charges through the platform, no raw cards stored, fees from admin config not literals. Evidence: `functions/src/stripe.ts` is experience-plan checkout only.
- [ ] `todo` `p0-payout` Provider payouts — Done when: Stripe Connect for eligible Mates/businesses, payout records separate from profiles. Evidence: —
- [ ] `partial` `p0-review` Reviews on completed bookings — Done when: both sides review after `completed`, reportable, no algorithmic trust score. Evidence: rating fields on `mate_requests` in `src/pages/MatePage.tsx`. Gap: requester-only; not gated on booking completion; no badges.

### Trust, admin, notifications

- [x] `done` `p0-report` Report — Done when: user can file a safety report that opens an admin case. Evidence: `src/components/safety/SafetyMenu.tsx`, `shared/safety.ts`, `src/components/admin/SafetyInboxAdmin.tsx`.
- [x] `done` `p0-block` Block — Done when: block is immediate and persisted. Evidence: `SafetyMenu` + `blocks` in `firestore.rules`.
- [ ] `partial` `p0-notify` Event notifications — Done when: match, message, booking, application-status events fire with user controls. Evidence: FCM for host tickets (`src/lib/tickets-push.ts`); local companion notifications. Gap: no Mate-loop events.
- [ ] `partial` `p0-admin` Admin dashboard — Done when: operators can inspect users, Mates, requests, matches, bookings, reports, incidents and intervene. Evidence: `src/pages/AdminPage.tsx` + admin components. Gap: no user search/verification, GMV, finance, disputes.
- [x] `done` `p0-audit` Audit log — Done when: status/safety/booking admin actions write `admin_audits`. Evidence: `src/lib/admin-audit.ts`, `src/components/admin/AuditTrailAdmin.tsx`.

---

## P1 — Required for usability

- [ ] `partial` `p1-search` Shared search — Done when: one search across people, experiences, stays, events, businesses. Evidence: `src/components/search/GlobalSearchModal.tsx`. Gap: no people/Mates.
- [ ] `partial` `p1-filters` Contextual filters — Done when: location/date/category/price appear only when relevant. Evidence: `src/components/discovery/FilterChips.tsx`.
- [ ] `partial` `p1-saved` Saved items — Done when: one saved model across verticals. Evidence: `users/{id}/savedEvents`, `savedStalls`. Gap: not generic `saved_items`.
- [ ] `partial` `p1-cancel` Cancellation flow — Done when: customer/provider cancel with visible policy. Evidence: `canCustomerCancel` in `shared/booking.ts`. Gap: no policy copy, no fees.
- [ ] `todo` `p1-notify-controls` Notification preferences — Done when: user can mute types. Evidence: —

---

## P2 — Growth (`later` until P0 pay exists)

- [ ] `later` `p2-referrals` Referrals — why later: P0 payments unbuilt.
- [ ] `later` `p2-promos` Promotions / coupons — why later: P0 payments unbuilt.
- [ ] `later` `p2-membership` AirPal Plus membership — why later: core loop unproven.

---

## P3 — Expansion (`later` unless the user named the vertical)

- [ ] `partial` `p3-experiences` AirPal Experiences — Done when: provider apply → create → admin review → publish → book → pay → review, plus "Going alone? Find an AirPal." Evidence: `src/pages/ExperiencesPage.tsx`, `shared/campaign.ts`, plan Stripe checkout. Gap: RSVP is not the shared booking engine; payment deferred on campaigns.
- [ ] `partial` `p3-stay` AirPal Stay (commercial partners) — Done when: hotel/motel/serviced/hostel partners list rooms, availability, bookings. Evidence: `src/pages/StayPage.tsx`, `src/pages/HostPage.tsx`, `src/pages/ConciergePage.tsx`, `properties` rules. Gap: not a Stay booking marketplace; no residential STRA (correctly deferred).
- [ ] `todo` `p3-fashion` AirPal Fashion — Done when: brand campaign first, not P2P store. Evidence: none (copy-only mentions).
- [ ] `partial` `p3-daily` AirPal Daily — Done when: "What's happening near me?" drives Mate/book/stay CTAs. Evidence: `src/pages/DiscoverPage.tsx`. Gap: home is discovery, not the Mate hero CTA.
- [ ] `partial` `p3-travel` AirPal Travel orchestration — Done when: a trip can hold stay + experiences + Mate + events. Evidence: `src/pages/PlanHubPage.tsx`, `shared/plan.ts`, `trips` rules. Gap: plans ≠ marketplace trip.

---

## P4 — Infrastructure (`later` while P0 is incomplete)

- [ ] `partial` `p4-studio` AirPal Studio — Done when: B2B operating layer after consumer demand. Evidence: `src/pages/StudioPage.tsx` walkthrough lead form only.
- [ ] `partial` `p4-analytics` Funnel / GMV analytics — Done when: completed experiences, GMV, supply/demand are live admin views. Evidence: `shared/analytics.ts`, `functions/src/analytics.ts`. Gap: north-star from client buffer, not bookings.

---

## AirPal Business (bot target: `/airpal-business`)

Business is a dedicated dashboard on the **same** identity, listing, booking, payment, and review engine. Do not create a second user system.

- [ ] `partial` `biz-onboard` Apply / claim venue — Done when: Find venue → owner → verify claim → plan → sign-off writes a real partner record. Evidence: `src/pages/BusinessOnboardPage.tsx`, `shared/business-onboarding.ts`. Gap: plans are placeholder prices; verify is self-attested.
- [ ] `partial` `biz-listing` Manage listing — Done when: owner edits place, hours, photos, deals; hours freshness SLA respected. Evidence: `src/pages/BusinessPage.tsx`, `shared/business.ts`, `listings` rules.
- [ ] `partial` `biz-campaign` Create Experience campaign — Done when: business funds an Experience, admin reviews, guests book through shared bookings. Evidence: `src/pages/BusinessCampaignsPage.tsx`, `src/components/admin/CampaignInboxAdmin.tsx`. Gap: `paymentStatus: "deferred"`; RSVPs not `bookings`.
- [ ] `todo` `biz-bookings` Business booking inbox — Done when: owner sees/confirm/completes bookings for their listings/experiences. Evidence: —
- [ ] `todo` `biz-payouts` Business payouts — Done when: Connect account + payout view. Evidence: —
- [ ] `todo` `biz-customers` Customers — Done when: owner sees attendees without private PII they should not have. Evidence: —
- [ ] `todo` `biz-reviews` Business reviews — Done when: listing/experience reviews from completed bookings. Evidence: —
- [ ] `todo` `biz-analytics` Business analytics — Done when: bookings, GMV, occupancy for **their** listings. Evidence: —
- [ ] `partial` `biz-verify` Admin/automated checks before publish — Done when: claim review + admin publish; no self-publish of paid supply. Evidence: `submitPartnerClaim` / `reviewPartnerClaim` in `functions/src/deals.ts`. Gap: not wired to Mate/Experience paid supply.

---

## MVP acceptance test (AGENTS.md §30)

A real user can:

- [x] `done` `mvp-signup` Sign up
- [ ] `partial` `mvp-profile` Create a profile
- [x] `done` `mvp-apply` Apply as a Mate
- [x] `done` `mvp-approved` Be manually approved
- [x] `done` `mvp-request` Create an activity request
- [ ] `partial` `mvp-discover` Discover an approved Mate
- [ ] `partial` `mvp-match` Match
- [ ] `partial` `mvp-message` Message
- [ ] `partial` `mvp-book` Book
- [ ] `todo` `mvp-pay` Pay
- [ ] `partial` `mvp-complete` Complete the activity
- [ ] `partial` `mvp-review` Leave a review
- [x] `done` `mvp-report` Report / block
- [ ] `partial` `mvp-admin-lifecycle` Admin inspects and intervenes at every stage

The MVP is not complete until every row above is `done`.

---

## Next 3

1. `p0-pay` — charge Mate bookings through Stripe; stop hard-coding fees.
2. `p0-match` — let an approved Mate accept an open request (callable + rules), not only admin assign.
3. `p0-review` — both-sides review, only after booking `completed`.
