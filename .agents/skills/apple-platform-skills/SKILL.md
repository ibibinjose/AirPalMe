---
name: apple-platform-skills
description: Apple platform development and Human Interface Guidelines (HIG) engineering for Web, Mobile, iOS, and Android. Enforces Apple Liquid Glass materials architecture, fluid animations, game feel (tactile haptics, celebrations, feedback matrix), touch ergonomics (≥44px tap targets, safe areas), accessibility audits, and App Store readiness.
---

# Apple Platform Skills — Web, Mobile, iOS & Android

Comprehensive Apple platform design and engineering standard adapted for AirPal's Vite SPA + Capacitor 8 architecture (two shells: `me.airpal.app` + `me.airpal.pass`), synthesizing the official Apple Human Interface Guidelines (HIG), WWDC Liquid Glass specifications, Game Feel haptic choreography, and App Store readiness standards from the Apple platform skills library.

---

## 1. Liquid Glass Architecture (WWDC25 Specification)

Liquid Glass is the translucent material of the **navigation layer** — toolbars, navigation docks, floating action buttons, and contextual sheets. It is **never** used for the content layer (data rows, lists, feed items, tables).

### Core Invariants

| Rule | Enforcement |
|------|-------------|
| **Never glass on glass** | Never stack translucent glass elements. Elements placed *inside* a glass container must use solid fills, vibrancy, or subtle ink contrasts (`bg-brand`, `text-ink`), never a second blur layer. |
| **Two variants — never mix** | **Regular** (default): High-density blur (`backdrop-blur-2xl` / `backdrop-blur-3xl`), subtle white specular highlight (`border-white/80` or `inset 0 1px 1.5px rgba(255,255,255,0.9)`), adaptive over light and dark backgrounds.<br>**Clear**: High-transparency lens (`rgba(255,255,255,0.14)`), only permitted when resting over rich full-bleed media with an underlying dimming scrim. |
| **Tint only primary actions** | When every control is tinted, nothing stands out. Use AirPal brand blue (`#1805db`) exclusively for the active tab, primary CTA, or focal state. Supporting icons and text stay neutral (`text-ink`, `text-mute`). |
| **No steady-state intersections** | Content in resting scroll state must never be clipped or parked half-underneath floating glass bars. Maintain clearance using `pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]` and `pt-[calc(env(safe-area-inset-top,0px)+4rem)]`. |
| **Concentric squircle radius** | Outer container corners and inner interactive elements follow concentric curvature: $R_{\text{inner}} = R_{\text{outer}} - \text{padding}$. Rounded-full docks contain rounded-full badges; rounded-3xl cards contain rounded-2xl items. |

### Liquid Glass CSS Implementation (`src/index.css`)

```css
/* Liquid Glass Navigation Dock (Mobile Companion Bar) */
.apple-liquid-glass-dock {
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    inset 0 1px 2px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 1px 0 rgba(18, 22, 20, 0.03),
    0 18px 42px -12px rgba(24, 5, 219, 0.18),
    0 4px 16px -2px rgba(18, 22, 20, 0.06);
}

/* Liquid Glass Navigation Header */
.apple-liquid-glass-nav {
  background: rgba(242, 242, 247, 0.82);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  border-bottom: 1px solid rgba(229, 229, 234, 0.7);
}

/* High Contrast & Reduced Transparency Fallbacks */
@media (prefers-reduced-transparency: reduce) {
  .apple-liquid-glass-dock,
  .apple-liquid-glass-nav,
  .apple-liquid-glass-card {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: var(--color-card, #ffffff) !important;
    border-color: var(--color-line, #e4e7ee) !important;
  }
}
```

---

## 2. Game Feel & Tactile Haptic Discipline

Micro-interactions must feel physical, responsive, and grounded. Feedback follows an **event × channel** matrix where haptic amplitude strictly scales with event rarity.

### The Rarity Gradient

```
Subtle Tick (Selection) < Action Confirmed (Light) < Sheet/Modal Reveal (Medium) < Impact Complete (Heavy) < Milestone (Success Pattern)
```

1. **Selection (`triggerHapticSelection` / `triggerHaptic("selection")`)**:
   - Tab switches (`TabBar.tsx`, `TabPills.tsx`)
   - Filter chip toggles (`FilterChips.tsx`)
   - Segmented control changes
2. **Light Impact (`triggerHaptic("light")`)**:
   - Secondary button clicks (`Button.tsx`)
   - Close modal / dismiss sheet (`X` buttons)
   - Navigation links
3. **Medium Impact (`triggerHaptic("medium")`)**:
   - FAB open/close (`CreateFab.tsx`)
   - Search trigger (⌘K / Search icon)
   - Date picker open / Calendar sheet toggle
4. **Success Pattern (`triggerHaptic("success")`)**:
   - Plan created or RSVP confirmed
   - Ticket generated or pass saved
   - Form submission succeeded
5. **Warning / Error (`triggerHaptic("warning")` / `triggerHaptic("error")`)**:
   - Destructive action confirmation required
   - Network failure or form validation block

### Single-Owner Rule

Exactly **one** layer fires haptics for an event. If `<Button onClick={...} haptic="light" />` fires, the underlying `onClick` handler must not trigger a redundant `triggerHaptic`.

### Native & Web Fallback Support

Via `@capacitor/haptics` in `src/lib/native.ts`:
- **iOS & Android**: Native Taptic Engine and vibrator motors via `Haptics.impact` and `Haptics.selectionChanged`.
- **Web Mobile**: Degrades to `navigator.vibrate([10])` where supported, or silent no-op.

---

## 3. iOS & Android HIG Layout & Touch Ergonomics

### Touch Targets (Non-Negotiable)

- **Minimum $44 \times 44\text{pt}$ ($44\text{px}$)** for every clickable or interactive element on mobile.
- Use `min-h-[44px] min-w-[44px]` or generous hit slop via `relative after:absolute after:-inset-2`.
- Form inputs, selects, and textareas must have `font-size >= 16px` on mobile (`max-width: 768px`) to prevent iOS Safari auto-zooming and breaking the page layout.

### Safe Areas (Dynamic Island, Home Indicator & Notches)

- Sticky top chrome uses `pt-[env(safe-area-inset-top,0px)]`.
- Bottom floating docks, sheets, and action bars use `mb-[max(0.75rem,env(safe-area-inset-bottom,0px))]` or `pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1rem))]`.
- Scroll containers account for bottom navigation height: `pb-28 lg:pb-8`.

### Modal & Sheet Ergonomics

- Mobile dialogs present as **bottom sheets** (`rounded-t-[32px]`) with a top grab handle:
  ```tsx
  <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line/80 sm:hidden" />
  ```
- Sheets must respect the iOS visual viewport:
  ```tsx
  max-h-[min(88vh,calc(var(--visual-viewport-height,100dvh)-1.5rem))]
  ```
- Always support swipe/drag down, ESC key, and Android hardware back button (via `registerModalBackHandler`).

### Spring Motion Curves

Interactive components must use Apple-inspired physics springs rather than linear or mechanical eases:
```tsx
transition={{ type: "spring", stiffness: 420, damping: 32 }}
```
Micro-press feedback uses subtle scale depression:
```css
.apple-spring-press:active {
  transform: scale(0.96);
  transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1);
}
```

---

## 4. Typography & Visual Hierarchy

- **System Font Stack**: Uses native `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display"` to eliminate font CDN network latency, prevent layout shifts (CLS = 0), and preserve user privacy.
- **Numeric & Data Alignment**: All dates, times, currencies, and countdowns must use `tabular-nums` (`font-variant-numeric: tabular-nums`) so numbers do not jump during updates.
- **Hierarchy via Size & Weight**: Contrast is established through typography size scale (Title 1, Title 2, Headline, Subhead, Footnote) rather than multiple contrasting background colors.

---

## 5. Cross-Platform Parity Checklist (iOS, Android, Web)

| Area | iOS Target | Android Target | Web SPA Target |
|------|------------|----------------|----------------|
| **Status Bar** | Dark icons, translucent blend, safe-area top inset | Light theme `#ffffff` background, `overlaysWebView: false` | Browser theme-color `#f2f2f7` |
| **Back Nav** | Edge-swipe gesture, modal dismiss | Hardware back button listener via `App.addListener('backButton')` | Browser history popstate |
| **Keyboard** | `Keyboard.resize = "none"`, `#root` visual viewport padding | `Keyboard.resize = "none"`, smooth scroll margin on active input | Visual Viewport API |
| **Haptics** | Core Haptics / Taptic Engine | Android Vibrator service | `navigator.vibrate` |
| **Share** | Native UIActivityViewController sheet | Native Android ShareCompat intent | Web Share API fallback to clipboard |

---

## 6. App Store & Google Play Readiness Audit

1. **Privacy Manifest (`PrivacyInfo.xcprivacy`)**:
   - `NSPrivacyTracking`: `false` (AirPal does not track users across 3rd-party apps).
   - `NSPrivacyAccessedAPITypes`: Declare all required reason APIs (`UserDefaults` -> `CA92.1`, `FileTimestamp` -> `C617.1`, `SystemBootTime` -> `35F9.1`, `DiskSpace` -> `85F4.1`).
2. **Honest Copy & Pricing**:
   - Zero misleading claims, zero dark patterns, clear transparent pricing breakdown.
3. **No Fake Data**:
   - Only production-ready, authentic partner places, genuine reviews, and real verified coordinates.
4. **Verification Commands**:
   - `npm test` (Unit & component verification)
   - `npm run verify` (Typecheck, lint, build, prerender, rules)
   - `npm run cap:sync` (Sync web assets to `ios/` and `android/`)
   - `npx playwright test` (End-to-end user journeys)
