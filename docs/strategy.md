# AirPal.me — Product Strategy (repo blueprint)

Source: founder's Business Model, Plan & Strategy. This file translates it into build decisions for this repo.

## Company

**AirPal.me — Life Made Easy.** (ME = Made Easy.)
A trusted marketplace connecting people with people, places, things and experiences.
One marketplace engine (identity + discovery + marketplace + trust + payments + community), many verticals.

## Wedge and sequence

1. **Mate** — find someone to go with you. (The wedge. Sydney first.)
2. **Experiences** — businesses list paid activities; attach "Going alone? Find an AirPal."
3. **Stay** — commercial accommodation partners first (hotels, motels, serviced apartments, hostels). No residential STRA until legal architecture exists.
4. **Fashion** — brand collaborations first, then share/rent/swap.
5. **Daily** — discovery layer feeding the marketplace, never a standalone news product.
6. Travel, AirPal Studio (B2B), AirPal Plus (membership) — only after repeat transactions prove out.

Never launch verticals simultaneously. Every new surface must reuse the same identity, wallet, messaging, review and booking infrastructure.

## The Mate loop (the transaction that matters)

Request (what/when/where/how many/budget) → Match (approved Mates only) → Connect (on-platform messaging)
→ Book (platform payment) → Meet (safety check-ins) → Complete → Review both sides → Repeat (rebook).

Supply side is manually approved: pending → review → approved/active, with suspend/remove. No instant stranger-meetings.

## Trust (core product, not a policy page)

Identity verification, real profiles, transaction-based reviews, platform-controlled payments,
on-platform messaging, reporting + blocking, admin cases with audit logs, safety check-ins,
structured incidents. Visible badges over mystery scores: Identity Verified, AirPal Approved,
Reliable, Top Rated, Experienced.

## Money

Start: 15% platform fee, Mate receives 85%. Aim transactions at $50–$250 (cheap coffee meetups
don't carry the business). Later: membership, business campaigns/subscriptions, sponsored discovery.

## Measures that matter

North star: completed experiences per active user per month. Weekly: requests, matches, bookings,
completion rate, repeat-booking rate, GMV, take rate, response/cancellation rates, reports/incidents/refunds.
First milestone: 100 successful transactions by hand if needed. Downloads and followers are vanity.

## Current-app gaps (Sep 2026)

- Founder call: Explore/Discover stays home; Mate lives at `/mate` with its request loop. Revisit the wedge when transaction data supports it.
- `/companion` is an application form only — no request/match/book/pay/review loop exists.
- No Sydney beachhead focus in IA (Inner West → CBD → Eastern Suburbs density strategy unbuilt).
- Business onboarding (`/business/onboard`) exists; Experiences + Stay-partner booking economics unbuilt.
- Launch campaign asset ("Don't Go Alone") and founding-100 tooling unbuilt.

## Build rules from this strategy

- Mate loop entities (`mate_requests`, `matches`, `bookings`, `payments`, `reviews`, `payouts`) come before any new vertical UI.
- Every vertical reuses core collections; no parallel identity/wallet/chat systems.
- Paid paths always go through platform payments (Stripe Connect), never direct transfers.
- Sydney zoned time everywhere; empty states stay honest when Firestore is empty.
