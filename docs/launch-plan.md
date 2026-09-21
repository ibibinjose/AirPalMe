# AirPal.Me — Launch plan (global soft launch → public)

North star: Completed AirPal Experiences. First milestone per strategy: 100 successful transactions (by hand if needed). Downloads are vanity.

## Sequence

1. **Soft launch (weeks 1–4): one launch city at a time, anywhere in the world.** TestFlight (iOS) + Play internal track → closed track. Start where catalogue density is strongest, prove the loop, then expand city by city.
2. **Store submission.** Pack is in `docs/store/` (listing copy, reviewer notes, permissions, data-safety answers, icon + feature graphic). Screenshots regenerate via `npm run screenshots` on a Mac.
3. **Public launch.** Product Hunt + local/community channels in each launch city below, only after the soft-launch exit gate.

## Landing (live in app)

- `/marketing` — headline value prop ("Life Made Easy. All in one app."), product sections, CTAs → `/getAirPalApp`.
- `/getAirPalApp` — store badges (currently `#` + "Soon" placeholders — swap for live IDs after first listing approval), QR, share.
- Privacy: https://airpal.me/privacy · Terms: /terms · Contact: /contact. Legal entity + ABN on every store surface (`docs/store/listing.md`).

## Distribution targets (day one, per launch city)

- Product Hunt launch (weekday, maker comment ready: Mate wedge → "Find someone to go with you").
- Reddit: the launch city's subreddit (value-first post, no spam), plus travel/meetup/event subs where rules allow.
- Local communities: expat/mates/meetup groups, event precinct partners, campus noticeboards.
- ASO copy ships in `docs/store/listing.md` (Travel primary). Re-read both stores' payments policies pre-release (real-world services only, Stripe, no digital goods — see `docs/store/README.md`).

## Soft-launch exit gate (all must hold 2–4 weeks)

- Crash-free sessions ≥ 99%. Signal until a vendor SDK lands: `client_error` analytics events per session (pipeline: `installErrorTracking` + `ErrorBoundary` → PII-scrubbed `client_error`, see `src/lib/error-report.ts`). No Sentry/Crashlytics/Mixpanel SDK is wired — that is a deliberate deferral, not coverage.
- Zero new `emergency` safety reports older than 4h unreviewed; zero new non-emergency reports older than 1 business day.
- Mate loop proven on real users: request → match → message → book/pay → complete → review, with admin able to inspect every stage.
- No failed-Stripe-webhook backlog; `ALLOW_SANDBOX_BOOKINGS` unset in prod; Stripe keys via Secret Manager only.

## Owner actions (cannot be done from this checkout)

- Apple App Store Connect + Play Console verification, content-rating questionnaires (17+ / Mature 18+ — the app is 18+ only), data-safety form (`docs/store/README.md` §Needs-you).
- Signing/upload on your Mac (`npx cap sync`, AAB via Gradle, Xcode archive), then SHA-256/Team-ID placeholders in `.well-known/*` + hosting redeploy.
- 1-minute promo demo video (not in repo) + hand-shot Circle/Host screenshots if wanted.
- `VITE_GOOGLE_MAPS_API_KEY` referrer-restricted key; rebuild after any `VITE_*` change.
