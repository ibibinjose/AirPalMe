# PRD — AirPal Plan Experience

**Status:** shipped · v1.0 · October 2026 (all §8 boxes verified)
**Owner:** founder + builders (small commits, update this file with the code)
**Authority:** [docs/AIRPAL.md](./AIRPAL.md) Parts B, C, E, G win on any conflict. This doc specifies *how* Plan beats Apple Invites within V1 scope — it does not expand scope.
**North Star:** Completed Experiences per active user. Every requirement below must move someone from urge → confirmed plan → showed up → remembered. Features that don't serve that loop are out.

---

## 1. Problem

Group plans die in chat threads. Someone proposes "drinks Friday?", details scatter across messages, nobody knows who is actually coming, and the night either fizzles or happens without AirPal ever knowing. Apple Invites (Feb 2025) proved the model — one beautiful invitation card with RSVP — but it **ends at the door**: no group coordination, no show-up confirmation, no memory, no repeat, host-only on iPhone with a paid iCloud+ subscription.

AirPal Plan must be the simplest invitation on earth to *create*, and the only one that carries the group *through* the experience and back for more.

## 2. Goals (in priority order)

1. **G1 — Create in under 60 seconds.** Title, date/time, place, cover. Everything else is a smart default or one tap away.
2. **G2 — One living thread.** The plan page is a single invitation card: what/when/where, who's in, RSVP, chat, meeting point, time changes — no hunting across screens.
3. **G3 — Invite by link, zero friction.** View needs no account; RSVP from any device (web/Android/iOS). Account only to create or join.
4. **G4 — Close the loop.** "We're here / we're done" confirmation writes a private memory and offers one-tap repeat.
5. **G5 — Free for hosts.** No subscription to create. This is the structural win over Apple Invites.

## 3. Non-goals (explicit)

- No strangers, matching, or booking-a-person (deferred per AIRPAL.md G6).
- No paid paths, ticketing checkout, or payouts in this PRD (free plans only).
- No public reviews or reputation; memories stay private.
- No shared photo album / collaborative playlist yet (Apple Invites parity items — see §9).
- No AI chatbot surface; AI stays quiet (suggestions, readiness) inside the thread.
- No second plan/thread/chat engine — one `HangoutPlan` model, one thread, one chat store.

## 4. Users

- **Host (primary):** has free time + low decision energy, wants to gather known people. Creates on mobile in under a minute.
- **Guest:** receives a link (WhatsApp, Messages, Instagram). Views instantly, RSVPs in one tap, gets time/place updates.
- **Co-host:** promoted from going-list; can manage, message, check in, lock dates.

V1 beachhead: Sydney, people you already know. No guest may ever see another guest's phone, email, home address, or verification state.

## 5. Competitive bar — Apple Invites

| Capability | Apple Invites | AirPal Plan (this PRD) |
|---|---|---|
| Create invite | iPhone only, iCloud+ paid | Any device, free (G5) |
| Artwork cover | Photo / emoji / AI backgrounds | Curated offline art + upload (§7.2) |
| Date/time | Native pickers + weather | Native pickers + shortcuts (§7.1); weather later (§9) |
| Location | Maps integration | Maps search + venue presets (§7.1) |
| RSVP | Link, any device, no account | Same, plus in-thread status + notes (§7.4) |
| Guest coordination | None (ends at RSVP) | Group chat, meeting point, time changes, polls (§7.3) |
| Show-up proof | None | Here check-in + "we're done" (§7.5) |
| Memory + repeat | Shared album only | Private memory + one-tap repeat (§7.5) |
| Host management | Basic guest list | Manage sheet: privacy, capacity, approvals, questions (§7.3) |

**Win condition:** a side-by-side test where creating + running a Friday-night plan is faster on AirPal and the only one that records the completed night.

## 6. Product principles

1. **Three questions, then done.** What → When/Where → Who. Same shape as `/now`.
2. **Defaults over fields.** Every optional input has a safe default (private, no cap, no approval). Options hide in Details / Manage — never in the core path.
3. **One card, one thread.** The plan page reads as a single invitation; tabs (Overview / Plan / Map / People / Chat & AI) organize depth without new destinations.
4. **Proof over promises.** Completion ("we're done") is the only success event. RSVPs don't count.
5. **No dark patterns.** Honest counts, honest open/closed states, clear cancellation. Zero fake data anywhere.

## 7. UX specification

### 7.1 Create flow — `/plan/new` (3 steps, auth-gated)

**Step 0 — What (template grid).** 7 templates (Coffee, Lunch, Night out, Walk, Meeting, Escape, Birthday) as tappable cards; picking one advances. Ticketed-public shortcut routes to `/event/new`. Prefills honored: `?title=&dest=&type=`, `?with=@handle`, Now-composer handoff, intent solver.

**Step 1 — When & where (minimal core).** Exactly four blocks, in order:
1. **Title** — required; per-template suggestion chips.
2. **Date & time** — native pickers (min = today) + shortcuts (Today / Tomorrow / Fri / Sat / Sun) + time presets (Morning…Night). Past dates rejected with a fix-it error.
3. **Place** — Maps-backed address field + suburb presets.
4. **Cover** — `PlanCoverPicker`: 5 curated artworks + upload-your-own (crop next). Optional — plans without covers render the brand fallback.
5. **Details · Optional (collapsed)** — visibility only: Private/invite-only (default) vs Public discovery. Summary line shows current state without expanding.

Sticky "Continue to Invites" bar keeps the way forward visible on long scroll.

**Step 2 — Who.** Invite summary card (cover image when set, title, date, place, privacy badge) → Circle multi-select with search + select-all → share-link explainer → primary **Create Plan & Get Invite Link** (guarded submit, spinner, haptic success) → lands on `/plan/:id?share=true` with the share sheet open.

### 7.2 Cover artwork

- `PLAN_COVERS`: 5 self-hosted `/media/*` images (offline-safe, zero tracking). Stored as `plan.heroImage`.
- Upload path reuses `ImageField` (crop, `listings` folder). Curated vs upload are mutually exclusive in display, single value in state.
- The cover renders on: create preview, thread invitation card, plan cards/hub, chat conversation photo, and **invite-link unfurls** (share meta `image` + Event JSON-LD). `idb:` local URIs never leak into meta — fallback to brand OG image.

### 7.3 The thread — `/plan/:id` and `/invite/:code` (one living card)

**Above the fold (all viewers):** back → slim action row (Follow, QR, **Invite Mates** primary; host adds **Manage**) → `InvitationCard` (cover, type badge, title, host, When/Where/Notes rows, RSVP CTA, guest avatar stack). No host controls inline — ever.

**Status strip (conditional, in order):** cancelled notice → completed banner + "Do it again" → "Did you go?" prompt (host or going, date ≤ today) → readiness nudge.

**Tabs (sticky):** Overview / Plan(n) / Map(n) / People(n) / Chat & AI.
- *Overview:* date poll → Your-RSVP strip (Going / Maybe / Add note / We're-here check-in / Sync calendar) → invite-friends card → here-check-in → experience/booking card (if any) → calendar export → album → discussion wall.
- *Plan:* co-planned itinerary stops (add / reorder / vote).
- *Map:* stop pins.
- *People:* co-hosts, door guestlist, join requests, guest answers, reviews, attendees with host check-in toggles + per-guest safety menu.
- *Chat:* full group conversation.

**Manage sheet (host only):** Edit plan → Message everyone going → privacy switch → guest-names / headcount switches → max guests → approve-guests switch → guest questions manager → Delete (danger, confirm). Bottom sheet with grab handle, ESC + Android-back dismiss, safe-area padding.

### 7.4 Invite & RSVP model

- Every plan mints a private share link + QR at creation (`PlanShareModal`, `PlanQrModal`). Viewing needs no account.
- RSVP states: going / maybe / declined, optional note + plus-ones + guest-question answers (`PlanRsvpSheet`). Approval mode queues "going" as requests; capacity overflow waitlists with visible position.
- Host broadcasts on lock-ins (date locked → message-going sheet opens). Guests follow for push updates.

### 7.5 Completion → memory → repeat

- **Here:** geo/manual check-in during the event (guest self + host toggles).
- **Done:** "We went" marks complete → writes a private memory record → "Do it again" repeats into a fresh live plan in one tap.
- Ratings/reviews attach to the completed record only, both sides, reportable. Never public surfaces in V1.

## 8. Requirements & acceptance criteria

### Functional

- [x] **F1.** Host completes create (template → details → invites → link) in ≤ 60s on mobile (measured, median).
- [x] **F2.** Past-date submit is rejected inline with a fix-it message; valid submit shows spinner, disables, haptics success, deep-links to thread with share sheet open.
- [x] **F3.** Cover picker shows 5 artworks + upload; choice persists to `heroImage` and appears on thread card + unfurl meta (absolute URL in JSON-LD).
- [x] **F4.** Guest opens invite link with no account: sees full invitation + date/place/cover; RSVP prompts auth only at join/submit, preserving intent (return to thread after).
- [x] **F5.** Thread top (action row + card + status) contains zero host-only controls for guests; host reaches all 7 controls + delete within 2 taps via Manage.
- [x] **F6.** Time change / date lock notifies going-list; capacity + approval + waitlist behave per §7.4 with visible positions.
- [x] **F7.** Completion writes exactly one memory; repeat creates a live plan prefilled from the original in one tap.
- [x] **F8.** Cancelled plans show reason + lock RSVP/booking actions; deleted plans 404 cleanly with Explore/Scan recovery.

### Non-functional (rails from AIRPAL.md Part C + E)

- [x] **N1.** 44px targets, 16px inputs, safe-area insets, bottom-sheet ergonomics, keyboard-aware layouts on every Plan screen (verified at 390 / 768 / 1280).
- [x] **N2.** Screen-reader pass: named landmarks, labelled icon buttons, switch roles, `aria-checked`/`aria-pressed` on RSVP + toggles, focus-visible rings.
- [x] **N3.** Privacy: no guest PII (phone/email/address/docs) rendered or logged; private-plan titles/bodies never in crawler unfurls; reports + block on every people surface.
- [x] **N4.** No fake data: counts, headcounts, weather (when added), and open states derive from live sources or read "unknown".
- [x] **N5.** `npm test` + `npm run verify` green; new behavior ships with a focused test (component or lib).

## 9. Later (explicitly out of this PRD)

Ordered by evidence gate, not desire: live weather strip on date/time → richer map preview → shared thread photo memories (private to attendees) → time-change voting polish → collaborative playlist. Each needs repeat completions trending up first, then its own one-page addendum here.

## 10. Metrics (feed AIRPAL.md B6)

Creation funnel (started → completed, median seconds), suggestion-accept rate (Now → plan), RSVP rate (views → going/maybe), show-up rate (going → checked-in), completion rate, repeat rate, completed plans per active user per month. If completions per active user stay flat, no new Plan surface ships — fix the loop first.

## 11. Risks

- **Scope creep into events/ticketing.** Guard: ticketed-public stays on `/event/*`; Plan never grows checkout.
- **Host-control sprawl returns inline.** Guard: new host capability ships in the Manage sheet or not at all.
- **Stale place data kills trust.** Freshness SLAs before new supply (AIRPAL.md G9).
- **Unfurl leakage.** Private plans must never expose titles in crawler meta — covered by dedicated tests.

## 12. Open questions

1. Weather provider + caching budget for the date strip (§9 item 1)?
2. Should guests RSVP fully logged-out (name-only, like Apple Invites web) or is auth-at-RSVP the permanent line?
3. Co-host cap (5) and capacity cap (500) — right defaults from real usage?

---

## Appendix A — Implementation map (as shipped)

| Surface | File |
|---|---|
| Create flow | `src/pages/PlanCreatePage.tsx` (steps 0/1/2) |
| Cover picker | `src/components/plan/PlanCoverPicker.tsx` (+ `.test.ts`) |
| Thread | `src/pages/PlanDetailPage.tsx` + `InvitationCard` |
| Manage sheet | `src/components/plan/PlanManageSheet.tsx` |
| Invite/share | `PlanShareModal`, `PlanQrModal`, `PlanRsvpSheet`, `PlanBroadcastSheet` |
| Model | `HangoutPlan` in `shared/plan.ts` (`heroImage`, guestList, capacity, approvals, questions) |
| Unfurls | `setShareMeta` in `PlanDetailPage` (Event JSON-LD) |

## Appendix B — V1 acceptance trace (AIRPAL.md B5)

Open app → answer what/when (`/now`) → accept one suggestion → create plan → invite two friends by link → change time once → confirm → mark done → repeat next week: all achievable without signup-before-value, vertical tabs, or stranger mechanics. This PRD is the contract that keeps it that way.
