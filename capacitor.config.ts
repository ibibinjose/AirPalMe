import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.airpal.app",
  appName: "AirPal",
  webDir: "dist",
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
      resize: "body",
      style: "light",
      resizeOnFullScreen: true,
    },
    Geolocation: {
      enableHighAccuracy: true,
    },
  },
};

export default config;
