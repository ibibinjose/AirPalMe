# Apple HIG Compliance Checklist for AirPal

## 1. Touch & Layout Targets

- [ ] Every clickable control has a minimum hit target of $44 \times 44\text{px}$ on mobile (`min-h-[44px] min-w-[44px]`).
- [ ] Touch delay eliminated via `touch-manipulation` and `-webkit-tap-highlight-color: transparent`.
- [ ] Safe area insets respected:
  - Top: `env(safe-area-inset-top)` for fixed/sticky headers
  - Bottom: `env(safe-area-inset-bottom)` for bottom sheets, docks, action bars
- [ ] Scroll containers reserve bottom clearance: `pb-28 lg:pb-8`.

## 2. Modals & Sheets

- [ ] Mobile presentation uses bottom sheet pattern (`rounded-t-[32px]`) with drag handle.
- [ ] Desktop presentation uses centered modal (`rounded-3xl`).
- [ ] Dismissible via backdrop tap, ESC key, and Android back button.
- [ ] Body scroll locked when sheet is presented (`useScrollLock`).

## 3. Typography & Numerics

- [ ] Native system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text"`).
- [ ] `tabular-nums` used on all numeric counters, dates, prices, times.
- [ ] Form input text is $\ge 16\text{px}$ on mobile to avoid iOS viewport zoom.

## 4. Accessibility

- [ ] Text contrast $\ge 4.5:1$ (normal text), $\ge 3:1$ (large text).
- [ ] Visible focus rings on keyboard navigation (`:focus-visible`).
- [ ] Meaningful `aria-label` on all icon-only buttons.
- [ ] Motion honors `prefers-reduced-motion`.
- [ ] Glass honors `prefers-reduced-transparency`.
