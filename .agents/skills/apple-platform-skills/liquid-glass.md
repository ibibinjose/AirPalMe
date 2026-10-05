# Liquid Glass Architecture Reference (WWDC25)

## Material Definition

Liquid Glass is Apple's translucent material specification for the **navigation layer** across iOS, iPadOS, macOS, and web.

### Golden Rules

1. **Material of Navigation, Never Content**:
   - Apply Liquid Glass to toolbars, docks, floating navigation bars, segment bars, and floating controls.
   - Do NOT apply to scrollable feed items, table cells, or card content grids. Use solid surfaces (`var(--color-card)`) with subtle borders for content.

2. **Never Glass on Glass**:
   - Never nest translucent glass elements inside other glass elements.
   - An active tab badge inside a glass dock uses a solid vibrant fill (`bg-brand`, `text-white`), never a child blur layer.

3. **Two Variants — Never Mix**:
   - **Regular** (Standard): High-density blur (30-32px), subtle specular highlight rim, works over light or dark wallpaper.
   - **Clear**: Minimal tint with high blur (36px), used ONLY when layered over full-bleed rich photography with an underlying scrim.

4. **Concentric Geometry**:
   - When a pill or control sits inside a glass container, their corner radii must be concentric:
     $$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}$$
   - A `rounded-full` dock houses `rounded-full` buttons.
   - A `rounded-3xl` card houses `rounded-2xl` elements.

5. **Accessibility Fallbacks**:
   - On systems with `prefers-reduced-transparency: reduce`, immediately drop blur and replace with high-contrast solid card surface.
