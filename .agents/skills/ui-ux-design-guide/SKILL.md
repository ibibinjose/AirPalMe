---
name: ui-ux-design-guide
description: Priority-ordered UI/UX design rules covering accessibility, interaction, performance, layout, typography, and data visualization for Base44 apps. Includes Tailwind color guidance, pattern selection (tables vs. lists, modals vs. panels, notifications), and copy standards. Use when building or reviewing UI, designing new pages or components, choosing color palettes, or applying design best practices.
---

# UI/UX Design Guide

Rules are priority-ordered. Address higher-priority categories first.

---

## 1. Accessibility (CRITICAL)

- Color contrast minimum 4.5:1 for normal text, 3:1 for large text
- Visible focus rings on interactive elements — never remove `outline` without a `focus-visible` replacement
- Descriptive `alt` for meaningful images; `alt=""` for decorative
- `aria-label` on icon-only buttons
- Color is never the sole state indicator — pair with icon, text, or border
- Form inputs always have associated `<label>` with `htmlFor`

---

## 2. Touch & Interaction (CRITICAL)

- Minimum 44x44px touch targets on mobile; comfortable click targets on desktop
- `cursor-pointer` on all clickable elements
- Hover states use color/opacity changes — never `scale` transforms that shift layout
- Transitions: 150–300ms. Never `transition: all` — list properties explicitly
- Destructive actions require confirmation dialog or undo window
- Disable submit button and show spinner during async operations; re-enable on error

---

## 3. Performance (HIGH)

- Explicit `width` and `height` on `<img>` to prevent CLS
- Below-fold images: `loading="lazy"`; above-fold: `priority` or `fetchpriority="high"`
- Reserve space for async content — skeleton screens for content-heavy areas, spinners for small actions
- Virtualize lists >50 items
- Honor `prefers-reduced-motion` — disable or reduce animations
- Animate only `transform`/`opacity` with correct `transform-origin`

---

## 4. Layout & Responsive (HIGH)

- Minimum 16px body text on mobile
- No horizontal scroll — content fits viewport width
- z-index scale: 10 (dropdowns), 20 (sticky headers), 30 (modals/overlays), 50 (toasts)
- Fixed/floating elements must account for height; content below must not be hidden
- Test at 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- Text containers: use `truncate`, `line-clamp-*`, or `break-words` for long content
- Flex children need `min-w-0` to allow text truncation

---

## 5. Typography (MEDIUM)

- Line height 1.5–1.75 for body text
- Line length 65–75 characters max
- `font-variant-numeric: tabular-nums` for number columns and comparisons
- `text-wrap: balance` on short headings; `text-pretty` on longer ones
- Use `…` not `...`; curly quotes not straight quotes
- Loading states end with `…`: "Loading…", "Saving…"

---

## 6. Color (MEDIUM)

Use these Tailwind values:
- Body text: `text-slate-900`
- Muted/secondary text: `text-slate-600` minimum
- Borders: `border-gray-200`
- Glass/frosted cards: `bg-white/80` or higher
- Hover highlight: `hover:bg-slate-50` or `hover:bg-slate-100`

---

## 7. Animation (MEDIUM)

- Animations must be interruptible — respond to user input mid-animation
- SVG transforms: apply on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Skeleton screens for content-heavy areas, spinners for focused actions, progress bars for multi-step processes

---

## 8. Charts & Data Visualization (LOW)

- Match chart type: trends → line, comparison → bar, composition → pie/donut, flow → sankey/funnel
- Sufficient contrast between data series; do not rely on color alone
- Provide table alternative for accessibility

---

## Pattern Selection

### Feedback & Notifications
- Action result (save, delete): Toast notification
- Form field error: Inline message next to field; focus first error on submit
- Page-level error or empty result: Inline alert banner or empty state illustration
- Background process complete: Toast with optional action link
- Long-running operation: Progress bar or skeleton with status text

### Content Display
- Quick edit of single field: Inline edit / click-to-edit
- Create or edit full record: Full page or slide-over panel
- Confirm destructive action: Confirmation dialog with explicit action name (e.g., "Delete project")
- Supplementary details: Expandable section or collapsible panel
- Auxiliary content (filters, details): Side panel or sheet

### Data & Lists
- <10 items, simple display: Simple list or card grid
- 10–50 items with sorting/filtering: Table with column headers
- >50 items: Virtualized list or paginated table
- No data yet: Empty state with illustration and primary CTA
- Entity has no records: "No [items] yet. Create your first [item]." with action button

### Navigation
- 2–5 top-level sections: Tab bar or horizontal tabs
- >5 sections or nested hierarchy: Sidebar navigation
- Settings or configuration groups: Vertical tabs or segmented sections
- Step-by-step process: Stepper/wizard with progress indicator

---

## Copy Standards

- Active voice: "Save changes" not "Changes will be saved"
- Title Case for headings and button labels
- Numerals for counts: "8 projects" not "eight projects"
- Specific button labels: "Save API Key" not "Continue" or "Submit"
- Error messages include the fix or next step, not just the problem
- Empty states: what the item is + how to create the first one
