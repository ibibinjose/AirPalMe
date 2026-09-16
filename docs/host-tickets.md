# Host ticket push

Guest **Staff** requests on Stay must reach the host on any device. `localStorage` is only an offline cache.

## Flow

1. Guest submits from Stay (`submitStaffTicket` → callable `createStaffTicket`).
2. Ticket lands at `properties/{propertyId}/tickets/{ticketId}`.
3. Host `/host` today tab and the header bell subscribe with `onSnapshot`.
4. New open tickets toast in an open AirPal tab and, if the host tapped **Enable alerts**, fire a browser notification.
5. Cloud Function `onStaffTicketCreated` writes `users/{hostUid}/hostAlerts` and sends FCM when the host has a registered token.

## Enable background push (optional)

Firebase Console → Project settings → Cloud Messaging → Web Push certificates → generate a key pair.

```
VITE_FIREBASE_VAPID_KEY=BNxxxx
```

Rebuild hosting. Hosts tap **Enable alerts** on `/host` (or the bell menu). Tokens store at `users/{uid}/fcmTokens`.

Without a VAPID key, the live inbox and in-tab toast still work. Closed-tab push does not.

## Callables

- `createStaffTicket` — guests (including anonymous QR sessions), rate-limited as `ticket`
- `resolveStaffTicket` — host/staff/admin on that property

## Deploy

```
npm run deploy:functions
npm run deploy:rules
npm run deploy:hosting
```
