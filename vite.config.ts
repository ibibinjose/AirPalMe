import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function getGradleVersion(): { versionName: string; versionCode: string } {
  try {
    const gradlePath = path.resolve(import.meta.dirname, "android/app/build.gradle");
    const content = fs.readFileSync(gradlePath, "utf-8");
    const nameMatch = content.match(/versionName\s+["']([^"']+)["']/);
    const codeMatch = content.match(/versionCode\s+(\d+)/);
    return {
      versionName: nameMatch ? nameMatch[1] : "2.0.0",
      versionCode: codeMatch ? codeMatch[1] : "2",
    };
  } catch {
    return { versionName: "2.0.0", versionCode: "2" };
  }
}

const gradleVersion = getGradleVersion();

function getFirebaseAppletConfig(): Record<string, string> {
  try {
    const configPath = path.resolve(import.meta.dirname, "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {
    /* ignore */
  }
  return {};
}

const firebaseAppletConfig = getFirebaseAppletConfig();

function atHandleSpa(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const raw = req.url || "";
    let pathname = raw.split("?")[0] || "";
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      /* keep */
    }
    if (/^\/@[a-z0-9._]{3,30}\/?$/i.test(pathname) && !/^\/@(vite|fs|id)(\/|$)/i.test(pathname)) {
      const qs = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
      req.url = `/${qs}`;
    }
    next();
  };
  return {
    name: "at-handle-spa",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [atHandleSpa(), react(), tailwindcss()],
  define: {
    __APP_VERSION_NAME__: JSON.stringify(gradleVersion.versionName),
    __APP_VERSION_CODE__: JSON.stringify(gradleVersion.versionCode),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __FIREBASE_APPLET_CONFIG__: JSON.stringify(firebaseAppletConfig),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
    build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // Don't fail the build when a dep ships without source maps.
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Lazily imported via dynamic import() in src/lib/firebase.ts — must stay
          // out of the initial vendor-firebase chunk to actually defer them.
          // (Matches both the `firebase/*` shims and the real `@firebase/*` implementations.)
          if (
            id.includes("firebase/app-check") ||
            id.includes("firebase/analytics") ||
            id.includes("@firebase/app-check") ||
            id.includes("@firebase/analytics")
          ) {
            return "vendor-firebase-lazy";
          }
          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
            return "vendor-firebase-firestore";
          }
          if (
            id.includes("firebase/auth") ||
            id.includes("@firebase/auth") ||
            id.includes("@capacitor-firebase/authentication")
          ) {
            return "vendor-firebase-auth";
          }
          if (id.includes("firebase")) return "vendor-firebase-core";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "vendor-react";
          if (id.includes("leaflet") || id.includes("@vis.gl/react-google-maps")) return "vendor-maps";
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor") || id.includes("decimal.js-light")) return "vendor-charts";
          if (id.includes("qrcode") || id.includes("jsqr")) return "vendor-qr";
          if (id.includes("@capacitor/")) return "vendor-capacitor";
          if (id.includes("wouter")) return "vendor-router";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("framer-motion")) return "vendor-motion";
          return "vendor-common";
        },
      },
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
    watch: {
      ignored: ["**/android/app/src/main/assets/public/**", "**/ios/App/App/public/**"],
    },
    // Suppress "Could not read source map" warnings for deps that don't ship maps.
    sourcemapIgnoreList: (sourcePath) => sourcePath.includes("node_modules"),
  },
});
