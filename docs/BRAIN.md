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
5. Intelligence is quiet. It proposes a real plan. It does not sit on the product as a chatbot.
6. Money is taken when value is created. Ads are not the business.

---

## 3. Customer

**People new to a city who want people to do things with.**

That includes international students, migrants, backpackers, newcomers, young professionals, solo travellers, people new to Sydney, and locals widening their circle.

This is an acquisition beachhead. The brand is not "the migrant student app" and it is not "for everyone."

First city: Sydney. The same loop can open another city only after Sydney produces repeat completed experiences.

---

## 4. Problem

A person has time and an urge, and no simple way to turn that into a plan with a place and other people.

Directories list things. Social networks collect attention. Marketplaces list inventory. None of them own the step from "I feel like doing something" to "we went."

---

## 5. AirPal promise

Ask one question and make it easy to answer:

> **What do you want to do?**

Coffee, dinner, beach, hike, concert, festival, gym, explore the city, watch a game, museum, road trip, night out.

Then:

> **Who do you want to do it with?**

AirPal helps create the plan and get people there.

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

- Active users
- Plans created
- People connected
- Matches
- Bookings
- Attendance and completion
- Repeat experiences
- GMV and revenue
- Retention
- Cancellation rate
- Safety incidents
- Reviews
- Referral rate

If completed experiences per active user are flat, more screens will not fix the company.

---

## 8. Marketplace flywheel

More users → more plans → more demand → more Mates, hosts, and businesses → more experiences → better discovery → more completed experiences → more reviews and reputation → more trust → more users → more transactions → more revenue → more supply.

Around the wheel: data improves matching, matching improves experiences, experiences improve retention.

The wheel is weak if any of these is missing:

| Condition | Result |
| --- | --- |
| Great discovery, no people | Weak |
| Lots of people, nothing to do | Weak |
| Great experiences, no trust | Dangerous |
| A marketplace nobody completes | Broken economics |
| A polished app nobody repeats | A dead product |

The business equation:

> **Intent × Discovery × Connection × Transaction × Trust = AirPal**

---

## 9. Product architecture

Six layers. Build them in order. Do not build them at once.

### Layer 1 — AirPal Core

Identity, trust, profiles, Circles, messaging, notifications, reputation.

### Layer 2 — AirPal Plan

Intent, plans, invitations, matching, calendar, maps.

### Layer 3 — AirPal Marketplace

People, businesses, experiences, stays, offers, bookings, payments.

### Layer 4 — AirPal Discovery

What's on, events, places, Daily, deals, local discovery.

### Layer 5 — AirPal Travel

Trips, itineraries, stays, experiences, people, destinations.

### Layer 6 — AirPal Commerce

Fashion, products, rentals, memberships, partnerships.

Inside the product, the chain is:

**Person → Intent → Discovery → Match → Plan → Transaction → Experience → Reputation → Repeat**

### AirPal Mate

The first meaning of Mate is: **find an AirPal to do something with.**

- Social Mate — someone to spend time with
- Activity Mate — hike, gym, sport, photography
- Travel Mate — someone to explore or travel with
- Experience Mate — someone to attend something with
- Paid AirPal Companion — a later professional service

Do not lead the product with paid companionship. That pulls trust, safety, regulation, insurance, and public perception forward before the free plan loop is proven. The paid application and admin review that already exist stay in the product. They are not the front door.

---

## 10. Business model

AirPal is a connection, discovery, and transaction platform. Revenue starts when an experience actually happens.

1. **Transaction commission.** An experience is booked. AirPal takes a platform fee. The fee is admin-configurable. It is never a hard-coded percent.
2. **Business subscription.** A place pays for a stronger profile, bookings, offers, analytics, campaigns, and customer tools. The partner account is the same AirPal login plus a place guests can find.
3. **Promoted discovery.** A business pays to appear where someone is already deciding what to do.
4. **Membership.** Later: exclusive experiences, offers, priority matching, partner benefits.
5. **Sponsored experiences.** A brand sponsors an experience. That is not a banner ad.

No ad network before the loop has liquidity.

---

## 11. Trust principles

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

## 12. AI principles

Build AirPal Intelligence. Do not build an AirPal chatbot.

A person says: "I have Saturday afternoon free. What can I do?"

Intelligence may use location, time, interests, budget, weather, experiences, events, people, and distance, and answer with a few things they could actually do. Then: find people, create the plan, book if needed, go.

AI may suggest, search, draft, and help moderate. It does not remove people, close incidents, decide payment disputes, approve verification, or state legal conclusions. A human review stays available.

---

## 13. Growth principles

- Acquire through the beachhead in §3. One city. One question. One plan.
- A partner place exists so a plan has somewhere to go, on the same login.
- Invite the people already in a plan. That is the referral.
- Repeat use is another completed experience, not a streak or a feed.
- Open a second city only after Sydney shows repeat completion.
- Do not buy growth for a loop that does not complete.

---

## 14. Product priorities

| Priority | Job | Includes | Closed until the row above is real |
| --- | --- | --- | --- |
| P0 | Prove the loop | Plan → connect → experience → complete | — |
| P1 | Make it repeatable | Discovery, matching, messaging, calendar, notifications, reviews, doing it again | — |
| P2 | Monetize | Bookings, commission, paid experiences, business partnerships, premium | Ads |
| P3 | Expand | Stay as a marketplace, Travel, Fashion, offers, Daily as a media layer | — |
| P4 | Infrastructure | Studio, business SaaS, advertising, advanced AI, large marketplace tooling | A second native app |

Never start P3 or P4 while P0 is unproven.

What "proven" means: real people in Sydney, new to the city or widening their circle, create a plan, meet, and do it again. The count is completed experiences per active user.

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

A feature that only adds a tab, a vertical, or a second app fails this test while P0 is open.

---

## 19. 12-month strategy

The year is one loop in Sydney. Dates below are a sequence, not a promise of headcount.

**Months 1–3. Make the question the product.**
Home and Plan answer "what do you want to do?", then when, where, and who. A plan can be shared. A partner place can be found on the same login so the plan has a where. Count plans created and experiences completed. Do not open a new vertical.

**Months 4–6. Make people show up again.**
Reminders, messages tied to the plan, and a review after completion. The number that matters is completed experiences per active user, and whether the same people do it twice.

**Months 7–9. Charge when value happened.**
Commission on a booking that belongs to a real experience. Payouts for a provider who delivered. Business subscriptions stay behind a live place, not a brochure. No advertising.

**Months 10–12. Earn a second city, or stay in Sydney.**
A second city uses the same loop. Stay-as-marketplace, Fashion, Travel-as-a-product, Daily-as-media, Studio, and paid Companion stay behind the feature test. Paid Companion opens only after free plans complete safely and a human still approves supply.

---

## 20. Long-term vision

AirPal is how a person anywhere turns a few free hours into a real-world plan: what to do, who with, where, and then the memory of having done it.

People, places, experiences, things, and trips stay on one identity. The company is SarvamDaily Pty Ltd's AirPal business. The proof is still the same number: completed experiences per active user.

Not six apps. One experience network.

---

## How this document changes

The human asks, in plain language. Update this file in the same change as any product rule that contradicts it. Do not let a feature ship around the test in §18.
