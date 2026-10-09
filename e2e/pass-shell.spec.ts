import { test, expect } from "@playwright/test";

// Runs against VITE_APP_FLAVOR=pass (see playwright.pass.config.ts).
test.describe("Pass shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("root redirects to /pass", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/pass/);
    await expect(page.getByRole("heading", { name: /Your pass to experiences\./i })).toBeVisible();
  });

  test("dock shows the Pass tabs and no ecosystem switcher", async ({ page }) => {
    await page.goto("/pass");
    await page.waitForLoadState("domcontentloaded");
    const dock = page.getByRole("navigation", { name: "Primary" });
    for (const tab of ["Pass", "Events", "Tickets", "Scan"]) {
      await expect(dock.getByRole("button", { name: tab, exact: true })).toBeVisible();
    }
    await expect(dock.getByRole("button", { name: "My bio" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: /AirPal Ecosystem Selector/i })).toHaveCount(0);
  });

  test("tickets and scan routes resolve inside the shell", async ({ page }) => {
    await page.goto("/me/tickets");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/me\/tickets/);
    await page.goto("/scan");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/scan/);
  });
});
