# Claude / Muse — AirPal.me

Read **`AGENTS.md`**, then **`docs/AIRPAL.md`** (the single source of truth) before any edit.

- Stack is Vite + React + TypeScript + Tailwind + Firebase + Capacitor. Do not migrate to Next.js.
- V1 scope, trust rails, and the rebuild plan live in `docs/AIRPAL.md` Parts B, C, G. Do not rebuild excluded surfaces (Part B3).
- Smallest change. Reuse `shared/` and existing pages in `src/app/routes.tsx`.
- Verify: `npm run verify`. Native: `npm run cap:sync`.
