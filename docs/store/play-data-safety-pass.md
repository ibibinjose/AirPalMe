# Play Console — Data safety for AirPal Pass (paste)

App does **not** sell data. Encryption in transit: yes (HTTPS + HSTS). Users can request deletion: Settings → Delete account, or AirPalMe@gmail.com / hello@airpal.me.

The native Pass app requires an account on open (same gate as AirPal); the website browses without one.

## Data collected

| Type             | Collected | Optional            | Purpose                           | Shared                                                  |
| ---------------- | --------- | ------------------- | --------------------------------- | ------------------------------------------------------- |
| Precise location | Yes       | Yes                 | App functionality (nearby events) | No                                                      |
| Email            | Yes       | Account required    | Account (ticket holders)          | Firebase Auth                                           |
| Phone            | Yes       | Account required    | Account (ticket holders)          | Firebase Auth                                           |
| Name             | Yes       | Account required    | Account / tickets                 | Firebase; shown to organisers on scanned passes         |
| User IDs         | Yes       | Account required    | Account                           | Firebase                                                |
| App interactions | Yes       | Yes                 | Tickets, claims, scans            | No third-party ads                                      |
| Purchase history | Yes       | If they buy tickets | App functionality                 | Stripe (payment processor) — no card numbers in the app |

## Data not collected

Photos library, contacts, calendar, SMS, audio, health, financial account numbers, advertising ID. Camera frames for QR door scans are processed on-device and never stored or uploaded.

## Security

- Data encrypted in transit
- Users can request deletion
- Independent security review: no
- Committed to Play Families Policy: no (18+)

## Advertising ID

Not used. Manifest removes `AD_ID`.
