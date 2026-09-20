import { test, expect } from "@playwright/test";

test.describe("Discover & Places Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("airpal_disable_zoo", "1");
        localStorage.setItem("airpal.door.v1", "explore");
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
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Honest empty for Ashfield…
    await expect(page.getByText(/Nothing listed near/i).first()).toBeVisible({ timeout: 15_000 });
    // …with zero Rocks place cards leaking in, and a host onboarding path.
    await expect(page.locator("a[href^='/@'], a[href^='/p/']")).toHaveCount(0);
    await expect(page.locator("#main-content").getByRole("button", { name: "Add your place" })).toBeVisible();
  });

  test("renders discovery feed with category chips and places", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Search bar
    await expect(page.getByPlaceholder("Search places")).toBeVisible();

    // Category chips
    await expect(page.getByRole("button", { name: "Eat", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coffee", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "See", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shop", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Deals", exact: true })).toBeVisible();

    // At least one place card exists
    await expect(page.locator("a[href^='/@'], a[href^='/p/']").first()).toBeVisible();
  });

  test("filters places by category chip", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click Coffee chip
    await page.getByRole("button", { name: "Coffee", exact: true }).click();

    // Verify places are displayed under Coffee filter
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

    // Verify Walk and Maps buttons
    await expect(page.getByRole("button", { name: "Walk" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Maps" })).toBeVisible();

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
