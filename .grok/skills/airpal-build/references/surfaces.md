# Existing surfaces (reuse these)

Inspect the path before creating a sibling. Shared domain types live in `shared/` and are imported as `@shared/...`. Binding truth: `docs/AIRPAL.md`. Re-audited October 2026 (post Phase 6 teardown + two-app shells).

## App shell

| Surface       | Path                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| Routes        | `src/app/routes.tsx`                                                    |
| Providers     | `src/app/providers.tsx`                                                 |
| Bottom tabs   | `src/components/layout/TabBar.tsx`, `src/lib/tabs.ts`                   |
| App flavor    | `src/lib/app-flavor.ts` (`me.airpal.app` vs `me.airpal.pass`)           |
| Global search | `src/components/search/GlobalSearchModal.tsx`                           |
| Auth gate     | `src/components/auth/NativeAuthGate.tsx`, `src/lib/native-auth-gate.ts` |

Shipped dock: Home / Now / Plan / Inbox / Me (+ CreateFab for Scan & create). Pass shell dock: Pass / Events / Tickets / Scan / Me. Do not dump every vertical into the tab bar.

## Plan loop (the P0 transaction)

| Piece          | Path                                                                         | Collection                                  |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| Plan hub       | `src/pages/PlanHubPage.tsx`, `shared/plan.ts`                                | `plans`                                     |
| Create wizard  | `src/pages/PlanCreatePage.tsx`                                               | `plans`                                     |
| Thread         | `src/pages/PlanDetailPage.tsx`, `src/components/plan/InvitationCard.tsx`     | `plans`, plan messages                      |
| Edit / manage  | `src/pages/PlanEditPage.tsx`, `src/components/plan/PlanManageSheet.tsx`      |                                             |
| Invite / RSVP  | `src/components/plan/PlanShareModal.tsx`, `PlanRsvpSheet.tsx`, `PlanQrModal` | guestList, invites                          |
| Circle invite  | `src/lib/circle.ts` (lib only — no Circle page)                              | `follows`, `likes`, `presence`, `referrals` |
| Plan callables | `functions/src/plans.ts`                                                     |                                             |
| Spec           | `docs/plan-prd.md`                                                           |                                             |

## Companion / mate-request admin chain (G6-gated — no consumer UI)

Consumer Mate surfaces (`/mate`, `/companion`, Mate/MateRequest/Companion pages) were deleted in Phase 6. What remains is gated-return machinery only:

| Piece         | Path                                         | Collection               |
| ------------- | -------------------------------------------- | ------------------------ |
| Request types | `shared/mate-request.ts`                     |                          |
| Supply types  | `shared/companion.ts`                        |                          |
| Live supply   | `src/lib/companion-remote.ts`                | `companion_applications` |
| Supply admin  | `src/components/admin/CompanionAdmin.tsx`    |                          |
| Match admin   | `src/components/admin/MateRequestsAdmin.tsx` |                          |

Never rebuild consumer Mate UI from these. Strangers return only per canon G6 evidence gates.

## Tickets / events / deals (Pass)

| Piece             | Path                                                                                   | Collection                                               |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Pass hub          | `src/pages/PassPage.tsx`                                                               |                                                          |
| Events catalog    | `src/pages/EventsPage.tsx`, `src/pages/EventPage.tsx`                                  | `events`                                                 |
| Organiser create  | `src/pages/OrganiserEventPage.tsx` (`/event`, `/event/new`)                            | `events`                                                 |
| Passbook          | `src/pages/MyTicketsPage.tsx`, `src/pages/TicketPage.tsx`                              | `bookings`                                               |
| Door scanner      | `src/pages/ScanPage.tsx`                                                               | scans                                                    |
| Bookings UI       | `src/components/booking/BookingsSection.tsx`, `TicketPass.tsx`, `TicketSalesPanel.tsx` | `bookings`                                               |
| Booking types     | `shared/booking.ts`                                                                    |                                                          |
| Events/tickets fn | `functions/src/events.ts`, `functions/src/tickets.ts`                                  |                                                          |
| Promotions        | `src/pages/PromotionsPage.tsx`, `PromotionDetailPage.tsx` (giveaway                    | promotion kinds), `src/pages/BusinessPromotionsPage.tsx` | `promotions` |
| Deal callables    | `functions/src/deals.ts`                                                               |                                                          |
| Wallet passes     | `src/lib/wallet.ts`, `functions/src/wallet.ts`, `functions/src/google-wallet.ts`       |                                                          |

`/promotions`, `/giveaways`, `/offers`, `/birthday-freebies` redirect to `/deals`; `/events` + `/deals` are the live discovery surfaces.

## Trust

| Piece             | Path                                        | Collection                 |
| ----------------- | ------------------------------------------- | -------------------------- |
| Report / block UI | `src/components/safety/SafetyMenu.tsx`      | `safety_reports`, `blocks` |
| Safety types      | `shared/safety.ts`                          |                            |
| Safety admin      | `src/components/admin/SafetyInboxAdmin.tsx` |                            |
| Audit write       | `src/lib/admin-audit.ts`                    | `admin_audits`             |
| Audit admin       | `src/components/admin/AuditTrailAdmin.tsx`  |                            |

## Business

| Piece              | Path                                                                      | Collection                  |
| ------------------ | ------------------------------------------------------------------------- | --------------------------- |
| Business workspace | `src/pages/BusinessPage.tsx`                                              | `listings`                  |
| Onboard            | `src/pages/BusinessOnboardPage.tsx`                                       | partner claims              |
| Showcase           | `src/pages/BusinessShowcasePage.tsx`                                      | bio catalog                 |
| Google import      | `src/components/business/GooglePlaceImport.tsx`, `shared/google-place.ts` | Places API (New)            |
| Onboard types      | `shared/business-onboarding.ts`                                           |                             |
| Listing types      | `shared/business.ts`                                                      | `listings`, `partnerVenues` |
| Subscriptions      | `src/components/business/BusinessSubscriptionCard.tsx`                    | Stripe                      |
| Listing callables  | `functions/src/listings.ts`                                               |                             |

`BusinessCampaignsPage`, `ExperiencesPage`, `EventCreatePage`, `StudioPage` were deleted in Phase 6 — do not reference them as live.

## Now / Stay / Circle / Wave

| Piece            | Path                                                                               | Collection                                  |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| Now composer     | `src/pages/NowPage.tsx` (`/now`; `/explore` `/discover` `/search` redirect here)   | `places`, live events                       |
| Concierge / Stay | `src/pages/ConciergePage.tsx`, `src/pages/StayPage.tsx`                            | `properties`                                |
| Host             | `src/pages/HostPage.tsx`                                                           | `properties`                                |
| Circle (lib)     | `src/lib/circle.ts` (no page)                                                      | `follows`, `likes`, `presence`, `referrals` |
| I’m here         | `src/components/circle/CircleHereSheet.tsx`, `shared/here.ts`                      | `here_pins`, `here_shares`                  |
| Wave             | `src/components/wave/WaveHostCard.tsx`, `src/pages/WavePage.tsx`, `shared/wave.ts` | `waves`, `wave_here`, `wave_hits`           |
| Inbox            | `src/pages/InboxPage.tsx`, `src/components/notifications/NotificationBell.tsx`     | `promotion_notifications`                   |
| Chat UI          | `src/components/messaging/ChatBox.tsx`, `AirPalChatModal.tsx`                      | conversation messages                       |
| Chat types       | `shared/messaging.ts`                                                              |                                             |

`DiscoverPage`, `CirclePage`, `CircleAnnounceSheet` were deleted in Phase 6.

## Auth / admin / money

| Piece                                 | Path                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Auth                                  | `src/contexts/AuthContext.tsx`, `src/pages/StartPage.tsx`               |
| Admin home                            | `src/pages/AdminPage.tsx`                                               |
| Stripe (Checkout + Connect + webhook) | `functions/src/stripe.ts`, `src/components/connect/PayoutSetupCard.tsx` |
| Managed payments                      | `functions/src/managed-payments.ts`                                     |
| Rules                                 | `firestore.rules`, `storage.rules`                                      |
| Function barrel                       | `functions/src/index.ts`                                                |
| Client callable wrappers              | `src/lib/functions.ts`                                                  |

## Conventions

- Domain validation in `shared/*.ts` with `*.test.ts` next to it. UI does not invent status strings.
- Privileged writes (approval, payouts, property ACL, Connect) go through `functions/src`. Client writes only what rules already allow.
- Live Firestore + honest empty states. Seeds are migration sources, never rendered as real supply.
- Sydney clock: `src/contexts/LocalNowContext.tsx` (+ `src/hooks/useLocalNow.ts`), `src/lib/local-time.ts`.
