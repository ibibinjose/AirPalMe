---
name: airpal-build
description: >
  Build, sequence, and audit AirPal.me against the living MVP checklist.
  Use when the user asks what is built, what is next, to continue plan,
  bookings, messaging, payments, admin, safety, AirPal Business, or marketplace
  engine work; or runs /airpal-build, /airpal-status, /airpal-next, or
  /airpal-business. Loads AGENTS.md for product rules, the checklist for status,
  and existing Vite+Firebase surfaces — never a rewrite to Next.js.
---

# AirPal build

Operate this repo as one marketplace engine. Product rules live in `AGENTS.md`. Binding truth lives in `docs/AIRPAL.md` (`docs/CANON.md` and `docs/AIRPAL_BRAIN.md` are pointers into it). Build status lives in `references/build-checklist.md`. Code map lives in `references/surfaces.md`. Do not copy those files into chat or into new docs.

## On every invoke

1. Read `AGENTS.md` (repo root) and `docs/AIRPAL.md` (binding source of truth — new surfaces must pass the G7 feature test and G8 conflict order).
2. Read `.grok/skills/airpal-build/references/build-checklist.md` and `references/surfaces.md` before adding files.
3. Name the next item you will touch (its checklist `id`) and the smallest change that moves it toward `done`.
4. After shipping, update the checklist row: status, checkbox, evidence path, date. Never mark `done` without a real path a user can exercise.

## Status values

Use exactly these words in the checklist:

| Value     | Checkbox | Meaning                                                                   |
| --------- | -------- | ------------------------------------------------------------------------- |
| `done`    | `[x]`    | User-facing path exists, wired to live Firestore or callables, not a stub |
| `partial` | `[ ]`    | Real code exists; the Done-when line is not met                           |
| `todo`    | `[ ]`    | Not built                                                                 |
| `later`   | `[ ]`    | Out of current priority (P3/P4 while P0 is incomplete)                    |

Partial items stay unchecked. Only `done` gets `[x]`.

## How to pick work

Default order (canon G6/G7): P0 transaction → P1 usability → P2 growth → P3 expansion → P4 infrastructure.

Pick the first P0 row that is `todo`, else the first P0 `partial`, and only if it serves the company loop (Want → Discover → Connect → Plan → Go → Experience → Remember → Repeat). Do not start a new vertical, a second booking engine, paid-companion front door, or Studio modules while that loop is unproven — unless the user named that vertical in this turn (`/airpal-business` counts as naming Business). A named vertical still has to pass the G7 feature test. Strangers/Mate stay deferred per canon G6 — never rebuild them from these references.

When the user names a surface (Business, Stay, Pass, …), stay on that surface but still reuse shared collections in `surfaces.md`.

## How to add a checklist row

Append under the right P-level with a new kebab `id` that is not already in the file:

```
- [ ] `todo` `p0-example` Short title — Done when: one sentence. Evidence: —
```

Do not delete rows. Demote with `later` and a reason. Bots treat unknown ids as new work.

## After a change

1. Flip the row you shipped. Put a file path in Evidence.
2. If the change completes an MVP acceptance step, mark that step too.
3. Refresh **Next 3** at the bottom of the checklist to the three highest remaining P0/P1 gaps.
4. Run the tests that cover the files you touched (`vitest` for `shared/` and `src/**/*.test.ts`; Playwright only if a user flow changed).
5. Check Firestore rules if you added a collection or a client write. Privileged mutations go through Cloud Functions. Never weaken `firestore.rules`.

## Repo facts agents get wrong

- Stack is Vite SPA + React + TypeScript + Tailwind + Lucide + Firebase + Capacitor 8, two native shells (`me.airpal.app` + `me.airpal.pass`) from one codebase. Keep it. Do not migrate to Next.js App Router or shadcn.
- The Mate/stranger surfaces (`/mate`, `/companion`, Mate/MateRequest/Companion pages) were deleted in Phase 6. Only the companion/mate-request **admin chain** remains, as G6 gated-return machinery — never rebuild consumer Mate UI from these references.
- Bookings already exist (`bookings` + `shared/booking.ts`). Stripe is live (experience/booking/stay checkout, Connect transfers, subscriptions, refunds in `functions/src/stripe.ts`). Extend this engine; do not add a second one.
- `companion_applications` is the dormant application collection behind the gated admin chain.
- Website guests browse Stay/Now/Scan without auth. Native apps require an account past the legal/onboarding public paths (`NativeAuthGate`). Do not gate the website. Do not remove the native login gate.
- Sydney zoned dates: `toZonedDateStr` / `useLocalNow`. Never `new Date().toISOString().slice(0,10)` for calendar dates.
- Conflict order: Safety → Security → Correctness → Transaction integrity → UX → Performance → Growth.

## Bot entry points

| Command            | Workflow                               | What it does                                                       |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------ |
| `/airpal-build`    | this skill                             | Human-driven: pick next item, implement, update checklist          |
| `/airpal-status`   | `.grok/workflows/airpal-status.rhai`   | Read-only audit; report drift vs checklist                         |
| `/airpal-next`     | `.grok/workflows/airpal-next.rhai`     | Implement the highest P0 gap, then update checklist                |
| `/airpal-business` | `.grok/workflows/airpal-business.rhai` | Implement the highest AirPal Business gap, reuse the shared engine |

Pass `args.write: true` on `/airpal-status` only when the user wants the checklist rewritten from a fresh scan.

## What not to do

Do not position AirPal as six apps, a dating product, or an AI chatbot with a marketplace attached. Do not invent compatibility scores. Do not store raw cards. Do not expose home addresses, phones, emails, or verification docs. Do not hard-code commission percents in new payment code — fees stay admin-configurable (`platform_settings/marketplace`).
