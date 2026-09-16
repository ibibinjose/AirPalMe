# Hours and events freshness

Guests should not see a confident **Open now** or **Live now** from stale host copy.

## SLAs (`shared/freshness.ts`)

| Kind | Re-confirm | Guest effect |
|---|---|---|
| Wi-Fi | 30 days | Host checklist nudge (password still shown if set) |
| Place hours | 14 days | Host banner on `/business`. After **45 days**, Open now/Closed is hidden. |
| Event schedule | 7 days | Host banner on `/event`. Tonight shows **Check times** instead of Live now. |

## Stamps

- Saving a listing sets `hoursVerifiedAt` (and `updatedAt`).
- **Hours still right** on `/business` restamps without changing the hours string.
- Saving an event sets `scheduleVerifiedAt`.
- **Tonight still right** on `/event` restamps the schedule.

## Guest rules

- Parse hours with `isOpenAt` only when `hideOpenNow` is false.
- Missing timestamp = never confirmed = hide Open now.
- Do not invent hours or “live tonight” from seed flags.

## Host

If the banner is up, tap confirm or save after checking the venue. Stale Wi-Fi still uses the monthly checklist on `/host`.
