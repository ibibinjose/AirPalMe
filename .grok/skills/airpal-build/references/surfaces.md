# Existing surfaces (reuse these)

Inspect the path before creating a sibling. Shared domain types live in `shared/` and are imported as `@shared/...`.

## App shell

| Surface | Path |
|---|---|
| Routes | `src/app/routes.tsx` |
| Providers | `src/app/providers.tsx` |
| Bottom tabs | `src/components/layout/TabBar.tsx`, `src/lib/tabs.ts` |
| Global search | `src/components/search/GlobalSearchModal.tsx` |

Guest tabs today: Explore / Plan / Scan / Stay. Mate is `/mate`, not a fifth tab. Do not dump every vertical into the tab bar.

## Mate loop

| Piece | Path | Collection |
|---|---|---|
| Demand home | `src/pages/MatePage.tsx` | `mate_requests` |
| Request form | `src/pages/MateRequestPage.tsx` | `mate_requests` |
| Request types | `shared/mate-request.ts` | |
| Supply apply | `src/pages/CompanionPage.tsx` | `companion_applications` |
| Supply types | `shared/companion.ts` | |
| Supply admin | `src/components/admin/CompanionAdmin.tsx` | |
| Match admin | `src/components/admin/MateRequestsAdmin.tsx` | |
| Chat UI | `src/components/messaging/ChatBox.tsx` | `request_chats/{id}/messages` |
| Chat types | `shared/messaging.ts` | |
| Bookings UI | `src/components/booking/BookingsSection.tsx` | `bookings` |
| Booking types | `shared/booking.ts` | |

## Trust

| Piece | Path | Collection |
|---|---|---|
| Report / block UI | `src/components/safety/SafetyMenu.tsx` | `safety_reports`, `blocks` |
| Safety types | `shared/safety.ts` | |
| Safety admin | `src/components/admin/SafetyInboxAdmin.tsx` | |
| Audit write | `src/lib/admin-audit.ts` | `admin_audits` |
| Audit admin | `src/components/admin/AuditTrailAdmin.tsx` | |

## Business / Experiences / Studio

| Piece | Path | Collection |
|---|---|---|
| Business dashboard | `src/pages/BusinessPage.tsx` | `listings` |
| Onboard | `src/pages/BusinessOnboardPage.tsx` | partner claims |
| Onboard types | `shared/business-onboarding.ts` | |
| Listing types | `shared/business.ts` | `listings`, `partnerVenues` |
| Campaigns UI | `src/pages/BusinessCampaignsPage.tsx` | `campaigns`, `campaign_rsvps` |
| Campaign types | `shared/campaign.ts` | |
| Campaign admin | `src/components/admin/CampaignInboxAdmin.tsx` | |
| Guest experiences | `src/pages/ExperiencesPage.tsx` | `campaigns` |
| Studio lead form | `src/pages/StudioPage.tsx` | `studio_walkthroughs` |
| Listing callables | `functions/src/listings.ts` | |
| Deal / claim callables | `functions/src/deals.ts` | |

## Stay / Daily / Plans

| Piece | Path | Collection |
|---|---|---|
| Discover (Daily-like) | `src/pages/DiscoverPage.tsx` | `places`, `nearbyEvents` |
| Concierge / Stay | `src/pages/ConciergePage.tsx`, `src/pages/StayPage.tsx` | `properties` |
| Host | `src/pages/HostPage.tsx` | `properties` |
| Plans | `src/pages/PlanHubPage.tsx`, `shared/plan.ts` | `plans` |
| Plan callables | `functions/src/plans.ts` | |

## Auth / admin / money

| Piece | Path |
|---|---|
| Auth | `src/contexts/AuthContext.tsx`, `src/pages/StartPage.tsx` |
| Admin home | `src/pages/AdminPage.tsx` |
| Stripe (experience plans only) | `functions/src/stripe.ts` |
| Rules | `firestore.rules`, `storage.rules` |
| Function barrel | `functions/src/index.ts` |
| Client callable wrappers | `src/lib/functions.ts` |

## Conventions

- Domain validation in `shared/*.ts` with `*.test.ts` next to it. UI does not invent status strings.
- Privileged writes (approval, payouts, property ACL, Connect) go through `functions/src`. Client writes only what rules already allow.
- Live Firestore + honest empty states. Seeds are migration sources, never rendered as real supply.
- Sydney clock: `src/hooks/useLocalNow.ts`, `src/lib/local-time.ts`.
