# AirPal.me

**Life Made Easy.** One marketplace: people, places, experiences, things, discovery, trips.

Production: https://airpal.me · Firebase `airpalme-app` · Native `me.airpal.app`.

**Agents (Grok, Claude, Gemini, Muse, Cursor, Copilot):** read **[AGENTS.md](./AGENTS.md)** then **[docs/CANON.md](./docs/CANON.md)** before editing. Do not revert shipped chrome, style, or features.

Website guests browse. Native iOS/Android require an account. Tabs: What's on · Plan · Scan · Stay · Me.

```
npm install
npm run dev          # http://localhost:3000
npm test
npm run verify       # typecheck, lint, tests, web + functions build, rules
npm run ci           # clean install, verify, dependency audit
```

Copy `.env.example` → `.env`. Restart Vite after changing `VITE_*` values.

Primary chrome is **What's on / Plan / Scan / Stay / Me**. Mate is `/mate`, not a tab. North star: Completed AirPal Experiences. Analytics dictionary: `docs/analytics-event-dictionary.md`.

Set `ENFORCE_APPCHECK=true` on Functions once a reCAPTCHA site key is live. Callables already consume App Check tokens.

| Who | Where |
| --- | --- |
| Anyone (web) | `/` What's on · `/plan` · `/scan` · `/concierge` Stay · `/calendar` |
| Person | `/me` · `/@handle` · `/circle` · `/start` |
| Stay guest | `/g/:id` (device session) · `/q/:id` marker |
| Host / business | `/host` · `/business` · `/join` |
| Mate | `/mate` demand · `/companion` supply |
| Admin | `/admin` |

Full case list: [docs/CANON.md](./docs/CANON.md) §5. Store pack: [docs/store/README.md](./docs/store/README.md).

## Local time and maps

The top bar, Tonight, Open now, walk times, and weather share one zoned clock. See [docs/local-now.md](./docs/local-now.md). Do not use UTC `toISOString()` dates for “today”.

Stay maps need `VITE_GOOGLE_MAPS_API_KEY`. Setup: [docs/maps.md](./docs/maps.md). Vite bakes the key in at **build** time — rebuild before hosting deploy.

## Docs

| Doc                                                                        | Topic                                    |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [AGENTS.md](./AGENTS.md)                                                   | Product rules for people and coding agents |
| [docs/CANON.md](./docs/CANON.md)                                           | Shipped freeze — do not revert           |
| [docs/app-mind-map.md](./docs/app-mind-map.md)                             | Full app map + usefulness plan           |
| [docs/host-tickets.md](./docs/host-tickets.md)                             | Guest staff tickets → host inbox + push  |
| [docs/freshness.md](./docs/freshness.md)                                   | Hours / events / Wi-Fi re-verify SLAs    |
| [docs/maps.md](./docs/maps.md)                                             | Google Maps key, APIs, CSP, deploy       |
| [docs/local-now.md](./docs/local-now.md)                                   | Timezone, GPS, tonight, open hours       |
| [docs/email-setup.md](./docs/email-setup.md)                               | Auth email from `email.airpal.me`        |
| [docs/phone-login.md](./docs/phone-login.md)                               | SMS login                                |
| [docs/analytics-event-dictionary.md](./docs/analytics-event-dictionary.md) | Event contract                           |
| [docs/analytics-checklist.md](./docs/analytics-checklist.md)               | Instrumentation status                   |
| [docs/client-handoff.md](./docs/client-handoff.md)                         | Handoff, agreed scope, real-app bar      |

## Deploy

```
npm run deploy:hosting     # web
npm run deploy:functions
npm run deploy:rules
npm run deploy             # verify + hosting, functions, rules
```

Or: `npx firebase deploy --only hosting,functions,firestore:rules --project airpalme-app` after a local `npm run build` that saw `.env`.
