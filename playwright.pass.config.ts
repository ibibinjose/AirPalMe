import { defineConfig, devices } from "@playwright/test";

// Pass-shell runs: serves the app with VITE_APP_FLAVOR=pass on :3001 and
// executes only the pass-shell spec. Run: npm run test:e2e:pass
export default defineConfig({
  testDir: "./e2e",
  testMatch: "pass-shell.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev:pass",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
