import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __APP_VERSION_NAME__: JSON.stringify("2.0.0"),
    __APP_VERSION_CODE__: JSON.stringify("2"),
    __BUILD_TIMESTAMP__: JSON.stringify("2026-09-15T00:00:00.000Z"),
    __FIREBASE_APPLET_CONFIG__: JSON.stringify({}),
  },
  test: {
    include: ["shared/**/*.test.ts", "src/**/*.test.ts", "functions/src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      { find: "@capacitor-firebase/authentication", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/authentication.ts") },
      { find: "@capacitor/core", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/core.ts") },
      { find: "@capacitor/app", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/app.ts") },
      { find: "@capacitor/status-bar", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/status-bar.ts") },
      { find: "@capacitor/splash-screen", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/splash-screen.ts") },
      { find: "@capacitor/haptics", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/haptics.ts") },
      { find: "@capacitor/share", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/share.ts") },
      { find: "@capacitor/keyboard", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/keyboard.ts") },
      { find: "@capacitor/geolocation", replacement: path.resolve(import.meta.dirname, "src/shims/capacitor/geolocation.ts") },
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      { find: "@shared", replacement: path.resolve(import.meta.dirname, "shared") },
    ],
  },
});
