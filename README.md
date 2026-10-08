# AIRPAL — Master Brand & Ecosystem

**Life Made Easy.** Turn "I want to do something" into a completed real-world experience.

Production: [https://airpal.me](https://airpal.me) · Firebase `airpalme-app` · Native Capacitor `me.airpal.app`.

---

## The Dual-Product Architecture

To eliminate bloat and maintain laser-focused user mental models, **AIRPAL** separates products at the UX level into two dedicated lenses powered by one shared account, trust engine, and database:

### 1. AirPal.Me — Personal Life & Identity
> **"Plan your day. Organise your life. Share who you are."**

Your personal life companion.
* **Personal Profile & Digital Identity:** Fast link-in-bio at `/@handle` (`/bio/setup`, `/bio/edit`).
* **Daily Planner & Vibe Matcher:** Instant "What now?" suggestions at `/now` with honest open-now hours.
* **Weather & Daily Outfit Engine:** Live temperature, condition, and smart outfit advice.
* **Life Calendar & Schedule:** Personal agenda, ICS exports, and day plans at `/calendar`.
* **Co-Planning with Friends:** Lightweight hangout threads, invite links, and private memories at `/plan`.

### 2. AirPal Pass — Events, Deals & Experiences
> **"Discover what's happening. Get access. Save money."**

Your scannable access pass to city experiences.
* **What's On & Festivals:** Curated cultural events, Indian festivals (Diwali, Dandiya), concerts, and nightlife at `/pass` and `/events`.
* **Passbook Wallet:** Live digital QR pass cards, Apple Wallet & Google Wallet passes at `/me/tickets`.
* **Member Dining Deals:** Exclusive local perks and dining vouchers at `/deals`.
* **Organiser & Door Operations:** Instant QR ticket door check-in scanner at `/scan` and event hosting tools at `/event`.

**Unified Core:** Both products share the exact same user profile, Firebase Auth, and database. Any pass or ticket booked in AirPal Pass automatically enriches the user's AirPal.Me schedule.

---

## Developer Quickstart

Agents & Contributors: read [**`AGENTS.md`**](./AGENTS.md) and [**`docs/AIRPAL.md`**](./docs/AIRPAL.md) (the binding single source of truth) before editing code.

Copy `.env.example` → `.env` first. Restart Vite after changing `VITE_*` values.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # run unit & integration tests (Vitest)
npm run verify       # full verification gate (types, lint, test, build, rules, secrets, SEO)
npm run cap:sync     # sync web bundle to iOS and Android Capacitor containers
npm run deploy       # verify + hosting, functions, firestore rules
```

Full commands, deploy targets, and doc index live in [`docs/AIRPAL.md`](./docs/AIRPAL.md) (Parts D + H).
