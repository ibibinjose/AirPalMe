# iOS Design Guide (Apple HIG Alignment)

> Adopted from human-supplied Apple design rules. Goal: AirPal on iPhone feels inevitable and familiar — like a first-party app — while staying AirPal.
>
> Brand resolutions (where HIG and AirPal identity meet): AirPal Blue `#1805db` stays the single accent (used sparingly, per HIG); `ring-1 ring-line` card borders stay as the shipped AirPal card language instead of pure spacing-grouped lists; type ships on the system stack (`--font-sans` / `--font-display` in `src/index.css` — SF Pro on iOS), so this guide's "SF Pro or system font stack" rule and the shipped app agree. Everything else below applies, especially on iOS: safe areas, touch targets, system behaviors (no iOS zoom, no tap delay, no tap highlight), bottom sheets for modals, calm motion.

## Design Principles

- Native over custom
- Subtle over expressive
- Clarity and familiarity as highest priorities
- Motion explains hierarchy, not decorates

## Visual Style

**Typography**: SF Pro or system font stack; hierarchy via size and weight, not color.

**Color**: Neutral palette — white/off-white backgrounds, system grays, accent colors used sparingly.

**Visual Effects**: Translucency and blur for depth. No harsh borders; use spacing and grouping instead.

## Layout & Components

**Navigation**: Standard navigation bars; large titles where appropriate. Bottom sheets preferred for modals. Vertical scroll as primary navigation.

**Buttons**: System button behavior; clear primary vs. secondary hierarchy.

**Lists**: iOS-style rhythm; use separators or spacing, not both.

**Spacing**: Comfortable touch targets; clear safe-area handling; light, system-like cards if needed.

## Interaction & Motion

- Smooth, natural easing (no bounce unless system-default)
- Fade, slide, subtle scale — all transitions calm and intentional
- Gesture-driven interaction; one-handed usability considered

## Avoid

- Over-designed custom components
- Trendy effects, heavy gradients, neon colors
- Harsh borders or dense layouts
- Non-standard navigation patterns

## iOS Web Checklist (AirPal-specific)

- `touch-manipulation` on all buttons (no tap delay)
- `-webkit-tap-highlight-color: transparent` (set globally in `src/index.css`)
- 16px minimum on inputs/selects (no iOS auto-zoom)
- `pb`/`pt` must clear the Home indicator and notch (`env(safe-area-inset-*)` or generous fixed padding)
- Spinners honor `prefers-reduced-motion` (`motion-safe:`)
- Haptics on key actions via `triggerHaptic` (`Button` fires light by default)

## Output Requirements

For each redesigned screen, explain: design intent, layout structure, typography, interaction/motion, and iOS-native reasoning. Every screen should feel like a first-party Apple app — inevitable and familiar.
