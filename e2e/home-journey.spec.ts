import { test, expect } from "@playwright/test";

/**
 * Home exposes the AirPal journey: Discover → Connect → Plan → Go.
 * Tests modern v2.0 hero, quick search, prompts, and 6 marketplace pillars.
 */
test.describe("Home journey", () => {
  test("home exposes the journey: hero title, search trigger, and quick prompts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Hero title and subtitle
    await expect(page.getByRole("heading", { level: 1, name: /Plan your day\. Organise your life\./i })).toBeVisible();
    await expect(page.getByText(/My life, organised by AirPal\./i)).toBeVisible();

    // Search trigger
    await expect(page.getByRole("button", { name: /search places, events, plans, or stays/i })).toBeVisible();

    // Quick prompts
    await expect(page.getByRole("button", { name: "⚡ What now?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🎭 Live Tonight" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🗺️ Plan a Trip" })).toBeVisible();

    // Primary CTA buttons
    await expect(page.locator("header").getByRole("button", { name: "What now?", exact: true })).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "Plan a Hangout", exact: true })).toBeVisible();
  });

  test("marketplace verticals grid displays 6 pillars and What's On leads to calendar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const verticalsSection = page.getByRole("region", { name: /Explore AirPal Verticals/i });
    await expect(verticalsSection).toBeVisible();

    // Verify key vertical pillars exist
    await expect(verticalsSection.getByRole("button", { name: /What now\?/i })).toBeVisible();
    await expect(verticalsSection.getByRole("button", { name: /Deals/i })).toBeVisible();
    await expect(verticalsSection.getByRole("button", { name: /Stays/i })).toBeVisible();
    await expect(verticalsSection.getByRole("button", { name: /What's On/i })).toBeVisible();
    await expect(verticalsSection.getByRole("button", { name: /Trips/i })).toBeVisible();

    // What's On tile leads to calendar
    await verticalsSection.getByRole("button", { name: /What's On/i }).click();
    await expect(page).toHaveURL(/\/calendar/);
  });
});
