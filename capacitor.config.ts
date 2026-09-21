/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.airpal.app",
  appName: "AirPal",
  webDir: "dist",
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/authentication": { symlink: true },
        },
        swiftToolsVersion: "6.1",
        packageTraits: {
          "@capacitor-firebase/authentication": ["Google"],
        },
      },
    },
  },
  server: {
    // WebView origin must be the live domain so Firebase Auth, phone reCAPTCHA,
    // and authorized domains match https://airpal.me — not capacitor://localhost.
    hostname: "airpal.me",
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "airpal.me",
      "www.airpal.me",
      "airpalme-app.web.app",
      "airpalme-app.firebaseapp.com",
      "*.firebaseapp.com",
      "*.googleapis.com",
      "www.google.com",
      "www.recaptcha.net",
    ],
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FFFFFF",
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 350,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      splashFullScreen: false,
      splashImmersive: false,
    },
    Keyboard: {
      // Overlay the keyboard; JS pads and scrolls the focused field above it.
      // `body`/`native` resize fights 100dvh layouts and leaves the field covered.
      resize: "none",
      style: "light",
      resizeOnFullScreen: true,
    },
    Geolocation: {
      enableHighAccuracy: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com", "apple.com"],
    },
  },
};

export default config;
