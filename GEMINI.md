# Gemini — AIRPAL Ecosystem

Read **`AGENTS.md`**, then **`docs/AIRPAL.md`** (the single source of truth) before any edit.

This is a Vite SPA (not Next.js) on Firebase project `airpalme-app`, with two Capacitor shells from one codebase: `me.airpal.app` (AirPal) + `me.airpal.pass` (AirPal Pass, tickets/events only). Web stays one all-in-one app.

### Product Architecture:

- **AIRPAL:** Master brand ("Life Made Easy") with unified Firebase Auth and Firestore.
- **AirPal.Me:** Personal Life & Identity companion (`/@handle`, `/now`, weather & outfit recommendations, `/calendar`, `/plan`).
- **AirPal Pass:** Events, Deals & Experiences hub (`/pass`, `/me/tickets`, `/deals`, `/scan`, `/event`).

V1 scope, trust rails, and the rebuild plan live in `docs/AIRPAL.md` Parts B, C, G. Do not rebuild excluded surfaces (Part B3).

Full rules: `docs/AIRPAL.md`. Store pack: `docs/store/README.md`.
