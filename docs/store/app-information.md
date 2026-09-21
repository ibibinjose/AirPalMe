# App Store Connect + Play Console — App Information (paste)

Use this on **App Store Connect → Apps → AirPal → App Information** and **Play Console → AirPal → Grow / Policy**.

**You still click Save in each console.** This file is the answers. It cannot submit the listing for you.

Legal: **SarvamDaily Pty Ltd** trading as **AirPal.Me** · ABN **83 702 462 977** · NSW, Australia  
Apple Team: ZEN KAPITAL PTY LTD (`26WGXSNG58`) · Apple ID **6811351322** · Bundle / SKU **`me.airpal.app`**  
Support: AirPalMe@gmail.com · hello@airpal.me  
Privacy https://airpal.me/privacy · Terms https://airpal.me/terms · Contact https://airpal.me/contact

Native app is **18+**. Website guests can browse. Native iOS/Android require an account.

This pack: iOS **2.0.0 (12)** · Android **versionCode 6** · Apple ID **6811351322**. TestFlight: select **2.0.0 (12)**, not 1.0 (`docs/store/testflight.md`).

---

## App Store Connect — Localizable + General

| Field | Paste |
| --- | --- |
| Name (English Australia, ≤30) | `AirPal.Me` |
| Subtitle (≤30) | `Discover places, stays & plans` |
| Bundle ID | `me.airpal.app` (locked) |
| SKU | `me.airpal.app` (locked) |
| Apple ID | `6811351322` (locked) |
| Primary Language | English (Australia) |
| Primary Category | **Travel** |
| Secondary Category | **Lifestyle** |
| License Agreement | Keep **Apple’s Standard License Agreement**. In-app Terms at https://airpal.me/terms apply at signup. |
| Content Rights | See below |
| Age Ratings | See below |
| Encryption | Already set in Xcode: `ITSAppUsesNonExemptEncryption` = **NO**. Do **not** upload export docs. |
| App Store Server Notifications | Leave **empty**. No IAP, no auto-renewable subscriptions. |
| App-Specific Shared Secret | Do **not** create. No subscriptions. |
| Vietnam Game License | Skip. Not a game. |
| Regulated Medical Device | **No.** Not Medical / Health & Fitness as primary. Age-rating medical answers are None. |
| Digital Services Act | Keep **trader**. Contact AirPalMe@gmail.com · SarvamDaily Pty Ltd, New South Wales, Australia. |
| Add Labels and Markings | Skip unless a later version is a game in Vietnam. |

### Content Rights (Edit)

1. Does this app contain, show, or access third-party content? **Yes**  
   Users publish bios, listings, plans, photos, and reviews. Directory import may copy a public Google/OSM listing the host confirms.
2. Do you have the necessary rights for this content? **Yes**  
   Users grant a licence in Terms. Report / block / admin takedown is in the app. Third-party maps/photos follow their terms.

---

## App Store Connect — Age Ratings

Tap **Set Up Age Ratings**. For each row pick **None / Infrequent / Frequent** (or Yes/No where shown). These answers match the live app.

### In-App Controls

| Item | Answer | Why |
| --- | --- | --- |
| Parental Controls | **None** | No parent dashboard or kid mode. |
| Age Assurance | **Infrequent** | Signup asks date of birth and blocks under 18. No Declared Age Range API and no government ID scan. |

### Capabilities

| Item | Answer | Why |
| --- | --- | --- |
| Unrestricted Web Access | **None** | No in-app browser. External links open Safari. |
| User-Generated Content | **Frequent** | Bios, listings, plans, photos, reviews are the product. |
| Social Media | **Infrequent** | Public bios, follow/like, Discover, Circle. Not a public social feed as the primary product. Marketplace + people layer. |
| Social Media Disabled for Users Under 13 | **Yes** | Whole app is 18+. Under-13 cannot create an account. |
| Messaging and Chat | **Frequent** | Match chat, plan comments, Circle messages. Tied to a marketplace/plan interaction. |
| Advertising | **None** | No ad SDK, no third-party ads. Featured listings are first-party catalogue, not an ad network. |

### Mature Themes

| Item | Answer | Why |
| --- | --- | --- |
| Profanity or Crude Humor | **Infrequent** | Possible in UGC. Report/block exists. App copy is clean. |
| Horror/Fear Themes | **None** | |
| Alcohol, Tobacco, or Drug Use or References | **Infrequent** | Pubs, bars, and hotels can appear as places. The app does not sell alcohol or drugs. |

### Medical or Wellness

| Item | Answer | Why |
| --- | --- | --- |
| Medical or Treatment Information | **None** | |
| Health or Wellness Topics | **Infrequent** | Experience categories can include fitness/wellness. No treatment, no diagnosis. |

### Sexuality or Nudity

| Item | Answer |
| --- | --- |
| Mature or Suggestive Themes | **None** |
| Sexual Content or Nudity | **None** |
| Graphic Sexual Content and Nudity | **None** |

(UGC policy forbids this; report/remove. Do not mark Frequent.)

### Violence

| Item | Answer |
| --- | --- |
| Cartoon or Fantasy Violence | **None** |
| Realistic Violence | **None** |
| Prolonged Graphic or Sadistic Realistic Violence | **None** |
| Guns or Other Weapons | **None** |

### Chance-Based Activities

| Item | Answer | Why |
| --- | --- | --- |
| Gambling | **None** | |
| Simulated Gambling | **None** | |
| Contests | **Infrequent** | Optional giveaways. Not paid loot. |
| Loot Boxes | **None** | |

**Expected Apple rating:** 17+ (UGC + messaging). Native accounts are still 18+ in-app.

---

## App Store Connect — Version / Privacy (when you submit)

Privacy policy URL: `https://airpal.me/privacy`  
Support URL: `https://airpal.me/contact`  
Marketing URL: `https://airpal.me`  
Copyright: `2026 SarvamDaily Pty Ltd`

App Privacy (nutrition label) — align with `docs/store/play-data-safety.md`:

- Precise Location — optional, App Functionality, not used for tracking  
- Photos — optional, App Functionality  
- Email, Phone, Name, User ID — Account  
- Product Interaction — App Functionality / Analytics (no ads)  
- Purchase History — App Functionality (Stripe; no card numbers in the app)  
- Not collected: Contacts, Health, Browsing History, Advertising Data  
- Tracking: **No**. Do not show ATT.  
- Data used to track: **No**. Data linked to identity: account fields yes.

Review notes: paste `docs/store/reviewer-notes.md`.

---

## Play Console — Store listing

| Field | Paste |
| --- | --- |
| App name (≤50) | `AirPal` |
| Short description (≤80) | `Discover places, events, stays and plans around you. Life Made Easy.` |
| Full description | Use the Description in `docs/store/listing.md` |
| App category | **Travel & Local** |
| Tags | travel, local, events, maps (pick available tags) |
| Contact email | AirPalMe@gmail.com |
| Phone | leave blank unless you add a public number |
| Website | https://airpal.me |
| Privacy policy | https://airpal.me/privacy |
| Graphic | `docs/store/images/play-feature-graphic-1024x500.png` |
| Icon | `public/icon-512.png` |
| Phone screenshots | `docs/store/images/screenshots/*-1080x1920.png` |

### Play — App content / policy

| Question | Answer |
| --- | --- |
| Ads | **No** |
| Target age | **18 and over**. Not designed for children. Families Policy: **No**. |
| News app | **No** |
| COVID-19 | **No** |
| Data safety | Paste `docs/store/play-data-safety.md` |
| Advertising ID | **No**. Manifest has no `AD_ID`. |
| Financial features | Payments for **real-world** bookings via Stripe. Not a digital goods store. No IAP. |
| Health | **No** regulated device |
| Government / political | **No** |
| UGC | **Yes**. Users create bios, listings, plans, reviews. Moderation: report, block, admin review. |
| Location | Precise location **optional**, when in use, for nearby places. |

### Play — IARC / content rating

When IARC asks:

- Violence: **None**
- Sexual content: **None**
- Language / profanity: **Mild** (UGC)
- Controlled substances: **Alcohol references in venue listings** (infrequent); no drug sales
- User interaction: **Yes** — users communicate, share UGC, optional location
- Digital purchases: **Users can buy real-world bookings/tickets** (not in-app currency)
- Age: expect **Mature 17+** / store as **18+** because accounts are 18+

---

## Do not fill

- Production / sandbox App Store Server Notification URLs  
- In-app purchase shared secret  
- Vietnam game licence  
- Medical device declaration (answer No if the form still appears)  
- Custom encryption documentation (HTTPS only, OS crypto)

---

## After you Save

1. App Store Connect → **Age Ratings** Save, then **Content Rights** Save.  
2. Version page: support URL, privacy URL, review notes, screenshots, build **11** (after the location-purpose-string upload).  
3. Play Console: Data safety + Target audience 18+ + UGC declaration.  
4. Submit for Review / Send for review. This machine cannot click Submit.
