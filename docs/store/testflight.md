# TestFlight — use 2.0.0, not 1.0

App Store version string is **2.0.0**. Build number this pack: **16** (share links use https://airpal.me, never capacitor://).

If TestFlight still shows **1.0**, you are on an old version. Apple keeps 1.0 until you enable the 2.0.0 build for testers.

## After this upload (build 12)

1. App Store Connect → **AirPal** → **TestFlight**.
2. Wait until **2.0.0 (16)** is **Ready to Test** (processing can take 5–20 minutes).
3. Open **iOS App Version 2.0.0** (create it if the only version listed is 1.0).
4. **Select a build** → choose **16**.
5. **Internal Testing** group (and External if you use it) → add build **2.0.0 (16)**.
6. On the iPhone: TestFlight app → AirPal → pull to refresh. You should see **2.0.0 (16)**. Tap **Update** or **Install**.

Do not install or keep testing **1.0**. Expire 1.0 builds: TestFlight → the 1.0 build → **Expire Build**.

## What testers should see

Native opening screen (sign-in required): Continue with Apple / Google / email or phone. Marketing version **2.0.0**, not 1.0.

IPA on disk: `ios/App/build/export/AirPal.Me.ipa`
