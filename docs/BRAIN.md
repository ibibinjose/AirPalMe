# AirPal Brain

**Company:** SarvamDaily Pty Ltd, trading as AirPal.Me.
**Status:** Binding on product expansion. Established 22 September 2026.
**Shipped product freeze:** `docs/CANON.md`. Engineering and safety rules: `AGENTS.md`.

> **AirPal makes life easier by helping people discover what to do, find who to do it with, make a plan, and actually experience it.**

Internal operating principle:

> **Don't optimize for users. Optimize for completed experiences.**

This document is the gate against a feature pile. A new surface has to pass the decision test in §18 before it is built. Safety, security, payments, privacy, and the shipped freeze in `docs/CANON.md` still outrank growth.

---

## 1. Mission

AirPal exists to make it easier for people to turn an intention into a real-world experience.

The problem:

> **I want to do something, but I don't know what to do, where to go, or who to do it with.**

AirPal closes that gap.

---

## 2. First principles

1. Sell completed experiences. Downloads, followers, profiles, recommendations, and even bookings do not count if people do not show up.
2. One identity. People, places, experiences, things, and trips are supply and demand on that identity. They are not five companies.
3. One loop, proven, before the next layer.
4. Trust is infrastructure, because AirPal connects people who may not know each other.
5. Intelligence is quiet and actionable. It proposes real plans, assists guests 24/7, and connects people. It does not sit on the product as a gimmicky chatbot.
6. Communication is seamless. Built-in real-time AirPal Chat lets users, businesses, staying guests, and AirPal AI communicate directly.
7. Money is taken when value is created. Ads are not the business.

---

## 3. Customer

**People new to a city who want people to do things with, and travellers/guests seeking seamless real-world experiences.**

That includes international students, migrants, backpackers, newcomers, young professionals, solo travellers, hotel guests, people new to Sydney, and locals widening their circle.

This is an acquisition beachhead. The brand is not "the migrant student app" and it is not "for everyone."

First city: Sydney. The same loop can open another city only after Sydney produces repeat completed experiences.

---

## 4. Problem

A person has time and an urge, and no simple way to turn that into a plan with a place and other people.

Directories list things. Social networks collect attention. Marketplaces list inventory. None of them own the step from "I feel like doing something" to "we went."

Similarly, hotel and accommodation guests struggle with outdated binders and PDFs, lack 24/7 front desk access at 2am, and cannot easily discover vetted local activities.

---

## 5. AirPal promise

Ask one question and make it easy to answer:

> **What do you want to do?**

Coffee, dinner, beach, hike, concert, festival, gym, explore the city, watch a game, museum, road trip, night out.

Then:

> **Who do you want to do it with?**

AirPal helps create the plan and get people there.

For staying guests:

> **Everything for your stay in one scan.**

Digital compendium, 24/7 AirPal AI receptionist, in-room dining, 1-tap Wi-Fi, digital key code, housekeeping requests, and local recommendations.

---

## 6. Core loop

**Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat**

That is the company loop.

The product path that serves it:

1. What are you in the mood for?
2. When?
3. Where?
4. Who wants to join?
5. Create the plan.
6. AirPal helps make it happen.

A completed experience is someone who wanted something, made a plan, showed up, and can remember it.

---

## 7. North Star metric

**Completed AirPal Experiences per active user.**

Supporting metrics, in service of that number:

- Active users & qualified guest actions
- Plans created & RSVPs
- People connected & conversations started
- Matches & Mate requests
- Bookings (stays, dining, experiences)
- Attendance and completion
- Repeat experiences
- GMV and revenue
- Retention
- Cancellation rate
- Safety incidents & resolutions
- Reviews & ratings
- Referral rate

If completed experiences per active user are flat, more screens will not fix the company.

---

## 8. Marketplace flywheel

More users → more plans → more demand → more Mates, hosts, and businesses → more experiences → better discovery → more completed experiences → more reviews and reputation → more trust → more users → more transactions → more revenue → more supply.

Around the wheel: data improves matching, matching improves experiences, experiences improve retention.

The business equation:

> **Intent × Discovery × Connection × Transaction × Trust = AirPal**

---

## 9. Product architecture

Six layers. Build them in order. Do not build them at once.

### Layer 1 — AirPal Core
Identity, biometric authentication (Face ID / WebAuthn passkeys), trust, profiles (`/@handle`), Circles, real-time Universal Chat, notifications, reputation.

### Layer 2 — AirPal Plan
Intent, plans, invitations, matching, calendar, maps, collaborative trip planning.

### Layer 3 — AirPal Marketplace
People (AirPal Mate), businesses, experiences, stays (AirPal Stay & Digital Compendium), offers, bookings, payments.

### Layer 4 — AirPal Discovery
What's on, events, places, Daily, deals, local discovery.

### Layer 5 — AirPal Travel
Trips, itineraries, stays, experiences, people, destinations.

### Layer 6 — AirPal Commerce
Fashion, products, rentals, memberships, partnerships.

---

## 10. Universal AirPal Chat & Quiet Intelligence

AirPal includes a native, real-time Universal Chat system (`shared/messaging.ts`, `src/lib/chat-store.ts`) powering:

1. **User $\leftrightarrow$ User (Direct / Mates)**: Coordinate catch-ups, hangouts, and trips.
2. **User $\leftrightarrow$ Business / Venue**: Direct inquiries, reservations, and special requests.
3. **Guest $\leftrightarrow$ Stay Front Desk**: In-room dining orders, fresh towels, late checkout, and maintenance escalation.
4. **User/Guest $\leftrightarrow$ 24/7 AirPal AI**: Quiet, context-aware copilot providing instant answers (Wi-Fi, dining, hotel amenities, local secrets) without hallucinations.

---

## 11. AirPal Stay & Host Operating Model

### Digital Compendium (`/stay`, `/stay/:id`, `/concierge`, `/g/:id`)
Replaces paper binders and PDFs with a modern, mobile-first companion:
- **Digital Key / Door PIN Code**: Instant keypad access.
- **Welcome Drink Voucher**: Digital redemption at the hotel bar.
- **1-Tap Wi-Fi Copy**: Instant access with tactile feedback.
- **In-Room Dining**: Live menu cart with room delivery selection and kitchen staff ticket dispatch.
- **1-Tap Housekeeping**: Fast amenity requests (towels, pillow, room refresh, iron).
- **Express Check-In / Check-Out**: Fast room registration, stay folio settlement, luggage storage, and airport taxi booking.
- **24/7 AirPal AI Receptionist**: Multi-language AI concierge with automatic physical staff escalation.

### Host Operations Hub (`/host`)
- **Hotel Facilities Manager**: Full CRUD control to add/edit/delete amenities with custom hours, floor locations, and icons.
- **Staff Ticket Queue**: Live urgent/normal escalation board with 1-tap mark complete.
- **Live Dining Orders**: Kitchen order dispatch and room billing.
- **Menu Manager**: Pricing, availability toggles, and instant updates.

---

## 12. Business & Stay Public Link-in-Bio (`/@handle`)

Every business, venue, and stay receives a public presence on `AirPal.me/@handle`:
- Category badge and verified credentials.
- Digital Compendium and 24/7 Concierge launcher.
- Hotel facilities & amenities showcase.
- Direct booking link (`Book Direct`).
- 1-tap quick action deck: `[Chat on AirPal]`, `[Website]`, `[WhatsApp]`, `[Call]`, `[Directions]`.
- Trading hours schedule and live open status.

---

## 13. Trust principles

Trust is part of the marketplace, not a settings page added later.

Required, and already the direction of this repo:

- Identity verification where the activity requires it
- Email and phone verification
- Reviews tied to a completed experience
- Reputation a person can understand
- Report, block, moderation
- Safety guidance, without ever claiming AirPal guarantees personal safety
- Payment protection and dispute handling
- Admin intervention by a human
- Audit logs

A machine may help review. A machine does not give the final safety decision. Home addresses, verification documents, phone numbers, emails, and moderation notes stay private.

---

## 14. Product priorities

| Priority | Job | Includes | Closed until the row above is real |
| --- | --- | --- | --- |
| P0 | Prove the loop | Plan → connect → experience → complete | — |
| P1 | Make it repeatable | Discovery, matching, universal messaging, calendar, notifications, reviews, doing it again | — |
| P2 | Monetize | Bookings, commission, paid experiences, business partnerships, premium | Ads |
| P3 | Expand | Stay as a marketplace, Travel, Fashion, offers, Daily as a media layer | — |
| P4 | Infrastructure | Studio, business SaaS, advertising, advanced AI, large marketplace tooling | A second native app |

Never start P3 or P4 while P0 is unproven.

---

## 15. What AirPal is

The operating layer for going out, connecting, and experiencing the world.

A person opens AirPal and can say: "I'm here. I have three hours. I want to do something."

AirPal uses where they are, what they like, what is happening, who is available, and what they can afford, and turns that into a plan they can actually do.

One account. One engine. Places and partners on that same identity. A real-world experience network.

---

## 16. What AirPal is not

AirPal does not become:

- a social network
- an events directory
- a travel app with a marketplace attached
- a dating app
- a hotel clone
- a fashion store
- a news site
- a ride-share
- an AI chatbot with a marketplace attached
- six apps, or a second Studio app, before the loop is proven
- a product whose success is measured in downloads

The public brand stays one platform. The `.me` stays. Life Made Easy.

---

## 17. Decision framework

Before a team builds something, the founder asks:

> **What evidence says this needs to exist?**

"Wouldn't it be cool if AirPal had this?" is not evidence.

Evidence is a broken step in the loop: people cannot discover, cannot find someone, cannot make the plan, do not show up, do not trust it, or cannot pay for a completed experience.

Conflict order when documents disagree:

1. Safety, security, privacy, and payment integrity (`AGENTS.md`)
2. Shipped chrome, auth, and identity (`docs/CANON.md`)
3. This Brain, on what to build next
4. Older vertical plans inside `AGENTS.md` that pull the product into another layer

---

## 18. Feature evaluation framework

Every feature has to answer:

1. Does it help someone discover something?
2. Does it help them connect?
3. Does it help them make a plan?
4. Does it help complete the experience?
5. Does it increase trust?
6. Does it create measurable business value?

If the answer is no to most of these, do not build it.

---

## 19. Long-term vision

AirPal is how a person anywhere turns a few free hours into a real-world plan: what to do, who with, where, and then the memory of having done it.

People, places, experiences, things, and trips stay on one identity. The company is SarvamDaily Pty Ltd's AirPal business. The proof is still the same number: completed experiences per active user.

Not six apps. One experience network.
