# Claude / Muse — AirPal.me

Read **`AGENTS.md`**, then **`docs/CANON.md`**, then **`docs/AIRPAL_BRAIN.md`** before any edit. The Brain gates new product surfaces.

- Stack is Vite + React + TypeScript + Tailwind + Firebase + Capacitor. Do not migrate to Next.js.
- Do not revert shipped chrome, style, auth rules, or features listed in `docs/CANON.md`.
- Smallest change. Reuse `shared/` and existing pages in `src/app/routes.tsx`.
- Verify: `npm run verify`. Native: `npm run cap:sync`.
- Marketplace status: `.grok/skills/airpal-build/references/build-checklist.md`.
