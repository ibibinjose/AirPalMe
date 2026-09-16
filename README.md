# AirPal.me

> Canonical merged build: full codebase merged here from the previous build folder,
> same Firebase project `airpalme-app`. No remote wired yet — say the word before pushing.

Scan-first guest concierge and precinct guide.

Guests never create an account. Hosts print a QR. Discovery, stay, campus, and street markers share one shell.

Production: https://airpal.me · Firebase project `airpalme-app`.

Agent / contributor source of truth: **[AGENTS.md](./AGENTS.md)**.

```
npm install
npm run dev          # http://localhost:3000
npm test
npm run verify       # typecheck, lint, tests, web + functions build, rules
npm run ci           # clean install, verify, dependency audit
```

Copy `.env.example` → `.env`. Restart Vite after changing `VITE_*` values.

Primary chrome is **Scan / Stay / Explore**. Bios, clubs, companion, and operator tools sit behind role-specific menus.

North-star metric: **WQGA/Context** (weekly qualified guest actions per active QR context). Dictionary: `docs/analytics-event-dictionary.md`. Checklist: `docs/analytics-checklist.md`.

Set `ENFORCE_APPCHECK=true` on Functions once a reCAPTCHA site key is live. Callables already consume App Check tokens.

| Who | Where |
| --- | --- |
| Anyone | `/scan` Scan · `/concierge` Stay · `/` Explore · `/calendar` |
| Guest | `/g/:id` stay · `/q/:id` marker |
| Host | `/start` · `/host` |
| Campus | `/c/:id` |
| Walks | `/guide` |
| Companion | `/companion` |

## Local time and maps

The top bar, Tonight, Open now, walk times, and weather share one zoned clock. See [docs/local-now.md](./docs/local-now.md). Do not use UTC `toISOString()` dates for “today”.

Stay maps need `VITE_GOOGLE_MAPS_API_KEY`. Setup: [docs/maps.md](./docs/maps.md). Vite bakes the key in at **build** time — rebuild before hosting deploy.

## Docs

| Doc | Topic |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | Conventions for people and coding agents |
| [docs/app-mind-map.md](./docs/app-mind-map.md) | Full app map + usefulness plan |
| [docs/host-tickets.md](./docs/host-tickets.md) | Guest staff tickets → host inbox + push |
| [docs/freshness.md](./docs/freshness.md) | Hours / events / Wi-Fi re-verify SLAs |
| [docs/maps.md](./docs/maps.md) | Google Maps key, APIs, CSP, deploy |
| [docs/local-now.md](./docs/local-now.md) | Timezone, GPS, tonight, open hours |
| [docs/email-setup.md](./docs/email-setup.md) | Auth email from `email.airpal.me` |
| [docs/phone-login.md](./docs/phone-login.md) | SMS login |
| [docs/analytics-event-dictionary.md](./docs/analytics-event-dictionary.md) | Event contract |
| [docs/analytics-checklist.md](./docs/analytics-checklist.md) | Instrumentation status |
| [docs/client-handoff.md](./docs/client-handoff.md) | Handoff, agreed scope, real-app bar |

## Deploy

```
npm run deploy:hosting     # web
npm run deploy:functions
npm run deploy:rules
npm run deploy             # verify + hosting, functions, rules
```

Or: `npx firebase deploy --only hosting,functions,firestore:rules --project airpalme-app` after a local `npm run build` that saw `.env`.
