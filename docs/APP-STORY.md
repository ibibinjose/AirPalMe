# AirPal.me — What the App Does, Segments & Flows

> One line: AirPal turns **"I want to do something"** into a real experience —
> find **what**, find **who with**, make the **plan**, **go**.
> Tagline: Life Made Easy. The `.me` is the brand.

This is the plain-language map of the product. Engineering rules live in
`AGENTS.md`, the shipped freeze in `docs/CANON.md`, expansion gates in
`docs/BRAIN.md`. If they disagree, safety and the canon win over this story.

---

## 1. What this app does

**The problem.** A person has free time and an urge — but no simple way to
turn it into a plan with a place and other people. Directories list things.
Social apps collect attention. Nobody owns the step from
"I feel like doing something" to "we went."

**The job.** One loop, proven in Sydney first:

```text
Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat
```

**The proof.** Not downloads. The North Star is
**Completed AirPal Experiences per active user** — someone wanted something,
made a plan, showed up, and can remember it.

**Two doors in.** Website guests browse and scan with no account.
Native iOS/Android asks for sign-in first, then lands on Home.

---

## 2. Who it serves (audiences)

| Segment | Who they are | What they get |
|---|---|---|
| Guests (web, no account) | Anyone curious; hotel guests via QR | Browse, scan, tonight near you, public plans |
| Members (account, 18+) | New in city, students, migrants, solo travellers, locals | Mate requests, bookings, tickets, chat, memories |
| Mates (approved supply) | Vetted locals who join outings | Requests to accept, chats, payouts, reputation |
| Businesses & Hosts | Venues, stays, organisers | Listings, rooms, events, orders, payouts, analytics |
| Admins | AirPal trust team | Review, approve, moderate, refund, audit — always human |

One account across everything. A personal `@handle` stays a person; a
business is a separate profile on the same login.

## 3. Product segments (one engine, ordered)

One marketplace engine — Identity → Trust → Discovery → Matching →
Booking → Payment → Experience → Reputation. Verticals plug into it,
never as separate apps. Build order follows the Brain (P0 first):

| # | Segment | Answers | Home surface |
|---|---|---|---|
| 1 | Core | Who am I / who do I trust? | `@handle`, Circle, Inbox, verification, reviews |
| 2 | Plan | What are we doing, when, where, who? | Trips tab (`/plan`), invites, RSVP, calendar |
| 3 | Mate (People) | Who will go with me? | `/mate`, requests, matching, mate chat |
| 4 | Discovery | What's happening near me? | Home + Explore, events, places, guides |
| 5 | Stay (Places) | Where do I sleep / what's here? | Concierge, compendium, `/g/:id`, host tools |
| 6 | Experiences | What can I book into? | `/experiences`, festivals, tickets |
| 7 | Travel / Fashion / Commerce | Trips, drops, rentals | Later — only after the loop repeats |

**Navigation.** Five tabs, in order: Home `/` · Explore `/explore` ·
Trips `/plan` · Inbox `/me/inbox` · Me `/me`. One global **+ Create**
(Make a Plan, Find a Mate, Host an Event, Pulse, Scan, Business Hub).
Everything else is a route reached in ≤2 taps — never a sixth tab.

## 4. End-to-end flows

**F1 — First-time guest (30 seconds, no account).**
Open `/` → "What do you want to do?" → tonight near you → first aha
(Wi-Fi answer, event, place). Sign-in appears only on write actions.

**F2 — Plan with friends.**
`/plan/new` (What / When / Where / Who) → stops, votes, comments →
invite link `/invite/:code` → RSVPs → go → check-in → memories.
Public plans pin to the Explore map.

**F3 — Mate loop (the wedge).**
`/mate/request` (what, when, where, party, budget) → approved Mate
accepts → match chat (`request_chats`) → in-thread Book / Make a Plan
→ Stripe pay → meet in public → dual review → repeat.

**F4 — Stay guest (scan-first).**
Scan room QR → `/g/:id` session on device → 1-tap Wi-Fi, dining cart,
housekeeping, AI receptionist, tickets → express checkout.
Paper binder, replaced.

**F5 — Business.**
`/business/onboard` (real details, Google import) → listing live →
discovery + bookings → held payout → reviews. Plans: presence →
featured → partner.

**F6 — Stay host.**
`/host`: property → facilities, menu, Wi-Fi, QR print kit → live
ticket queue + dining orders → folio settle. Activation checklist
(listed → Wi-Fi → print → test scan).

**F7 — Organiser.**
`/event` (free or ticketed) → stalls, festival programs → attendee
check-in → payout after delivery → reviews.

**F8 — Remember & repeat.**
Ticket wallet (`/me/tickets`, PDF + share), memories wall, people met,
rewards, giveaways → the next plan. This is the retention engine.

## 5. Trust & money rails (under every flow)

Identity + email/phone verification where required · report, block,
moderation, incident cases · human approves Mates and closes safety
cases (AI only assists) · one `bookings` engine, Stripe Checkout +
Connect, held payouts, refunds/disputes · every privileged action
audited · home addresses, documents, phones, notes stay private ·
never claim guaranteed safety.

## 6. What AirPal is not

Not a social network, dating app, hotel clone, fashion store, news
site, ride-share, AI chatbot with a marketplace attached, or six apps.
Discovery and content exist to create transactions, not attention.

## 7. Showcase map (demo this story live)

| Story | Open this | Show this |
|---|---|---|
| Guest aha | `/`, `/DemoHotel` | Tonight near you; scan → compendium |
| Mate loop | `/mate`, `/mate/request` | Request → match → chat → book |
| Plan | `/plan`, `/plan/new` | Create → invite → RSVP |
| Stay ops | `/concierge`, `/host` | Guest side, then host tickets |
| Business | `/business`, `/p/:id` | Dashboard, then live listing |
| Events | `/calendar`, `/experiences` | Browse, then book + ticket |
| Identity | `/@handle`, `/me/tickets` | Public bio, wallet passes |
| Full business | `/Demo` (hub, in build) | All of the above, one guided tour |
