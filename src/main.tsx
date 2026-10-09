import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isNativeApp } from "./lib/native";
import { initAppFlavor } from "./lib/app-flavor";

// Offline shell for mobile web only: skip in dev (stale caches) and inside the
// Capacitor shell (custom schemes break service worker scope).
if (import.meta.env.PROD && !isNativeApp() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

// Resolve the native shell (AirPal vs AirPal Pass) before first render so the
// start route, dock, and switcher scope correctly. No-op cost on web.
void initAppFlavor().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
