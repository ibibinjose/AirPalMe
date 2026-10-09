# App Store Connect + Play Console — App Information for AirPal Pass (paste)

Use this on **App Store Connect → Apps → AirPal Pass → App Information** and **Play Console → AirPal Pass → Grow / Policy**.

**You still click Save in each console.** This file is the answers. It cannot submit the listing for you.

Legal: **SarvamDaily Pty Ltd** trading as **AirPal.Me** · ABN **83 702 462 977** · NSW, Australia  
Apple Team: ZEN KAPITAL PTY LTD (`26WGXSNG58`) · Apple ID **Confirm: create the AirPal Pass app record first** · Bundle / SKU **`me.airpal.pass`**  
Support: AirPalMe@gmail.com · hello@airpal.me  
Privacy https://airpal.me/privacy · Terms https://airpal.me/terms · Contact https://airpal.me/contact

Native app is **18+** (accounts). Pass browses events and deals without an account; sign-in is needed only to hold tickets.

Same AirPal account as the AirPal app and https://airpal.me.

---

## App Store Connect — Localizable + General

| Field                          | Paste                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Name (English Australia, ≤30)  | `AirPal Pass`                                                                                         |
| Subtitle (≤30)                 | `Tickets, events & deals`                                                                             |
| Bundle ID                      | `me.airpal.pass` (locked, via `ios/App/Pass.xcconfig`)                                                |
| SKU                            | `me.airpal.pass`                                                                                      |
| Apple ID                       | Confirm after creating the app record                                                                 |
| Primary Language               | English (Australia)                                                                                   |
| Primary Category               | **Entertainment**                                                                                     |
| Secondary Category             | **Lifestyle**                                                                                         |
| License Agreement              | Keep **Apple’s Standard License Agreement**. In-app Terms at https://airpal.me/terms apply at signup. |
| Content Rights                 | See below                                                                                             |
| Age Ratings                    | See below                                                                                             |
| Encryption                     | `ITSAppUsesNonExemptEncryption` = **NO** (shared target). Do **not** upload export docs.              |
| App Store Server Notifications | Leave **empty**. No IAP, no auto-renewable subscriptions.                                             |
| App-Specific Shared Secret     | Do **not** create. No subscriptions.                                                                  |
| Digital Services Act           | Keep **trader**. Contact AirPalMe@gmail.com · SarvamDaily Pty Ltd, New South Wales, Australia.        |

### Content Rights (Edit)

1. Does this app contain, show, or access third-party content? **Yes**  
   Organisers publish events; local businesses publish deals. Users hold tickets.
2. Do you have the necessary rights for this content? **Yes**  
   Organisers grant a licence in Terms. Report / admin takedown is in the app.

---

## App Store Connect — Age Ratings

Tap **Set Up Age Ratings**. These answers match the Pass shell UI (Pass / Events / Tickets / Scan / Me — no messaging, no social feed).

### In-App Controls

| Item              | Answer         | Why                                                                                                 |
| ----------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| Parental Controls | **None**       | No parent dashboard or kid mode.                                                                    |
| Age Assurance     | **Infrequent** | Signup asks date of birth and blocks under 18. No Declared Age Range API and no government ID scan. |

### Capabilities

| Item                                     | Answer         | Why                                                                                                          |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Unrestricted Web Access                  | **None**       | No in-app browser. External links open Safari.                                                               |
| User-Generated Content                   | **Infrequent** | Organiser events and business deals; users consume and hold tickets. No bios, no social graph in this shell. |
| Social Media                             | **None**       | No social features in the Pass shell.                                                                        |
| Social Media Disabled for Users Under 13 | **Yes**        | Whole account system is 18+.                                                                                 |
| Messaging and Chat                       | **None**       | No messaging entry in the Pass shell.                                                                        |
| Advertising                              | **None**       | No ad SDK, no third-party ads.                                                                               |

### Mature Themes

| Item                                        | Answer         | Why                                                                              |
| ------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| Profanity or Crude Humor                    | **Infrequent** | Possible in event titles. Report exists. App copy is clean.                      |
| Horror/Fear Themes                          | **None**       |                                                                                  |
| Alcohol, Tobacco, or Drug Use or References | **Infrequent** | Bars and nightlife can appear as venues. The app does not sell alcohol or drugs. |

### Medical or Wellness

| Item                             | Answer   | Why |
| -------------------------------- | -------- | --- |
| Medical or Treatment Information | **None** |     |
| Health or Wellness Topics        | **None** |     |

### Sexuality or Nudity

| Item                              | Answer   |
| --------------------------------- | -------- |
| Mature or Suggestive Themes       | **None** |
| Sexual Content or Nudity          | **None** |
| Graphic Sexual Content and Nudity | **None** |

### Violence

| Item                                             | Answer   |
| ------------------------------------------------ | -------- |
| Cartoon or Fantasy Violence                      | **None** |
| Realistic Violence                               | **None** |
| Prolonged Graphic or Sadistic Realistic Violence | **None** |
| Guns or Other Weapons                            | **None** |

### Chance-Based Activities

| Item               | Answer         | Why                                          |
| ------------------ | -------------- | -------------------------------------------- |
| Gambling           | **None**       |                                              |
| Simulated Gambling | **None**       |                                              |
| Contests           | **Infrequent** | Optional giveaways via deals. Not paid loot. |
| Loot Boxes         | **None**       |                                              |

**Expected Apple rating:** 12+ (confirm in console). Accounts stay 18+ in-app.

---

## App Store Connect — Version / Privacy (when you submit)

Privacy policy URL: `https://airpal.me/privacy`  
Support URL: `https://airpal.me/contact`  
Marketing URL: `https://airpal.me`  
Copyright: `2026 SarvamDaily Pty Ltd`

App Privacy (nutrition label) — align with `docs/store/play-data-safety-pass.md`:

- Precise Location — optional, App Functionality, not used for tracking
- Email, Phone, Name, User ID — Account (only when they sign in to hold tickets)
- Product Interaction — App Functionality / Analytics (no ads)
- Purchase History — App Functionality (Stripe; no card numbers in the app)
- Not collected: Photos library, Contacts, Health, Browsing History, Advertising Data
- Tracking: **No**. Do not show ATT.
- Data used to track: **No**. Data linked to identity: account fields yes.

Review notes: paste `docs/store/reviewer-notes-pass.md`.

---

## Play Console — Store listing

| Field                   | Paste                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| App name (≤50)          | `AirPal Pass`                                                                                  |
| Short description (≤80) | `Event tickets, festivals and member deals. Your pass to experiences.`                         |
| Full description        | Use the Description in `docs/store/listing-pass.md`                                            |
| App category            | **Events**                                                                                     |
| Tags                    | events, tickets, concerts, nightlife (pick available tags)                                     |
| Contact email           | AirPalMe@gmail.com                                                                             |
| Phone                   | leave blank unless you add a public number                                                     |
| Website                 | https://airpal.me                                                                              |
| Privacy policy          | https://airpal.me/privacy                                                                      |
| Graphic                 | `docs/store/images/play-feature-graphic-pass-1024x500.png` (scaffold — replace with final art) |
| Icon                    | `docs/store/images/play-pass-icon-512.png` (scaffold — replace with final art)                 |
| Phone screenshots       | `docs/store/images/screenshots-pass/*-1080x1920.png` (`npm run screenshots:pass`)              |

### Play — App content / policy

| Question               | Answer                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Ads                    | **No**                                                                                          |
| Target age             | **18 and over**. Not designed for children. Families Policy: **No**.                            |
| News app               | **No**                                                                                          |
| COVID-19               | **No**                                                                                          |
| Data safety            | Paste `docs/store/play-data-safety-pass.md`                                                     |
| Advertising ID         | **No**. Manifest has no `AD_ID`.                                                                |
| Financial features     | Payments for **real-world** event tickets via Stripe. No IAP.                                   |
| Health                 | **No** regulated device                                                                         |
| Government / political | **No**                                                                                          |
| UGC                    | **Yes**. Organisers publish events, businesses publish deals. Moderation: report, admin review. |
| Location               | Precise location **optional**, when in use, for nearby events.                                  |

### Play — IARC / content rating

When IARC asks:

- Violence: **None**
- Sexual content: **None**
- Language / profanity: **Mild** (event titles)
- Controlled substances: **Alcohol references in venue listings** (infrequent); no drug sales
- User interaction: **No** direct user-to-user communication in this shell
- Digital purchases: **Users can buy real-world event tickets** (not in-app currency)
- Age: expect **Teen** (confirm); store as **18+** because accounts are 18+

---

## Do not fill

- Production / sandbox App Store Server Notification URLs
- In-app purchase shared secret
- Vietnam game licence
- Medical device declaration (answer No if the form still appears)
- Custom encryption documentation (HTTPS only, OS crypto)

---

## After you Save

1. App Store Connect → create the **AirPal Pass** app record first (new Apple ID + SKU `me.airpal.pass`), then Age Ratings Save, then Content Rights Save.
2. Version page: support URL, privacy URL, review notes (`reviewer-notes-pass.md`), screenshots, Pass build.
3. Play Console: new **AirPal Pass** app, Data safety + Target audience 18+ + UGC declaration.
4. Submit for Review / Send for review. This machine cannot click Submit.
