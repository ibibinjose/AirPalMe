# Play Console — Data safety (paste)

App does **not** sell data. Encryption in transit: yes (HTTPS + HSTS). Users can request deletion: Settings → Delete account, or AirPalMe@gmail.com / hello@airpal.me.

## Data collected

| Type             | Collected | Optional         | Purpose                               | Shared                                                  |
| ---------------- | --------- | ---------------- | ------------------------------------- | ------------------------------------------------------- |
| Precise location | Yes       | Yes              | App functionality (nearby places)     | No (city-only presence if the user opts in to Circle)   |
| Photos           | Yes       | Yes              | App functionality (profile / listing) | Stored in Firebase Storage for the listing              |
| Email            | Yes       | Account required | Account                               | Firebase Auth                                           |
| Phone            | Yes       | Account required | Account                               | Firebase Auth                                           |
| Name             | Yes       | Account required | Account / profile                     | Public first name on bio if they publish                |
| User IDs         | Yes       | Account required | Account                               | Firebase                                                |
| App interactions | Yes       | Yes              | Analytics / app functionality         | No third-party ads                                      |
| Purchase history | Yes       | If they book     | App functionality                     | Stripe (payment processor) — no card numbers in the app |

## Data not collected

Contacts, calendar, SMS, files unrelated to photos they pick, audio, health, financial account numbers, advertising ID.

## Security

- Data encrypted in transit
- Users can request deletion
- Independent security review: no
- Committed to Play Families Policy: no (18+)

## Advertising ID

Not used. Manifest removes `AD_ID`.
