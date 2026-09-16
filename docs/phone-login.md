# Mobile login (SMS code)

Same idea as OurFit: enter a mobile number, receive a 6-digit code, verify, you are in. New and returning people use one flow. Email/password remains under “Use email instead”.

## App

- Screen: https://airpal.me/start
- Code: `src/components/auth/PhoneLogin.tsx`, `src/lib/phone-auth.ts`

Related: [email-setup.md](./email-setup.md) for verify/reset From domain. Agent notes: [AGENTS.md](../AGENTS.md).

## Firebase Console (required before SMS works)

1. [Authentication → Sign-in method](https://console.firebase.google.com/project/airpalme-app/authentication/providers) → **Phone** → Enable.
2. Project must be on **Blaze** (pay as you go). SMS is billed by Google.
3. Authentication → Settings → **Authorized domains**: `airpal.me`, `www.airpal.me` if you use it, plus localhost for tests.
4. Optional while testing: Phone provider → **Phone numbers for testing** e.g. `+61 400 000 000` with code `123456`. Test numbers do not send SMS and do not cost money.

Until Phone is enabled **and** an SMS region is allowed, the app cannot send a code.

Firebase new projects default to an **empty SMS allowlist** (no country can receive SMS). AirPal.me is set to allow: AU, IN, NZ, SG, ID, TH, JP, CN, US, GB, AE, FR, DE.

**localhost:** Google does not send real SMS to `http://localhost:3000`. Use a number from Authentication → Sign-in method → Phone → **Phone numbers for testing**, then enter that number and its 6-digit code. No SMS is sent.

## reCAPTCHA

Web phone auth uses one invisible reCAPTCHA, created once and attached to a host node on `document.body` (`#airpal-phone-recaptcha`). Do not call `render()` yourself — `signInWithPhoneNumber` owns that. Production domains must be authorized; localhost is allowed in development.
