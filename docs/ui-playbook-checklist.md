# AirPal UI/UX Playbook — build checklist

Source: Modern UI/UX Playbook (pasted 22 Sep 2026). Rule: evolve the existing
system; canon (`docs/CANON.md`, `AGENTS.md`) wins on conflicts. Checked items
are done; unchecked are ordered next → later → needs-decision.

## Already true (no work)

- [x] Tabs are Home / Explore / Trips / Inbox / Me (+ global + Create) — playbook §2's recommendation already shipped; its "current nav" description was stale
- [x] `CardShell`, `CategoryTile`, `AirPalSearchField`, `AvatarStack`, `ArrowCta`, `StickyAction`, liquid-glass dock, 44px targets
- [x] One marketplace engine; Mate stays activity-first, never dating UI
- [x] Vite SPA + Capacitor + Firebase kept; no rewrite
- [x] Screenshot tooling (`scripts/screenshots.mjs`) + per-flow Playwright specs (`e2e/`)

## Do now (UX consolidation sprint)

- [x] Home hierarchy: image hero, date badges, thumbnails, snap rails (`HomePage.tsx`)
- [x] Events imagery: calendar header banner, card fallbacks (`CalendarPage.tsx`, `CalendarEventCard.tsx`)
- [x] Business profile Google-style block (`BioPublicPage.tsx`)
- [x] Home journey e2e test (`e2e/home-journey.spec.ts`) — §24 example, adapted to shipped UI; also fixed stale tab test to shipped dock (16 pass, chromium + mobile)
- [ ] Explore content-first: demote pill row, lead with content (`ExplorePage.tsx`)
- [ ] Card-size discipline: Small / Medium / Hero only, via `CardShell` + companions — no new shapes
- [x] Contextual primary CTA: event/place detail gets `Add to Trip` with contextual confirm (`AddedToTripSheet` + `addStop{silent}` + "Added to X Trip"; `e2e/add-to-trip.spec.ts` green both projects)
- [ ] Inbox action-centering pass (no new tabs without sign-off)

## Later (new surfaces — one at a time, each needs its own turn)

- [x] PlanCreate progressive wizard (§9) — Podz-style stepper: template cards → details → who; `?with=` prefill skips to details; create handoff stays share-first as the Ready action
- [ ] PlanDetail tab hierarchy: Overview / Plan / Map / People (§10)
- [ ] Active Trip Mode (§11)
- [ ] Journey templates: Root Escape / Sacred Journey as trip templates, not apps (§16–17)
- [ ] Stay Mode home (§19)
- [ ] Universal `+` action centre (§21)
- [ ] MemoryWall visual emphasis (§15)
- [ ] 5-device visual-regression matrix (§26) — start from `screenshots.mjs`

## Needs human decision (canon conflicts — do not build until named)

- [ ] Token value changes (§22: `#F7F8FA` bg, `#686D76` text, 12/16/20/24px radii) — canon freezes paper `#eef1f6`, mute `#6a726c`, ~28px cards. Keeping canon.
- [ ] Any tab rename/reorder beyond shipped dock
- [ ] Scan destination change (stays behind + Create per canon §8)

## Rejected

- Palette swap, purple/blue hero gradients, glass on every surface, Inter-only type, bento-everything, hover lifts, scroll-fade everywhere (taste preflight)
- Second engines, six apps, dating-ified Mate, giant AI button (product guardrails)
