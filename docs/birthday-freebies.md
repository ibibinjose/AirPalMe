# Birthday Month Freebies (RETIRED surface)

> **Phase 6 removed this surface.** The consumer pages, business/admin UI, and
> Cloud Functions callables are gone; `/birthday-freebies` and
> `/birthday-freebies/:region` redirect to `/deals`. This file records what
> remains so a return can be scoped (it would need its own PRD and brain
> gates — it does not come back by uncommenting routes).

## What was removed

- Consumer UI (`/birthday-freebies`, region pages) → redirect to `/deals`.
- Business UI (`/business/birthday-offers/*`) and admin UI (`/admin/birthday-offers`) → gone.
- Callables `createBirthdayOffer` / `updateBirthdayOffer` / `listBirthdayOffers` / `adminSetBirthdayOfferStatus` / `seedBirthdayFreebies` → implementations gone; name constants removed from `shared/airpal-security.ts` and the `birthday_offers` rules stub deleted (Oct 2026). A return rebuilds all three.
- Seed module → gone.

## What remains (live)

- `shared/birthday-freebies.ts` (+ `.test.ts`) — pure helpers: `BIRTHDAY_REGIONS`, `BIRTHDAY_MONTHS`, `monthFromBirthDate`, `isBirthdayRegionCode`, `offerVisibleFor`, `validateBirthdayOfferDraft`, `shouldAlertBirthdayMonth`, `shouldAlertBirthdayMidMonth`, `buildBirthdayMonthAlert`.
- Signup age gate — `adultConsent` + `birthdayMonth` (1–12, full DOB not persisted) in `SignupFlow` / `AuthContext`. The 18+ checkbox stays regardless of this surface.
- Account fields: on `completeAccountSignup`, stores `birthdayMonth`, `adultConsent`, `adultConsentAt`, default `birthdayAlertsEnabled: true` and `birthdayAlertsRegion: "au"`.
- Callable: `setBirthdayAlertPrefs` (signed-in member) updates `birthdayAlertsEnabled`, `birthdayAlertsRegion`.
- Scheduled alerts: `sendBirthdayMonthAlerts` daily (09:00 Australia/Sydney).

## Birthday month alerts

Daily scheduled job `sendBirthdayMonthAlerts` (09:00 Australia/Sydney):

- Targets users whose `birthdayMonth` matches the Sydney calendar month
- Requires `adultConsent` or `adultConfirmed`, and `birthdayAlertsEnabled !== false` (default on when month is set)
- Skips if `lastBirthdayMonthAlertAt` is already in the same Sydney calendar month
- Optional mid-month nudge (day ≥ 15) via `lastBirthdayMidMonthAlertAt`
- Push + inbox: “Your birthday month freebies are live” → `/birthday-freebies/{region}` with Mate / Life Made Easy CTA
- Cap: 500 sends per run

Prefs on `users/{uid}`: `birthdayAlertsEnabled`, `birthdayAlertsRegion` (default `au`), stamps above.

Callable `setBirthdayAlertPrefs` (auth required) updates enabled + region. Settings UI: toggle + region picker.

## How to test

1. `npx vitest run shared/birthday-freebies.test.ts`
2. Visit `/birthday-freebies/au` → lands on `/deals`.
