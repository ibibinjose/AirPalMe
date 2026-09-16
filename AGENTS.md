# AGENTS.md — AirPal.me

## 1. Product

AirPal.me — Life Made Easy.

AirPal is a trusted, people-powered marketplace and discovery platform connecting people with:

- People — AirPal Mate
- Places — AirPal Stay
- Experiences — AirPal Experiences
- Things — AirPal Fashion
- Discovery — AirPal Daily
- Trips — AirPal Travel

Brand mechanism: ME = Made Easy. The .me is intentional and part of the brand identity.

Core positioning: a trusted marketplace connecting people with people, places, things and experiences. Do not position AirPal publicly as six unrelated apps. One platform, verticals on one shared marketplace engine.

## 2. Critical Product Strategy

Build the marketplace engine first. Do not build all verticals as fully operational marketplaces at the same time.

Initial commercial wedge: AirPal Mate — Find someone to go with you. Initial launch market: Sydney, Australia.

The first objective is not downloads. It is Completed AirPal experiences. Prove this loop: Intent → Request → Match → Connect → Book → Meet/Experience → Complete → Review → Repeat. Expand into other verticals only after the core loop works.

## 3. App Information Architecture

Mobile-first navigation. Do not put every vertical into the bottom navigation.

Home answers "What are you looking for?" with primary actions: Find an AirPal, Find an Experience, Find a Stay, Discover what's happening, Explore Fashion, Plan a Trip. Hero CTA for MVP: Find someone to go with you. Secondary: nearby experiences, upcoming events, recommended AirPals, popular places, offers, saved items. Personalize only when appropriate and consented.

## 4. AirPal Mate — MVP Priority

Core proposition: I want to do something. I need someone to do it with.

Customer flow: account → profile → verify identity where required → request → browse/match → send/accept → message → select experience → book/pay if applicable → meet safely → complete → review → repeat.

Request fields: what, category, date, time, location, party size, budget, preferences, short description, payment-required flag, public/private, accessibility needs.

AirPal profile shows: photo, first name, general location (never exact home address), bio, interests, languages, activities, availability, verification badges, completed experiences, reviews, response rate, reliability, cancellation history where appropriate, joined date, safety/report controls. Age only where legally required. No unnecessary personal data.

## 5. AirPal Matching

Consider: activity, date/time, location, availability, interests, language, budget, experience type, preferences, trust/verification status. No opaque "compatibility score" as primary UX — use understandable reasons ("Available Saturday afternoon", "3 km from your area").

## 6. AirPal Mate Supply

Application required. Collect: identity, profile, interests, experience categories, availability, location area, languages, motivation, relevant experience, terms agreement, required verification. Statuses: Draft → Submitted → Under Review → Approved / Rejected, plus Suspended / Removed. Only approved Mates are active paid supply. Admin approval mandatory for MVP: view, review profile + verification, approve, reject, request info, suspend, remove, internal notes, audit history. Never rely solely on automation for final safety decisions.

## 7. Trust & Safety

Core product feature: identity verification where required, email/phone verification, report, block, moderation, incident management, admin review, payment protection, refund/dispute workflow, audit logs, safety guidance, age restrictions, privacy controls. For selected activities: safety check-in, emergency contact, meeting-place guidance, post-experience check-in. Never market AirPal as guaranteeing personal safety.

## 8. Messaging

Tied to a legitimate marketplace interaction: match conversation, booking conversation, system messages, report, block, safety info, timestamps, read state, moderation/report metadata. No personal phone/email exposure by default.

## 9. Bookings

Shared booking engine across verticals: customer, provider/mate/business, product/service, date/time, location, price, fees, payment status, booking status, cancellation policy, refund status, completion, review eligibility. Statuses: Pending → Confirmed → Cancelled / In Progress → Completed / Disputed → Refunded.

## 10. Payments

Marketplace architecture: Stripe, Stripe Connect for eligible providers, platform fee, provider payout, refunds, disputes, payment records. Never store raw card numbers. Keep financial records separate from profile data. Commission percentages configurable by admin, never hard-coded (platform_fee_percent, provider_fee_percent, minimum_platform_fee, payment_fee_handling, refund_policy).

## 11. AirPal Experiences

Next major expansion. Categories: Food, Culture, Fitness, Art, Music, Travel, Adventure, Classes, Wellness, Community, Fashion, Local activities. Provider flow: Apply → Create Experience → Admin Review → Publish → Receive Bookings → Deliver → Get Paid → Reviews. Every Experience: title, description, photos, provider, location, duration, capacity, price, dates, cancellation policy, requirements, accessibility, safety info, reviews. Key CTA: Going alone? Find an AirPal.

## 12. AirPal Stay

No generic Airbnb clone. Initial focus: hotels, motels, serviced apartments, hostels, boutique accommodation. Partner model: AirPal Stay Partner (distribution, booking management, listing, availability, pricing tools, marketing, reviews, support, AirPal Verified). Future tiers: Partner / Powered / Managed. Commercial before residential STRA; residential only with jurisdiction registration, exclusion-list, recordkeeping and platform requirements built first.

## 13. AirPal Fashion

Not an online clothing store. Concepts: Share, Rent, Swap, Style, Discover, brand collaborations. Flow: List → Verify → Match → Rent/Share → Payment → Return → Review. Items carry photos, brand, category, size, condition, availability, rental price, deposit, pickup/delivery, owner, reviews, damage/return rules. Brand model: AirPal Fashion Campaign (products, discounts, commission, budgets, creators, experiences, events). No peer-to-peer fashion as acquisition until trust and transactions prove out.

## 14. AirPal Daily

Local discovery layer, not a news company. Show events, experiences, deals, local activities, fashion drops, places, AirPal activities, community events. Primary question: What's happening near me? Daily content must drive transactions (find an AirPal, book, stay nearby, discover a business). No large editorial operation initially.

## 15. AirPal Travel

Orchestration layer over the existing network, not a separate product. A trip contains destination, dates, stay, experiences, events, Mates, fashion, places, itinerary.

## 16. Search & Discovery

One shared search system across people, experiences, stays, events, businesses, fashion, destinations. Contextual filters only, never a giant default list: location, date, category, price, availability, rating, verification, distance.

## 17. Profiles

Consumer: about, interests, experiences, bookings, reviews, saved, messages, wallet, preferences, verification, privacy, safety. Mate adds: categories, availability, completed experiences, ratings, reliability, approval status. Business adds: details, listings, experiences, stays, offers, bookings, reviews, analytics.

## 18. AirPal Business

Dedicated dashboard eventually: profile, listings, experiences, bookings, availability, offers, customers, reviews, payouts, analytics, campaigns. Onboarding: Apply → Verify → Admin/automated checks → Publish → Sell.

## 19. AirPal Studio

Future B2B operating layer: listings, experiences, campaigns, offers, events, customers, bookings, payments, payouts, analytics, content, advertising. Do not build the complete Studio before consumer demand proves out.

## 20. Admin Dashboard

First-class application: overview, users, active Mates, requests, matches, bookings, GMV, revenue, reports, incidents; user search/profile/verification/status/activity; mate applications lifecycle; marketplace requests/matches/bookings/cancellations/disputes; experiences providers/listings/moderation/bookings; stay partners/properties/rooms/availability/bookings; fashion items/owners/rentals/returns/disputes; daily content/events/promotions/moderation; finance payments/fees/payouts/refunds/disputes; safety reports/incidents/suspensions/evidence/notes/escalations; analytics funnel/retention/repeat/GMV/revenue/supply/demand/geography. Every status/payment/listing/booking/safety action auditable.
