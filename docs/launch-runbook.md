# AirPal.Me — Launch Runbook

Sydney time for all roster/SLA references. Never market AirPal as guaranteeing personal safety.

## Pre-launch gate (must all be green)

- `npm run verify`: typecheck, functions:typecheck, lint, tests, web build, functions build, rules:check, seo:check.
- `npm run audit` (web + functions, high+).
- CI (`.github/workflows/ci.yml`) mirrors `verify`: typecheck, functions:typecheck, lint, tests, builds, rules:check, seo:check, audit.
- Firestore rules + indexes deployed: `npm run deploy:rules` (covers the `safety_reports` status+createdAt composite and admin block reads).
- Secrets: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` bound via Secret Manager (prod). `ALLOW_SANDBOX_BOOKINGS` must be unset/false in prod. Never commit `.env`.
- Legal pages live: /privacy, /terms, /cookies, /contact, /about; `LEGAL.updated` bumped on copy change.
- Website guests can browse Stay/Now/Scan without auth. Native iOS/Android require an account past the legal/onboarding public paths (`src/lib/native-auth-gate.ts`). No PII in analytics.

## Safety SLA (human review, no autonomous closures)

- New `emergency` safety reports: target first human review within 4 hours, emergencies sorted first in Admin → Safety cases.
- All other new reports: target review within 1 business day.
- Every report keeps status `new → reviewed → actioned` with a case note; every status change writes `admin_audits` via `logAdminAction`.
- In-danger-now copy: always direct people to local emergency services first (000 in Australia).
- Blocks: users block privately; platform admins have read-only list/get for block-evasion triage. Only the blocker can update/delete a block.
- Companion/mate-request supply is NOT live — the admin approval chain (Draft → Submitted → Under Review → Approved/Rejected, plus Suspended/Removed) is G6 gated-return machinery only. If it ever returns: approval mandatory, police-clearance fields are minimum evidence, regulated-claim flags (`flagsRegulatedClaims`) route to closer review. No KYC-vendor automation is wired — do not claim otherwise.

## Incidents

1. Triage in Admin → Safety cases; set `reviewed`, add note, escalate to `actioned` with suspend/remove + report as needed.
2. Money incidents (payments/payouts/refunds/disputes): freeze via Stripe dashboard + platform_settings marketplace fee config; never edit money fields client-side (Functions-only per `firestore.rules` bookings/money lockdown).
3. Write `admin_audits` for every action; keep evidence in the case note (who was contacted, what was done).
4. Abuse signals: `abuseSignals` (missing App Check, automated activity) and `rateLimits` are Functions-only; App Check absence is logged, not yet gating.

## Deploy / rollback

- Hosting: `npm run deploy:hosting`. Functions: `npm run deploy:functions`. Rules only: `npm run deploy:rules`.
- `VITE_*` bakes at build — rebuild + `npm run cap:sync` for native (app ids `me.airpal.app` + `me.airpal.pass`) to pick up key changes.
- Rollback: redeploy the last green Hosting revision / Functions version from Firebase console; note it in `admin_audits` if admin action was involved.

## Post-launch watch (first 14 days)

- North star: Completed AirPal Experiences; watch plans → RSVPs → tickets → scans/completions funnel plus cancellations, reports, refunds/disputes. (No matching or public reviews in V1.)
- Daily: safety inbox zero-new-emergency, failed Stripe webhooks, `abuseSignals` spikes, crash-free sessions ≥ 99% via `client_error` analytics events (`src/lib/error-report.ts`; no vendor SDK wired — see `docs/AIRPAL.md` Part F).
- Store pack: `docs/store/` (listing, app-information, reviewer-notes, permissions, play-data-safety, plus `-pass` twins for AirPal Pass). Native this pack: iOS **2.0.0 (16)**, Android **versionCode 8 (2.0.0)**. Human Submit-for-Review / Play upload remain.

## Contacts

- Support: hello@airpal.me (store/contact surface uses AirPalMe@gmail.com per `LEGAL.contacts`).
- Operator: SarvamDaily Pty Ltd trading as AirPal.Me, ABN 83 702 462 977, NSW Australia.
