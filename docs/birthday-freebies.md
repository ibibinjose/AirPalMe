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

- `shared/birthday-freebies.ts` (+ `.test.ts`) — pure helpers only: `BIRTHDAY_REGIONS`, `BIRTHDAY_MONTHS`, `monthFromBirthDate`, `isBirthdayRegionCode`, `offerVisibleFor`, `validateBirthdayOfferDraft`.
- Signup age gate — `adultConsent` + `birthdayMonth` (1–12, full DOB not persisted) in `SignupFlow` / `AuthContext`. The 18+ checkbox stays regardless of this surface.

## How to verify

1. `npx vitest run shared/birthday-freebies.test.ts`
2. Visit `/birthday-freebies/au` → lands on `/deals`.
