# AirPal.me

**Life Made Easy.** Turn "I want to do something" into a completed real-world experience.

Production: https://airpal.me · Firebase `airpalme-app` · Native `me.airpal.app`.

**Agents: read [AGENTS.md](./AGENTS.md), which boots you into [docs/AIRPAL.md](./docs/AIRPAL.md) — the single source of truth.**

## Quickstart

Copy `.env.example` → `.env` first. Restart Vite after changing `VITE_*` values.

```
npm install
npm run dev          # http://localhost:3000
npm test
npm run verify       # gate before ship or commit
npm run deploy       # verify + hosting, functions, rules
```

Full commands, deploy targets, and the doc index live in `docs/AIRPAL.md` (Parts D + H).
