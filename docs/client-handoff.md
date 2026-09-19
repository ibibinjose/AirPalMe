# AirPal.me — client pack

Prepared by Bibin Jose, 16 September 2026.

This file is the handoff and the agreed scope in one place. No passwords. Reset yours from the login page.

---

# AirPal.me handoff

Prepared by Bibin Jose, 16 September 2026

## What this app does

AirPal connects people with the people, places, things and experiences that make life easier — scan a code, no app store, no account for guests.

## Where it lives

Live at: https://airpal.me  
Admin login: `bibin.inc@gmail.com`  
Sign-in: https://airpal.me/start  
Password reset works from the login page (Forgot password). You can change yours at any time without me. Host tools: https://airpal.me/host

## What is built and working

1. **Guest Scan / Stay / Explore** — QR into a stay, street marker, or campus. Wi-Fi, dining, staff tickets, maps, and what’s around. Guests browse without signing in.
2. **Live precinct catalog** — Places, properties, and menus come from Firestore (The Rocks venues, Harbour Hotel Sydney stay, plus host-created stays). Empty lists show a real empty state, not a blank screen.
3. **Host and operator tools** — Host workspace (place, dining, print QRs, tickets). Calendar, hangout plans, bios/@handles, Circle, Club, companion applications.
4. **Account** — Email + password, phone SMS, verify email, forgot-password from `/start` and Settings. Reset completes on https://airpal.me/auth/action.
5. **Product shell** — Custom domain, favicon, share preview, branded 404, logo and colours, loading and empty states, client error events in the analytics ledger.

## What is not built yet

This is deliberate, not forgotten.

1. **Paid experiences and host payouts** — Plans can be created; ticketed “Experiences” are marked Coming Soon. Stripe checkout is in the functions code but not on for live guest payments.
2. **Mail that looks like AirPal** — Reset and verify emails still send From `noreply@airpalme-app.firebaseapp.com` with Firebase’s default copy and a firebaseapp.com link. DNS for `email.airpal.me` is verified; the Firebase Console still needs **Apply custom domain**, branded HTML from `emails/`, and action URL `https://airpal.me/auth/action`. Steps: [email-setup.md](./email-setup.md).
3. **`hello@airpal.me` inbox** — Contact / legal in the product now show `hello@airpal.me`. Apex still had **no MX** at last check; enable Spaceship **Email Forwarding** (`hello` → `bibin.inc@gmail.com`) or the ImprovMX records in [email-setup.md](./email-setup.md) Part B, or mail bounces.
4. **App Check enforcement** — Functions can consume reCAPTCHA tokens; `ENFORCE_APPCHECK=true` is off until a live site key is locked in.

## What I would suggest next

1. Finish auth email in Firebase Console (templates + Apply custom domain), roughly **0.5 day**
2. Turn on Spaceship Email Forwarding for `hello@airpal.me` → `bibin.inc@gmail.com` (MX), roughly **15 minutes** once you are in Domain Manager
3. Turn on paid experiences (Stripe live keys, host payouts, take down Coming Soon), roughly **5–8 days**
4. Enforce App Check on callables once the reCAPTCHA site key is live, roughly **1 day**

## Who owns what

| Thing                                              | Account is in the name of                                                              | Who pays                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Domain (`airpal.me`, Spaceship)                    | SarvamDaily Pty Ltd trading as AirPal.Me                                               | Operator                                                          |
| Hosting (Firebase Hosting, project `airpalme-app`) | Same Google / Firebase project                                                         | Operator (Google Cloud billing)                                   |
| Database (Cloud Firestore + Storage)               | Same Firebase project                                                                  | Operator                                                          |
| Payments (Stripe)                                  | Wired in code; live guest checkout not on                                              | Operator, when experiences go live                                |
| Email sending (Firebase Authentication)            | Same Firebase project                                                                  | Included with Auth; From-domain still default until Console apply |
| Error tracking                                     | First-party `client_error` events in the analytics ledger; GA4 when the guest consents | Operator (Firebase / GA4)                                         |

I will never send you a password in writing. Reset it from the login page.

## What this app needs to run

- **Firebase** project `airpalme-app` — Hosting, Authentication, Firestore, Cloud Functions (`us-central1`), Storage
- **Google Maps** — Maps JavaScript API, Places API (New), Maps Embed API; browser key restricted to `airpal.me` / localhost
- **Open-Meteo** — weather on the local-now bar (no key)
- **Firebase / Google Analytics** — optional, behind analytics consent
- **Stripe** — only when paid experiences are switched on
- **Capacitor** — iOS/Android shells (`me.airpal.app`); store listing is separate from the live website

Env names only (values stay in `.env` / Functions config, never in this note): `VITE_FIREBASE_*`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_FIREBASE_VAPID_KEY` (host ticket push), `PLATFORM_ADMIN_EMAILS`, `STRIPE_SECRET_KEY` when paying, `ENFORCE_APPCHECK` when you enforce App Check.

## If something breaks

Email me at **bibin.inc@gmail.com**. I usually reply within one business day.

Client crashes are stored as `client_error` (class, source, path — no passwords or message text). I can see them in Admin → Client errors and in GA4 when analytics consent is on. That is a dashboard, not a pager: I will see it if I am watching those, often before a guest writes in.

---

# AirPal.me scope

Agreed 16 September 2026, between Bibin Jose and the AirPal.me operator

## In this phase

1. Live guest product on https://airpal.me — Scan, Stay, Explore, Calendar, street/campus markers. Guests do not need an account. Catalog, stays, and menus read from Firestore.
2. Host and operator tools — host workspace (place, dining, print QRs, staff tickets), plans, bios/@handles, Circle, Club, companion applications.
3. A real-app shell — custom domain, logo and colours, favicon and share preview, branded 404, empty and loading states, self-serve sign-in and password reset, test logins removed, production debug logs stripped, client errors recorded in the analytics ledger.

## Not in this phase

Not refused, scheduled.

1. Auth email that looks like AirPal (From `noreply@email.airpal.me`, branded HTML, links to https://airpal.me/auth/action). DNS is verified; Firebase Console still needs Apply custom domain and the templates in `emails/`.
2. MX / forwarding so `hello@airpal.me` actually receives (product already uses that address). See [email-setup.md](./email-setup.md) Part B.
3. Paid experiences, Stripe live checkout, and host payouts. The Plan UI can be used; ticketed Experiences stay Coming Soon.
4. Enforcing App Check on Cloud Functions (`ENFORCE_APPCHECK=true` after a live reCAPTCHA site key).
5. App Store / Play listing. Capacitor shells exist (`me.airpal.app`); store submission is a later job.

## Phase two, ready to price when you are

| What                                                                            | Rough effort             | Rough cost                |
| ------------------------------------------------------------------------------- | ------------------------ | ------------------------- |
| Finish auth email in Firebase Console (templates + Apply custom domain)         | 0.5 day                  | Quoted before work starts |
| Enable Spaceship Email Forwarding so `hello@airpal.me` receives                 | 15 min in Domain Manager | Operator                  |
| Paid experiences live (Stripe keys, checkout, host payouts, remove Coming Soon) | 5–8 days                 | Quoted before work starts |
| Enforce App Check on callables                                                  | 1 day                    | Quoted before work starts |
| Store listing (screenshots, review, submit iOS/Android)                         | 3–5 days                 | Quoted before work starts |

## How changes work

Anything not on the "in this phase" list is a phase two item. I will always price it and never simply say no. I would rather build it properly than squeeze it in.

Revisions included: 2 rounds of copy or layout polish on this phase  
Delivery date: 16 September 2026 (this phase handed off)  
Payment: this phase complete on handoff; phase two is quoted and agreed before it starts

---

# Real-app bar (this phase)

Checked against the live product and repo on 16 September 2026.

| #    | Check                               | Status                                                                                                                                 |
| ---- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Deployed to a real domain           | **Done.** https://airpal.me                                                                                                            |
| 2    | Realistic data from a live database | **Done.** Firestore places, properties, menus. Guest Explore reads live `places`.                                                      |
| 3    | No placeholder copy                 | **Done.** Form placeholders only. Paid Experiences “Coming Soon” is scheduled work, not dummy text.                                    |
| 4    | Favicon, page title, link preview   | **Done.**                                                                                                                              |
| 5    | Custom 404                          | **Done.**                                                                                                                              |
| 6    | Logo and colours                    | **Done.**                                                                                                                              |
| 7    | Empty states, never a blank screen  | **Done.**                                                                                                                              |
| 8    | Loading on pages and submit buttons | **Done.**                                                                                                                              |
| 9–10 | Phone / Safari                      | **Engine and iPhone-sized WebKit checked.** Still open once in Safari on a physical iPhone after hosting deploy.                       |
| 11   | Error tracking                      | **Done.** `client_error` in the analytics ledger; Admin shows a count.                                                                 |
| 12   | Login and reset without asking me   | **Done in the app.** `/start` and Settings.                                                                                            |
| 13   | Test accounts deleted               | **Done.** Removed `demo@example.com` and the Firebase test phone `+61433666999`. Operator and real sign-ups kept.                      |
| 14   | Stray debug logs                    | **Done** for production guest console.                                                                                                 |
| 15   | Outgoing email copy and From        | **Arrives, not branded yet.** From `noreply@airpalme-app.firebaseapp.com`. Finish in Console — see [email-setup.md](./email-setup.md). |
