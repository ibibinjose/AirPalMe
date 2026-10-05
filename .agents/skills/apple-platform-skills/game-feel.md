# Game Feel & Haptic Discipline Reference

## The Event × Channel Matrix

Feedback reaches the user across distinct channels:
- **Haptics**: Perceived only by the individual holding the device.
- **Screen Motion**: Perceived by anyone looking at the screen.
- **Audio / SFX**: Perceived by the room.

### Rarity Hierarchy

1. **Selection (`selection`)**: Routine interactions (tab change, chip toggle, segmented switch). Minimum duration, non-intrusive.
2. **Action Confirmation (`light`)**: Secondary button press, menu item selection, filter clearing.
3. **Modal/Sheet State Change (`medium`)**: FAB activation, search sheet opening, date picker popup.
4. **Impact / Lock-in (`heavy`)**: Primary commitment, booking initiation, QR code scanned.
5. **Milestone / Celebration (`success`)**: Plan created, RSVP recorded, pass saved to wallet. Multi-pulse pattern.
6. **Alert / Block (`warning` / `error`)**: Destructive operation warning, validation failure.

### Single-Owner Invariant
Only one component or handler may fire haptics for any single event to prevent jarring double-vibrations.
