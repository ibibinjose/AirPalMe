# AGENTS.md — AirPal.me (boot)

**Agents: read [`docs/AIRPAL.md`](./docs/AIRPAL.md) before any edit. It is the binding source of truth** — product, V1 scope, trust/safety/privacy/money rails, tech rules, design system, launch plan, rebuild plan, and agent rules. This file is only the boot pointer so every tool lands in the same place.

Non-negotiables (expanded in `docs/AIRPAL.md` Parts C + I):

- Safety, security, privacy, and payment integrity outrank everything.
- Never commit secrets (`.env` stays out). Never weaken `firestore.rules`.
- No second user system, booking engine, or chat engine. Privileged writes via Cloud Functions.
- `npm test` and `npm run verify` pass before commits or deployment. `npm run cap:sync` after web builds for native.
- Smallest change that solves; strict TS; no fake production data.

Pre-rebuild rules (product rules, canon freeze, brain) are archived in git history.
