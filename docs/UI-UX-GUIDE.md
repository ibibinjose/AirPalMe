# UI/UX Design Guide

> Adopted from human-supplied design rules. Rules are priority-ordered. Address higher-priority categories first.
>
> Repo notes: AirPal uses its own design tokens (`text-ink`, `text-mute`, `bg-card`, `ring-line`, AirPal Blue `#1805db`) instead of the generic Tailwind slate palette in §5 — same contrast intent, AirPal tokens. The app-wide compact type scale (13–15px) is a deliberate exception to the 16px minimum, except form inputs stay 16px on mobile to prevent iOS auto-zoom.

## 1. Accessibility (CRITICAL)

- Color contrast minimum 4.5:1 for normal text, 3:1 for large text
- Visible focus rings on interactive elements — never remove `outline` without a `focus-visible` replacement
- Descriptive `alt` for meaningful images; `alt=""` for decorative
- `aria-label` on icon-only buttons
- Color is never the sole state indicator — pair with icon, text, or border
- Form inputs always have associated `<label>` with `htmlFor`

## 2. Touch & Interaction (CRITICAL)

- Minimum 44x44px touch targets on mobile; comfortable click targets on desktop
- `cursor-pointer` on all clickable elements
- Hover states use color/opacity changes — never `scale` transforms that shift layout
- Transitions: 150–300ms. List properties explicitly; never `transition: all`
- Destructive actions require confirmation dialog or undo — never immediate delete
- Disable submit button and show spinner during async operations; re-enable on error

## 3. Performance (HIGH)

- Explicit `width` and `height` on `<img>` to prevent CLS
- Below-fold images: `loading="lazy"`; above-fold: `priority` or `fetchpriority="high"`
- Reserve space for async content with skeleton screens or spinners
- Virtualize lists >50 items
- Honor `prefers-reduced-motion` — disable or reduce animations
- Animate only `transform`/`opacity` with correct `transform-origin`

## 4. Layout & Responsive (HIGH)

- Minimum 16px body text on mobile
- No horizontal scroll — content fits viewport width
- Z-index scale: 10 (dropdowns), 20 (sticky), 30 (modals), 50 (toasts)
- Fixed/floating elements must not hide content below
- Test at: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- Use `truncate`, `line-clamp-*`, or `break-words` for long content
- Flex children need `min-w-0` to allow text truncation

## 5. Typography & Color (MEDIUM)

- Line height 1.5–1.75 for body text
- Line length 65–75 characters max
- `font-variant-numeric: tabular-nums` for number columns
- `text-wrap: balance` on short headings, `text-pretty` on long ones
- Use `…` not `...`; curly quotes not straight quotes
- Loading states: "Loading…", "Saving…"

### Tailwind Color Values

| Element | Use | Avoid |
|---------|-----|-------|
| Body text | `text-slate-900` | `text-slate-400` (fails contrast) |
| Secondary text | `text-slate-600` minimum | `text-gray-400` (too light) |
| Borders | `border-gray-200` | Near-invisible borders |
| Glass/frosted | `bg-white/80` or higher | `bg-white/10` (too transparent) |
| Hover highlight | `hover:bg-slate-50/100` | `hover:scale-105` (shifts layout) |

## 6. Animation (MEDIUM)

- Interruptible — respond to user input mid-animation
- SVG: apply transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Use skeletons for content-heavy areas, spinners for focused actions, progress bars for multi-step

## 7. Charts & Data Visualization (LOW)

- Match chart type: trends → line, comparison → bar, composition → pie/donut, flow → sankey/funnel
- Sufficient contrast between data series; avoid color alone for distinction
- Provide table alternative for accessibility

## Pattern Selection

### Feedback & Notifications
| Situation | Pattern |
|-----------|----------|
| Action result (save, delete) | Toast notification |
| Form field error | Inline message; focus first error on submit |
| Page-level error/empty | Alert banner or empty state |
| Background process complete | Toast with optional action link |
| Long-running operation | Progress bar or skeleton with status |

### Content Display
| Situation | Pattern |
|-----------|----------|
| Quick single-field edit | Inline/click-to-edit |
| Create or edit record | Full page or slide-over panel |
| Confirm destructive action | Dialog with explicit action name |
| Supplementary details | Expandable or collapsible section |
| Auxiliary content | Side panel or sheet |

### Data & Lists
| Situation | Pattern |
|-----------|----------|
| <10 items, simple | List or card grid |
| 10–50 items with sorting | Table |
| >50 items | Virtualized list or paginated table |
| No data | Empty state with illustration and CTA |
| No records | "No [items] yet. Create your first [item]." with button |

### Navigation
| Situation | Pattern |
|-----------|----------|
| 2–5 top-level sections | Tabs (horizontal) |
| >5 sections or nested | Sidebar |
| Settings groups | Vertical tabs or segments |
| Step-by-step | Stepper with progress |

## Content & Copy

- Active voice: "Save changes" not "Changes will be saved"
- Title Case for headings and buttons
- Numerals: "8 projects" not "eight projects"
- Specific labels: "Save API Key" not "Continue"
- Errors include the fix: "Email already in use. Try another" not just "Error"
- Empty states: "No [items] yet" + action to create first one
