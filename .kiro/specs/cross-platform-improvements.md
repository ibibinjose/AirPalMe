# Cross-Platform App Improvements

**Status:** Design  
**Created:** 2026-09-13  
**Priority:** High

## Overview

Comprehensive audit and improvement of the AirPalMe app across web, iOS, and Android platforms. Focus on layout, scroll, touch interaction, safe areas, keyboard handling, and platform-specific bugs.

---

## Technical Design

### 1. Scroll & Touch Issues

#### 1.1 Current State Analysis

**Issue Found:**

- `body` has `touch-action: manipulation` which blocks pan gestures (vertical scrolling via trackpad/touch)
- Already fixed to `touch-action: pan-y pinch-zoom` in src/index.css

**Additional Touch Improvements Needed:**

- No `touch-action` properties on scroll containers or interactive elements beyond base CSS
- Individual buttons/links use Tailwind's `touch-manipulation` class correctly
- Need to ensure scroll containers allow smooth touch scrolling

#### 1.2 Solution: Enhanced Scroll Container Handling

**File:** `src/index.css`

```css
/* Add smooth scroll containers */
.scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* iOS momentum scrolling */
  overscroll-behavior-y: contain;
  scroll-behavior: smooth;
}

/* Prevent iOS rubber-band on fixed elements */
.fixed-element {
  overscroll-behavior: none;
}
```

**Apply to modals and sheets that have scrollable content:**

- `GlobalSearchModal` results list
- `ProfileMenu` dropdown
- `Sheet` component content areas
- Plan/Event detail pages

---

### 2. Safe Area Handling (iOS/Android Notches & Home Indicators)

#### 2.1 Current State Analysis

**Issues Found:**

1. `AppShell` uses `pt-[env(safe-area-inset-top)]` on sticky header ✅
2. `TabBar` uses `safe-bottom` class but it's not defined in CSS ❌
3. Fixed bottom bars (PlanDetailPage action bar) use `safe-bottom` class ❌
4. No safe-area handling for modals at screen edges ❌

#### 2.2 Solution: Comprehensive Safe Area System

**File:** `src/index.css`

Add these utility classes:

```css
/* Safe area utilities */
.safe-top {
  padding-top: max(0.5rem, env(safe-area-inset-top, 0px));
}

.safe-bottom {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.safe-left {
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
}

.safe-right {
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

.safe-x {
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

/* For iOS home indicator - extra bottom padding on native */
.safe-bottom-native {
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));
}

/* Modal safe areas - keep content away from edges */
.modal-safe {
  padding-top: max(1rem, env(safe-area-inset-top, 0px));
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}
```

**Note:** The classes already exist in the current CSS! They just need to be applied consistently.

#### 2.3 Files to Update

1. **TabBar.tsx**: Already uses `safe-bottom` ✅
2. **PlanDetailPage.tsx**: Line 376 - add to action bar
3. **All modal components**: Add `modal-safe` or individual safe classes:
   - `GlobalSearchModal`
   - `SignInPrompt`
   - `PlanShareModal`
   - `PlanRsvpSheet`
   - `ImageCropper`
   - `CalendarEventModal`
   - `BioShareModal`
   - `Sheet` component

---

### 3. iOS-Specific Issues

#### 3.1 Status Bar Overlay

**Current:** StatusBar set to `Style.Light` with overlay disabled on Android only

**Issue:** iOS status bar may overlay content in some views

**Solution:** Ensure `viewport-fit=cover` in meta tag (already present ✅) and test all pages have proper top padding

**File:** `index.html` - verify meta tag:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
/>
```

#### 3.2 iOS Keyboard Handling

**Current:** `interactive-widget=resizes-content` in viewport meta ✅

**Additional fixes needed:**

- Ensure form inputs scroll into view when keyboard appears
- Prevent body scroll when input is focused
- Add `inputMode` to all number/tel/email inputs for native keyboards

**Files to audit:**

- All form components in `src/components/forms/`
- All page forms (BioEditPage, BusinessPage, ContactPage, etc.)

#### 3.3 iOS Rubber Band Effect

**Issue:** Native iOS over-scroll bounce can conflict with fixed headers/footers

**Solution:** Already handled via `overscroll-behavior-y: contain` on body ✅

---

### 4. Android-Specific Issues

#### 4.1 Status Bar Color

**Current:** Set to `#F3F0E8` (paper color) ✅

**Verify:** Test on Android devices that status bar matches app theme

#### 4.2 Android Back Button

**Current:** Handled in `initNativeApp()` ✅

**Enhancement needed:** Add back button handling for modals

**File:** `src/lib/native.ts`

```typescript
// Enhance back button handler to close modals first
let modalCloseHandler: (() => boolean) | null = null;

export function registerModalBackHandler(handler: () => boolean) {
  modalCloseHandler = handler;
}

export function unregisterModalBackHandler() {
  modalCloseHandler = null;
}

// Update in initNativeApp:
App.addListener("backButton", ({ canGoBack }) => {
  // First try to close modal if handler exists
  if (modalCloseHandler && modalCloseHandler()) {
    return; // Modal was closed, don't navigate
  }

  if (canGoBack) {
    window.history.back();
  } else {
    App.exitApp();
  }
});
```

**Apply to all modal components:**

- Register handler on mount
- Unregister on unmount
- Return true if modal was closed

#### 4.3 Android Keyboard

**Current:** No specific handling

**Issue:** Android keyboard may not resize viewport correctly, can cover form inputs

**Solution:** Verify `interactive-widget=resizes-content` works on Android, add fallback scroll-into-view for inputs

---

### 5. Web-Specific Issues

#### 5.1 PWA Manifest

**Current:** Basic manifest exists ✅

**Enhancements needed:**

- Add `shortcuts` for quick actions
- Add `categories`
- Verify icon sizes and purposes

**File:** `public/manifest.json`

```json
{
  "name": "AirPal.me",
  "short_name": "AirPal",
  "description": "Scan a place. See what's around.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F3F0E8",
  "theme_color": "#F3F0E8",
  "orientation": "portrait",
  "categories": ["travel", "lifestyle", "navigation"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    {
      "name": "Scan QR",
      "short_name": "Scan",
      "description": "Scan a place QR code",
      "url": "/scan",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Calendar",
      "short_name": "Calendar",
      "description": "View your events",
      "url": "/calendar",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

#### 5.2 Desktop Viewport

**Issue:** App is mobile-first but desktop experience could be enhanced

**Current:** Max-width constraints on content ✅

**Enhancement:** Verify all pages look good at desktop widths (already handled via Tailwind responsive classes)

---

### 6. Layout Issues

#### 6.1 Fixed/Sticky Element Z-Index Management

**Current Analysis:**

- TabBar: `z-40` ✅
- AppShell sticky header: `z-30` ✅
- Modals: `z-50`, `z-60`, `z-70`, `z-90` mixed usage ❌
- GuestStayTools: `z-50` ❌

**Issue:** Inconsistent z-index values, potential stacking conflicts

**Solution:** Establish z-index scale

**File:** `src/index.css`

```css
/* Z-index scale for consistent stacking */
:root {
  /* Layout layers */
  --z-base: 0;
  --z-content: 10;
  --z-header: 30;
  --z-nav: 40;
  --z-overlay: 50;
  --z-modal: 60;
  --z-toast: 70;
  --z-tooltip: 80;
  --z-prompt: 90;
  --z-debug: 100;
}
```

**Update components:**

- TabBar: `z-[var(--z-nav)]` or keep `z-40`
- PlanDetailPage action bar: `z-40`
- All modals: `z-50` (overlay) + `z-60` (content)
- SignInPrompt: `z-[90]` (highest, auth prompt)
- ImageCropper: `z-[70]` (above modals)
- GlobalSearchModal: `z-50`

#### 6.2 Scroll Container Heights

**Issue:** Pages may not fill viewport correctly on mobile

**Current:** `min-h-dvh` on AppShell root ✅

**Verify:** All page components allow natural scroll without fixed heights

---

### 7. Form Input Enhancements

#### 7.1 Input Modes for Native Keyboards

**Current:**

- PhoneField uses `inputMode="tel"` ✅
- OTP inputs use `inputMode="numeric"` ✅

**Audit needed:** Check all other inputs for proper inputMode

**Add to:**

- Email inputs: `inputMode="email"`
- URL inputs: `inputMode="url"`
- Search inputs: `inputMode="search"`
- Number inputs: `inputMode="decimal"` or `inputMode="numeric"`

#### 7.2 Auto-capitalize and Autocomplete

**Add to relevant inputs:**

- Name fields: `autoCapitalize="words"`
- Email fields: `autoCapitalize="none" autoComplete="email"`
- Password fields: `autoComplete="current-password"` or `new-password`
- Address fields: `autoComplete="street-address"`, `postal-code`, etc.

---

### 8. Performance & UX Enhancements

#### 8.1 Reduce Layout Shift

**Issue:** Fixed bottom bars appear after route change, causing shift

**Solution:** Reserve space or animate smoothly

**TabBar:** Already animated with framer-motion ✅

#### 8.2 Touch Feedback

**Current:** Haptic feedback on native via `triggerHaptic()` ✅

**Enhancement:** Ensure all interactive elements show visual feedback

**Add active states:**

```css
.interactive:active {
  transform: scale(0.98);
  opacity: 0.9;
}
```

#### 8.3 Scroll to Top on Route Change

**Current:** AppShell scrolls to top on path change ✅

```typescript
useEffect(() => {
  window.scrollTo(0, 0);
  trackPageView(path);
}, [path]);
```

---

### 9. Capacitor Plugin Configuration

#### 9.1 Current Config Review

**File:** `capacitor.config.ts`

```typescript
{
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F3F0E8",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F3F0E8",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  }
}
```

**Enhancements:**

1. Add iOS-specific status bar config
2. Add Keyboard plugin config

```typescript
{
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F3F0E8",
      overlaysWebView: false, // Explicitly false for both platforms
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#F3F0E8",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      splashFullScreen: false,
      splashImmersive: false,
    },
    Keyboard: {
      resize: "body", // or "native" - test which works better
      style: "light",
      resizeOnFullScreen: true,
    },
  }
}
```

#### 9.2 Keyboard Plugin

**Install:** `@capacitor/keyboard`

**Add to package.json:**

```bash
npm install @capacitor/keyboard
```

**Use in forms to handle keyboard show/hide:**

```typescript
import { Keyboard } from "@capacitor/keyboard";

Keyboard.addListener("keyboardWillShow", (info) => {
  // Adjust layout if needed
});

Keyboard.addListener("keyboardWillHide", () => {
  // Restore layout
});
```

---

### 10. Android Manifest Enhancements

**File:** `android/app/src/main/AndroidManifest.xml`

**Add:**

```xml
<!-- Soft input mode for keyboard -->
<activity
  android:windowSoftInputMode="adjustResize"
  ...
/>

<!-- Add vibrate permission for haptics -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Network state for offline detection -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## Implementation Tasks

### Phase 1: Critical Scroll & Touch Fixes

1. ✅ Fix `touch-action` on body (already done)
2. Add smooth scroll container utilities to CSS
3. Apply scroll container classes to modals with lists
4. Test scroll on iOS/Android/web

### Phase 2: Safe Area System

1. Verify safe area classes exist in CSS (they do!)
2. Apply `safe-bottom` to all fixed bottom bars
3. Apply `modal-safe` or individual safe classes to all modals
4. Test on iPhone with notch and Android with gestures

### Phase 3: Platform-Specific Enhancements

1. Add Android back button modal handling
2. Install and configure Keyboard plugin
3. Update Android manifest with permissions
4. Update Capacitor config with Keyboard settings

### Phase 4: Form Input Improvements

1. Audit all form inputs for inputMode
2. Add autocapitalize and autocomplete attributes
3. Test on iOS/Android native keyboards

### Phase 5: Z-Index & Layout

1. Standardize z-index values across modals
2. Verify no scroll container height issues
3. Test all pages at mobile/tablet/desktop widths

### Phase 6: PWA & Web Enhancements

1. Update manifest.json with shortcuts
2. Verify source map suppression (already done)
3. Test PWA install on mobile browsers

### Phase 7: Testing & Validation

1. Test on physical iOS device
2. Test on physical Android device
3. Test in Chrome/Safari/Firefox desktop
4. Test in mobile browsers
5. Verify all unit tests still pass

---

## Testing Checklist

### iOS (iPhone with notch)

- [ ] Status bar doesn't overlay content
- [ ] TabBar respects home indicator area
- [ ] Modals have proper padding from screen edges
- [ ] Keyboard pushes content up properly
- [ ] Scroll is smooth with momentum
- [ ] Fixed headers don't bounce with over-scroll
- [ ] Haptic feedback works on interactions

### Android

- [ ] Status bar color matches theme
- [ ] Back button closes modals before navigation
- [ ] Keyboard doesn't cover form inputs
- [ ] Bottom navigation respects gesture area
- [ ] Scroll is smooth
- [ ] Haptic feedback works (if supported)

### Web (Desktop & Mobile browsers)

- [ ] Trackpad/mouse wheel scrolling works
- [ ] Touch scrolling works on mobile web
- [ ] PWA install works
- [ ] Responsive layout at all breakpoints
- [ ] No horizontal scroll
- [ ] Keyboard shortcuts work (⌘K for search)

### Cross-Platform

- [ ] All pages scroll properly
- [ ] No layout shift on route change
- [ ] Modals center correctly and are dismissible
- [ ] Forms are usable on all platforms
- [ ] No z-index stacking bugs
- [ ] Images load and display correctly
- [ ] Icons render at correct sizes

---

## Files to Modify

### High Priority

1. `src/index.css` - Add scroll container utilities
2. `src/components/layout/TabBar.tsx` - Verify safe-bottom
3. `src/pages/PlanDetailPage.tsx` - Add safe-bottom to action bar
4. `src/lib/native.ts` - Add modal back handler
5. `capacitor.config.ts` - Add Keyboard plugin config
6. `android/app/src/main/AndroidManifest.xml` - Add permissions

### Medium Priority

7. All modal components - Add safe area classes
8. All form inputs - Add inputMode, autocomplete
9. `public/manifest.json` - Add shortcuts
10. Modal z-index standardization

### Low Priority

11. Active state animations for better touch feedback
12. Keyboard plugin integration in forms
13. Additional PWA enhancements

---

## Success Criteria

1. **Scroll works on all platforms** without requiring scrollbar
2. **Safe areas respected** on iOS notch and Android gestures
3. **Keyboard doesn't cover inputs** on any platform
4. **Back button works correctly** on Android
5. **No z-index conflicts** between UI layers
6. **All tests pass** after changes
7. **No regressions** in existing functionality

---

## Notes

- Most issues are CSS/config refinements, not major architectural changes
- Core scroll fix already applied (touch-action)
- Safe area classes already exist, just need consistent application
- Native plugins (Capacitor) working correctly
- Focus on polish and consistency across platforms
