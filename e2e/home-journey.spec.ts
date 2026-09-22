import { test, expect } from "@playwright/test";

/**
 * Home exposes the AirPal journey: Discover → Connect → Plan → Go.
 * (Playbook §24, adapted to the shipped UI.)
 */
test.describe("Home journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("airpal.door.v1", "explore");
      } catch {
        /* ignore */
      }
    });
  });

  test("home exposes the journey: title, search, quick actions", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { level: 1, name: "What's on" })).toBeVisible();
    await expect(page.getByRole("button", { name: /where are you going/i })).toBeVisible();

    const quick = page.getByRole("navigation", { name: /quick actions/i });
    await expect(quick).toBeVisible();
    for (const label of ["Places", "Events", "Plan", "People"]) {
      await expect(quick.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("events tile leads to the calendar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("navigation", { name: /quick actions/i }).getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(/\/calendar/);
  });
});
