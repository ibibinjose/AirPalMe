# iOS compiler warnings (`@capacitor-firebase/authentication`)

Yellow triangles in Xcode. **0 errors is TestFlight / App Store ready.**

Plugin: `@capacitor-firebase/authentication` 8.5.2  
Sources: `node_modules/@capacitor-firebase/authentication/ios/Plugin/` (SPM symlink under `ios/App/CapApp-SPM/symlinks/`).

## Cleared (do not re-open)

| File | Warning | Status in 8.5.2 |
| --- | --- | --- |
| `Handlers/GoogleAuthProviderHandler.swift` | `unowned` capture of `self` vs strong outer capture | Outer `DispatchQueue.main.async { [weak self] in` + `guard let self else { return }` |
| `FirebaseAuthentication.swift` | Result of `addStateDidChangeListener` unused | `_ = Auth.auth().addStateDidChangeListener` (same as ID token listener) |

`npx cap sync` re-copies this plugin. Do not hand-edit a copy inside DerivedData.

## Remaining (leave them)

| File | Warning | Why we keep it |
| --- | --- | --- |
| `FirebaseAuthentication.swift` | `fetchSignInMethods(forEmail:completion:)` deprecated | Upstream Firebase Auth. Plugin still exposes the old method. AirPal does not call it. |
| `FirebaseAuthentication.swift` | `updateEmail(to:completion:)` deprecated; use `sendEmailVerification(beforeUpdatingEmail:)` | Same. AirPal changes email via the **JS SDK** in `src/lib/auth-mail.ts`, with `skipNativeAuth: true` on Google/Apple. |

These do **not** block Archive, TestFlight, or App Store review. Do not fork the plugin or bump Firebase solely to silence them. They go away when the plugin adopts the new Auth APIs.

## Archive

Scheme **App**, destination **Any iOS Device (arm64)**. Marketing **2.0.0**. See `docs/store/testflight.md`.
