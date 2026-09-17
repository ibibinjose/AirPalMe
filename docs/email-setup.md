# AirPal.me authentication email setup

**Goal:** Password reset and email verification come from AirPal, not `noreply@airpalme-app.firebaseapp.com`.

See also [AGENTS.md](../AGENTS.md) and [phone-login.md](./phone-login.md).

**Project:** `airpalme-app`  
**Site:** https://airpal.me  
**DNS host today:** Spaceship (`launch1.spaceship.net` / `launch2.spaceship.net`)  
**Action handler (already in the app):** https://airpal.me/auth/action

Do not invent DNS values. Firebase shows the exact TXT/CNAME strings after you click **Customize domain**. Copy those into Spaceship.

---

## What is already true

| Piece | Status |
|---|---|
| App sends verify + reset via Firebase Auth | Yes (`src/lib/auth-mail.ts`) |
| Branded HTML templates in repo | Yes (`emails/verify-account.html`, `emails/reset-password.html`) |
| Handler page | Yes (`/auth/action`) |
| `email.airpal.me` DNS (SPF + `firebase=airpalme-app`) | Verified (`customDomainState: SUCCEEDED`) |
| Apex MX / SPF for `hello@airpal.me` | Live (17 Sep 2026): `mx1/mx2.improvmx.com` + `v=spf1 include:spf.improvmx.com ~all`. Hosting TXT `hosting-site=airpalme-app` kept. DMARC not set (optional). |
| Firebase **Apply custom domain** | Not applied — mail still From `noreply@airpalme-app.firebaseapp.com` |
| Template HTML + action URL in Console | Still Firebase defaults — links still open `airpalme-app.firebaseapp.com/__/auth/action` |

The API refuses `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`. Paste templates and set the action URL in [Authentication → Templates](https://console.firebase.google.com/project/airpalme-app/authentication/emails), then click **Apply custom domain**. Until that click, Google still sends as **`noreply@airpalme-app.firebaseapp.com`**.

---

## Recommended layout

Use a **mail subdomain** so website DNS on `airpal.me` stays untouched.

| Address | Purpose |
|---|---|
| `noreply@email.airpal.me` | From address for verify + password reset (Firebase sends these) |
| `hello@airpal.me` | Human inbox (contact, replies). Separate from Firebase sending. |
| https://airpal.me/auth/action | Link inside those emails |

`email.airpal.me` is the sending domain. It is not a website.

---

## Part A — Sending (verify + reset) — Firebase custom domain

This uses Google’s mailers on **your** domain. You do not need SendGrid/Resend for this.

### 1. Firebase Console

1. Open [Authentication → Templates](https://console.firebase.google.com/project/airpalme-app/authentication/emails).
2. Confirm **Authorized domains** includes `airpal.me` (Authentication → Settings → Authorized domains). Add it if missing.
3. Edit **Email address verification**:
   - **Customize action URL** → `https://airpal.me/auth/action`
   - Paste the HTML from `emails/verify-account.html` (keep `%LINK%`, `%DISPLAY_NAME%`, `%EMAIL%`).
   - Subject: `Confirm your AirPal.me email`
   - Sender name: `AirPal.me`
   - Click **Customize domain** → enter **`email.airpal.me`** (not `airpal.me`).
4. Firebase shows a table of **TXT** and **CNAME** records. Copy them.
5. Repeat domain + action URL on **Password reset** (and Email address change if shown). One domain verification covers all templates once applied.

### 2. Spaceship DNS

DNS → `airpal.me` → add **exactly** the records Firebase displayed.

Typical shape (values **must** come from the console):

| Type | Host | Value (example only) |
|---|---|---|
| TXT | `email` | Firebase verification string (`google-site-verification=…` or similar) |
| CNAME | `email` or a Firebase-generated hostname | Firebase mail CNAME |
| TXT | `email` | `v=spf1 include:_spf.firebasemail.com ~all` (or the SPF Firebase shows) |

Rules:

- One `v=spf1` TXT per host. Do not create a second SPF on `email`.
- Do not put Firebase mail records on `@` unless Firebase asked for the apex.
- Apex already has TXT `hosting-site=airpalme-app`. Leave it. That is Hosting, not mail.

Wait until Templates shows **Verification complete**, then click **Apply custom domain**.

### 3. Confirm

Send a real reset from https://airpal.me/start?tab=reset to an inbox you control.

Pass:

- From looks like **AirPal.me \<noreply@email.airpal.me\>**
- Button opens **https://airpal.me/auth/action?mode=…**
- Mail is in Inbox, not Spam (first send can still be Promotions; that is OK if From is branded)

---

## Part B — Receiving `hello@airpal.me` (required for brand)

Firebase custom domain **does not** create a mailbox. Contact, replies, and store-review support use `hello@airpal.me` in the product (`src/lib/legal.ts`). Without MX, that address **bounces**.

Forward `hello@airpal.me` → `bibin.inc@gmail.com`. Do **not** point apex MX at Firebase.

### Preferred: Spaceship Email Forwarding (same registrar as the domain)

NS is already `launch1.spaceship.net` / `launch2.spaceship.net`, so Spaceship can add MX for you.

1. Open [Spaceship Domain Manager](https://www.spaceship.com/) → **airpal.me**.
2. Side panel → **Email Forwarding**.
3. **To a single address** (or **To multiple addresses** with From `hello`):
   - Forwarded from: `hello@airpal.me` (or catch-all `@airpal.me`)
   - Forwarding to: `bibin.inc@gmail.com`
4. **Set rule**. Spaceship writes MX. Do not delete `email.airpal.me` TXT/SPF — that is Firebase Auth sending, a different host.
5. Leave the existing apex TXT `hosting-site=airpalme-app` (Firebase Hosting). If Spaceship adds an apex SPF TXT, it must be **one** `v=spf1 …` record, not a second SPF.
6. In Gmail: wait for a “forwarding confirmation” from Spaceship/ImprovMX-style sender if they send one, click confirm. Then add `hello@airpal.me` under **Send mail as** (Gmail Settings → Accounts) so replies show AirPal, not Gmail.

### If Email Forwarding is not offered: ImprovMX on Advanced DNS

Create a free alias `hello@airpal.me` → `bibin.inc@gmail.com` at [improvmx.com](https://improvmx.com), then in Spaceship **Advanced DNS** add:

| Type | Host | Value | Priority |
|---|---|---|---|
| MX | `@` | `mx1.improvmx.com` | 10 |
| MX | `@` | `mx2.improvmx.com` | 20 |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

Confirm:

```
dig +short MX airpal.me
```

You should see mx records. Then send a test to `hello@airpal.me` from a **non-Gmail** address and check `bibin.inc@gmail.com` (including Spam).

---

## What you should not do

- Do not set Firebase SMTP to a personal Gmail account. Deliverability is poor and passwords leak into console settings.
- Do not use Cloudflare Email Sending unless `airpal.me` DNS is moved to Cloudflare. Today NS is Spaceship.
- Do not skip **Customize action URL**. Default links go to `*.firebaseapp.com`, not airpal.me.

---

## After it works

Tick these:

- [ ] `airpal.me` authorized in Firebase Auth
- [ ] Action URL = `https://airpal.me/auth/action`
- [ ] Templates pasted from `emails/`
- [ ] `email.airpal.me` verified and **Apply custom domain** clicked
- [ ] Test verify email received from `@email.airpal.me`
- [ ] Test reset email received from `@email.airpal.me`
- [ ] Reset link sets a new password on `/auth/action`
- [ ] `hello@airpal.me` forwards to `bibin.inc@gmail.com` (Spaceship Email Forwarding or ImprovMX MX)
- [ ] Test mail to `hello@airpal.me` arrives
- [ ] Contact / legal show `hello@airpal.me` (`src/lib/legal.ts`)
