import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __APP_VERSION_NAME__: JSON.stringify("2.0.0"),
    __APP_VERSION_CODE__: JSON.stringify("2"),
    __BUILD_TIMESTAMP__: JSON.stringify("2026-09-15T00:00:00.000Z"),
  },
  test: {
    include: ["shared/**/*.test.ts", "functions/src/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
