# AGENTS.md — AIRPAL Ecosystem Boot

**Agents: read [`docs/AIRPAL.md`](./docs/AIRPAL.md) before any edit. It is the binding source of truth** — product, dual-lens ecosystem, V1 scope, trust/safety/privacy/money rails, tech rules, design system, launch plan, and agent rules. This file is only the boot pointer so every tool lands in the same place.

## Core Architecture: Master Brand & The 5 Core Pillars

- **AIRPAL:** Master brand ("Life Made Easy") with unified Firebase Auth, Firestore, and trust rails.
- **1. Events & Access:** Live concerts, Indian festivals, native Stripe ticketing, Apple/Google Wallet passbook `/pass`, `/events`, `/me/tickets`, door scanner `/scan`, organiser tools `/event`.
- **2. Discovery:** 60-second plan composer `/now`, urge & time filters, weather & deterministic outfit recommendations, local precinct guides `/guide`.
- **3. Planning:** Hangouts and invites `/plan`, one-tap web RSVPs `/invite/:code`, stops voting, personal calendar `/calendar`.
- **4. Business & Arrival Engine:** Business hub `/business`, merchant perks `/deals`, B2B2C Arrival & Cohort Engine `/join`, Belonging Reports `/host`. (Legacy concierge/stays retired and redirected).
- **5. Personal Bio & Networking Circle:** Dedicated Networking Circle `/circle` with live presence check-in (`<HereCheckIn />`), connector rank quests, and personal digital bio profiles `/@handle`, `/bio/setup`.
- **Single Universal Account:** Never create a separate user database or auth partition across pillars or native shells.

## Non-negotiables (expanded in `docs/AIRPAL.md` Parts C + I):

- Safety, security, privacy, and payment integrity outrank everything.
- Never commit secrets (`.env` stays out). Never weaken `firestore.rules`.
- No second user system, booking engine, or chat engine. Privileged writes via Cloud Functions.
- `npm test` and `npm run verify` pass before commits or deployment. `npm run cap:sync` after web builds for native.
- Smallest change that solves; strict TS; no fake production data.

Pre-rebuild rules (product rules, canon freeze, brain) are archived in git history.
