import { test, expect } from "@playwright/test";

test.describe("Discover & Places Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("airpal_disable_zoo", "1");
        localStorage.setItem(
          "airpal.location.v1",
          JSON.stringify({ mode: "city", city: "Sydney", lat: -33.8688, lng: 151.2093 }),
        );
      } catch {
        /* ignore */
      }
    });
  });

  test("Ashfield GPS does not dump The Rocks — honest empty state", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: -33.8889, longitude: 151.1256 });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("airpal.location.v1", JSON.stringify({ mode: "gps" }));
      } catch {
        /* ignore */
      }
    });
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Honest empty for Ashfield with See The Rocks override option
    await expect(page.getByText(/Nothing listed near/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "See The Rocks" })).toBeVisible();
  });

  test("renders discovery feed with category chips and places", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("domcontentloaded");

    // Search bar
    await expect(page.getByRole("combobox")).toBeVisible();

    // Category chips
    const main = page.locator("#main-content");
    await expect(main.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Events", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Places", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Food & Drinks", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Mates", exact: true })).toBeVisible();

    // At least one place card exists
    await expect(page.locator("a[href^='/@'], a[href^='/p/']").first()).toBeVisible();
  });

  test("filters places by category chip", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("domcontentloaded");

    // Click Food & Drinks chip
    await page.locator("#main-content").getByRole("button", { name: "Food & Drinks", exact: true }).click();

    // Verify places are displayed under Food & Drinks filter
    await expect(page.locator("a[href^='/@'], a[href^='/p/']").first()).toBeVisible();
  });

  test("navigates into Place detail and uses floating back button", async ({ page }) => {
    // Navigate directly to a curated place
    await page.goto("/p/glenmore");
    await page.waitForLoadState("domcontentloaded");

    // Verify place title is visible
    await expect(page.getByRole("heading", { name: /The Glenmore Hotel/i })).toBeVisible();

    // Verify floating top controls (back button and share button)
    const backBtn = page.getByLabel("Go back");
    await expect(backBtn).toBeVisible();
    await expect(page.getByLabel("Share place")).toBeVisible();

    // Verify Walk there and Maps buttons
    await expect(page.getByRole("button", { name: "Walk there" })).toBeVisible();
    await expect(page.getByRole("button", { name: /maps/i })).toBeVisible();

    // Close zoo sheet if it popped up
    const closeOverlay = page.getByLabel("Close");
    if (await closeOverlay.isVisible().catch(() => false)) {
      await closeOverlay.click().catch(() => {});
    }

    // Click back button to return
    await backBtn.click({ force: true });
    await expect(page).toHaveURL("/");
  });
});
