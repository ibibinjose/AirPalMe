# Local time, location, and “now”

AirPal answers “what’s around / what’s on / is it open” from a **zoned clock** and a **single origin**, not from UTC and not from stale seed flags.

## Shared state

`LocalNowProvider` (`src/contexts/LocalNowContext.tsx`) sits after `StayProvider`.

`useLocalNow()`:

| Field          | Meaning                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| `now`          | Ticking `Date`                                                                          |
| `timeZone`     | Open-Meteo timezone for `here`, else the device zone                                    |
| `today`        | `YYYY-MM-DD` in `timeZone`                                                              |
| `time` / `day` | Top-bar clock                                                                           |
| `city`         | Reverse-geocoded GPS city, or stay/precinct city                                        |
| `here`         | GPS if it has drifted from stay (~2.5 km), else stay/precinct. Weather, Explore, Guide. |
| `anchor`       | Stay pin while the guest is in a stay/marker/campus session. Concierge walk times.      |
| `weather`      | Current + 3-day forecast (Open-Meteo)                                                   |

GPS is optional. If it is denied or slow, stay geo (scanned property) is used; if there is no stay, The Rocks precinct.

## Do not

```ts
const today = new Date().toISOString().slice(0, 10); // UTC — wrong in Sydney evenings
EVENTS.filter((e) => e.isLiveNow); // seed flag — weekend markets every day
place.openNow; // static seed, not hours
```

## Do

```ts
const { today, now, timeZone, here } = useLocalNow();
toZonedDateStr(now, timeZone); // src/lib/local-time.ts
isOpenAt(place.hours, now, timeZone); // src/lib/hours.ts — null = unknown
tonightEvents(now, timeZone); // src/lib/local-events.ts + catalog
discoverPlaces(here);
```

## Tonight vs live now

- **Live now:** parsed hours window contains `now` in the zone (e.g. Opera House “from 18:30”).
- **Tonight / on today:** scheduled for this zoned day and not finished (20-minute grace after end).
- Weekend-only copy (`Sat–Sun 10:00–17:00`) is off on weekdays.
- `isEnded` plus a past end time drops the card.

Ask AirPal (`src/lib/ask.ts`) uses the same live/tonight lists when the guest asks about tonight or events.

## Weather cache

`sessionStorage` key `airpal.local-now.v2:{source}:{lat}:{lng}` (15 minutes fresh, 6 hours stale fallback). Changing stay or GPS origin uses a different bucket. Refetch when the tab becomes visible.

## Privacy

GPS is used on-device for time, weather, and nearby distances. It is not uploaded as a guest profile field. Copy: Privacy Policy “Approximate location”.
