# Managed Payments (Stripe)

Direct-charge checkout for platform-sold goods (digital products, passes,
fees) using Stripe Managed Payments. This is separate from the Connect
marketplace flow in `functions/src/stripe.ts`, which must keep
`managed_payments.enabled = false` (Marketplace Connect is unsupported by
Managed Payments).

## Flow

1. `createManagedProduct` (platform admin) — creates the Stripe product with
   an eligible tax code plus default price, and persists `stripeProductId` /
   `stripePriceId` to `managed_products/{productId}` (and onto the plan doc
   when `planId` is given).
2. `createManagedCheckoutSession` (signed-in guest) — loads the stored price
   from Firestore (never trusts client prices), reuses the buyer's stored
   `stripeCustomerId` when present, creates the session with
   `managed_payments: { enabled: true }`, and writes a pending
   `managed_payments/{paymentId}` ledger doc.
3. Guest pays at the returned `checkoutUrl` (test with card `4242 4242 4242
4242`, any future expiry, any CVC).
4. `stripeWebhook` receives `checkout.session.completed` and routes sessions
   carrying `managedPaymentId` metadata to `recordManagedCheckoutCompleted`,
   which marks the ledger paid, writes `payments/{sessionId}`, and persists
   `stripeCustomerId` on the ledger and the user doc for reuse. Idempotent.

## API version

The Stripe client pins a version above the blueprint floor
(`2026-02-25.preview`), so every request carries a compliant
`Stripe-Version` header. Do not downgrade the pin in
`functions/src/stripe.ts`.

## Setup

Get the keys from the Stripe Dashboard (Developers → API keys, and
Developers → Webhooks after deploy) and store them — never commit them:

```
firebase functions:secrets:set STRIPE_SECRET_KEY      # ${STRIPE_SECRET_KEY}  (use the test-mode sk_test_… key first)
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  # ${STRIPE_WEBHOOK_SECRET} (signing secret of the webhook below)
```

Deploy, then register the webhook endpoint (the deployed `stripeWebhook`
URL) for `checkout.session.completed` (and
`checkout.session.async_payment_succeeded` for delayed methods):

```
npm run deploy:functions
npm run deploy:rules
```

`VITE_STRIPE_PUBLISHABLE_KEY` (`${STRIPE_PUBLISHABLE_KEY}`) is only needed
if a future client page uses Stripe.js directly; the current flow redirects
to hosted Checkout, so the secret never leaves the server.

## Manual end-to-end test (test mode)

1. Call `createManagedProduct` as a platform admin:
   `{ "name": "Harbour Walk (e-guide)", "amountCents": 1000,
  "currency": "aud", "taxCode": "txcd_10103100" }`.
2. Note the returned `productId`, then call
   `createManagedCheckoutSession` as a signed-in guest with it.
3. Open `checkoutUrl`, pay with the test card above, and try different
   billing addresses to see tax calculated per location.
4. Confirm `managed_payments/{paymentId}` flips to `paid` and
   `payments/{sessionId}` exists. Redeliver the event from the Dashboard to
   confirm idempotency (no duplicate writes beyond merge).

## Rules

- `managed_products`: readable by signed-in users, server-only writes.
- `managed_payments`: readable by the buyer or platform admins,
  server-only writes. Financial records stay separate from profile data.
