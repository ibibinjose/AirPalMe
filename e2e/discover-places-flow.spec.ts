import { test, expect } from "@playwright/test";

test.describe("Discover & Places Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("airpal_disable_zoo", "1");
      } catch {
        /* ignore */
      }
    });
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
    await expect(page.locator("div[role='link']").first()).toBeVisible();
  });

  test("filters places by category chip", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click Coffee chip
    await page.getByRole("button", { name: "Coffee", exact: true }).click();

    // Verify places are displayed under Coffee filter
    await expect(page.locator("div[role='link']").first()).toBeVisible();
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
