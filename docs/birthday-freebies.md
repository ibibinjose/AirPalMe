# Birthday Month Freebies

Curated loyalty / birthday rewards by region — AirPal-native Mate meetup fuel.

## Brain alignment

- **Discover → Go with Mate.** Offers are conversation starters and plans, not an events directory.
- Framing: **Life Made Easy** / Mate — never “not a dating app.”
- **Sydney / AU** is the beachhead; IN, US, UAE, EU are traveler-useful catalogs (not a multi-country P0 pivot).
- CTA on every offer: redeem with a Mate / find someone to go with → `/mate` or https://airpal.me.

## Consumer

| Route | Purpose |
| --- | --- |
| `/birthday-freebies` | Default region AU |
| `/birthday-freebies/:region` | `au` \| `in` \| `us` \| `uae` \| `eu` |

Month selector defaults to the signed-in user’s `birthdayMonth` (1–12) or the current month. Adult-only offers are gated behind `adultConsent` / signed-in adult.

## Account fields

On `completeAccountSignup`:

- Requires `adultConsent: true` **and** valid 18+ `birthDate`.
- Stores `birthdayMonth` (1–12 only — full DOB is not persisted).
- Stores `adultConsent`, `adultConsentAt`, plus legacy `adultConfirmed` / `adultConfirmedAt`.

Signup UI: required checkbox **“I confirm I am 18 years of age or older”** after DOB; submit disabled until checked.

## Callables

| Callable | Who | Notes |
| --- | --- | --- |
| `createBirthdayOffer` | Business or admin | Business creates `draft`; admin may set `live` |
| `updateBirthdayOffer` | Owner or admin | Admin-only to set `live` |
| `listBirthdayOffers` | Public (live) | Owners also see own drafts; admin `status: "any"` |
| `adminSetBirthdayOfferStatus` | Platform admin | `draft` \| `live` \| `archived` |
| `seedBirthdayFreebies` | Platform admin | Upserts `shared/birthday-freebies-seed.ts` by `seedKey` |

Firestore collection: `birthday_offers`. Client writes denied; public read for `status == live`.

## Business / Admin UI

- Business: `/business/birthday-offers`, `/new`, `/:id`
- Admin: `/admin/birthday-offers` (list, edit, live/archive, seed catalog)

## Shared module

`shared/birthday-freebies.ts` — regions, months, `BirthdayOffer`, `monthFromBirthDate`, `offerVisibleFor`, `validateBirthdayOfferDraft`.

Disclaimer: offers change; join rewards before birthday.

## How to test

1. `npx vitest run shared/birthday-freebies.test.ts`
2. Signup: DOB + Adult 18+ tick required; user doc gets `birthdayMonth` + `adultConsentAt`.
3. Admin: open `/admin/birthday-offers` → **Seed catalog** → browse `/birthday-freebies/au`.
4. Business: `/business/birthday-offers/new` → create draft → admin sets live.
