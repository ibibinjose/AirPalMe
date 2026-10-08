# AGENTS.md — AIRPAL Ecosystem Boot

**Agents: read [`docs/AIRPAL.md`](./docs/AIRPAL.md) before any edit. It is the binding source of truth** — product, dual-lens ecosystem, V1 scope, trust/safety/privacy/money rails, tech rules, design system, launch plan, and agent rules. This file is only the boot pointer so every tool lands in the same place.

## Core Architecture: Master Brand & Dual UX Lenses

- **AIRPAL:** Master brand ("Life Made Easy") with unified Firebase Auth, Firestore, and trust rails.
- **AirPal.Me:** Personal Life & Identity (*"Plan your day. Organise your life. Share who you are."*) — profiles `/@handle`, day planner `/now`, outfit engine, personal calendar `/calendar`, plans `/plan`.
- **AirPal Pass:** Events, Deals & Experiences (*"Discover what's happening. Get access. Save money."*) — festival & concert access `/pass`, wallet `/me/tickets`, dining perks `/deals`, door scanner `/scan`, organiser tools `/event`.
- **Single Universal Account:** Never create a separate user database or auth partition between AirPal.Me and AirPal Pass.

## Non-negotiables (expanded in `docs/AIRPAL.md` Parts C + I):

- Safety, security, privacy, and payment integrity outrank everything.
- Never commit secrets (`.env` stays out). Never weaken `firestore.rules`.
- No second user system, booking engine, or chat engine. Privileged writes via Cloud Functions.
- `npm test` and `npm run verify` pass before commits or deployment. `npm run cap:sync` after web builds for native.
- Smallest change that solves; strict TS; no fake production data.

Pre-rebuild rules (product rules, canon freeze, brain) are archived in git history.
