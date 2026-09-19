# Google Maps on AirPal.me

Interactive Stay maps and Places search need a browser Maps Platform key. Vite inlines `VITE_*` at **build** time.

## What the app uses

| API                 | Why                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Maps JavaScript API | Interactive map in Stay → Local favorites (`LocalFavorites`)                                                                |
| Places API (New)    | Nearby cafes / attractions, plus Autocomplete + Place Details for **Add your place** (logo, address, phone, website, hours) |
| Maps Embed API      | Iframe fallback and other embeds (`mapsEmbedSrc`)                                                                           |

Library: `@vis.gl/react-google-maps`. Map ID defaults to Google’s `DEMO_MAP_ID` (Advanced Markers). Override with `VITE_GOOGLE_MAPS_MAP_ID`.

Helpers: `src/lib/maps.ts` (`mapsKey`, `mapsMapId`, embed/search/walk URLs).

## Create the key

Project: **airpalme-app**.

1. Enable the three APIs above. Billing must be on (Maps monthly credit usually covers this volume).
2. Credentials → API key. Restrict immediately:

**Application (HTTP referrers)**

- `https://airpal.me/*`
- `https://www.airpal.me/*`
- `https://airpalme-app.web.app/*`
- `https://airpalme-app.firebaseapp.com/*`
- `http://localhost:3000/*`

**API restrictions:** Maps JavaScript API, Places API (New), Maps Embed API.

3. Put the key in gitignored `.env`:

```
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

A valid key is 39 characters and starts with `AIzaSy`. An extra leading `A` (`AAIza…`) is invalid. `mapsKey()` strips that paste error.

4. Restart `npm run dev`. Stay → Nearby Cafes & Attractions should show tiles, not an embed-only fallback.

## Production

```
npm run deploy:hosting
```

That rebuilds `dist/` with the key from `.env`, then deploys Firebase Hosting. A hosting-only deploy of an old `dist/` will not pick up a new key.

`apphosting.yaml` is unused for the live classic Hosting site. Do not put the Maps key in git.

## CSP

`firebase.json` Content-Security-Policy must allow Maps scripts:

- `script-src`: `https://maps.googleapis.com` `https://maps.gstatic.com` `https://*.googleapis.com` `https://*.gstatic.com` `'unsafe-eval'` `blob:`
- `connect-src` already includes `https://*.googleapis.com`
- `img-src` already allows `https:`
- `frame-src` includes `https://www.google.com` `https://maps.google.com`

If those hosts are removed, the map canvas stays blank with CSP violations in the console.

## Guest fallback

If `mapsKey()` is empty, Stay shows a Maps embed for the stay pin. Do not ship the developer “Get Free Maps Demo Key” / `.env` card to guests.

## Verify

Stay demo: https://airpal.me/g/harbour-hotel?r=tok-101-demo&room=101

Expect: Google map, Map / Satellite, pins, no developer CTA.
