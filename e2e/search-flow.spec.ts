import { test, expect } from "@playwright/test";

test.describe("Search Engine Flow", () => {
  test("loads dedicated /search page with input and explore suggestions", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { level: 1, name: "Search AirPal" })).toBeVisible();
    await expect(page.getByPlaceholder(/Search places, events, deals, circles, plans/i)).toBeVisible();

    // Verify category tabs exist
    await expect(page.getByRole("button", { name: /^All/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Places/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Events/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Deals/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Circle/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Plans/ })).toBeVisible();

    // Verify explore suggestions are rendered
    await expect(page.getByText("Explore Sydney")).toBeVisible();
  });

  test("pre-fills query from URL and renders scored search results", async ({ page }) => {
    await page.goto("/search?q=Glenmore");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.getByPlaceholder(/Search places, events, deals, circles, plans/i);
    await expect(searchInput).toHaveValue("Glenmore");

    // Result card for The Glenmore Hotel
    const glenmoreCard = page.getByRole("link", { name: /The Glenmore Hotel/i }).first();
    await expect(glenmoreCard).toBeVisible();
  });

  test("category pill clicks filter results", async ({ page }) => {
    await page.goto("/search?q=coffee");
    await page.waitForLoadState("domcontentloaded");

    // Click Places tab
    const placesTab = page.getByRole("button", { name: /^Places/ });
    await placesTab.click();

    await expect(page).toHaveURL(/category=places/);
  });

  test("modal command palette full search banner navigates directly to /search", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open search modal via search button
    const searchTrigger = page.getByRole("button", { name: "Search" }).first();
    await searchTrigger.click();

    const modalInput = page.getByPlaceholder(/Search people, places, events/i);
    await expect(modalInput).toBeVisible();

    // Type query
    await modalInput.fill("harbour");

    // Click "Full AirPal Search" banner
    const fullSearchBtn = page.getByRole("button", { name: /Full AirPal Search/i });
    await expect(fullSearchBtn).toBeVisible();
    await fullSearchBtn.click();

    // Navigates to /search?q=harbour
    await expect(page).toHaveURL(/\/search\?q=harbour/);
    await expect(page.getByRole("heading", { level: 1, name: "Search AirPal" })).toBeVisible();
  });
});
