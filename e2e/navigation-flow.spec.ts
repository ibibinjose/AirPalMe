import { test, expect } from "@playwright/test";

test.describe("Global Navigation & Profile Flow", () => {
  test("desktop top navigation links between major application hubs", async ({ page }) => {
    // TopNav is visible on large screens (default viewport in playwright desktop is 1280x720)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("header.hidden.lg\\:block");
    await expect(header).toBeVisible();

    // Navigate to Stay / Concierge
    await header.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(/\/concierge/);

    // Navigate to Calendar
    await header.getByRole("button", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole("heading", { name: /Event Calendar/i })).toBeVisible();

    // Navigate to Explore (home)
    await header.getByRole("button", { name: "Explore" }).click();
    await expect(page).toHaveURL("/");

    // Become a host button in header
    await header.getByRole("button", { name: "Become a Host" }).click();
    await expect(page).toHaveURL(/\/join/);
  });

  test("unauthenticated profile menu provides entry to auth and partner tracks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open profile menu
    const menuTrigger = page.getByRole("button", { name: /Sign in menu/i });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    // Dropdown options
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Welcome to AirPal")).toBeVisible();
    await expect(menu.getByRole("button", { name: /Sign in \/ Create account/i })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Become a Host/i })).toBeVisible();
    await expect(menu.getByRole("button", { name: /List a Business/i })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Organise an Event/i })).toBeVisible();

    // Click Sign in / Create account -> goes to /start
    await menu.getByRole("button", { name: /Sign in \/ Create account/i }).click();
    await expect(page).toHaveURL(/\/start/);
  });

  test("mobile bottom tab bar enables smooth thumb navigation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const tabNav = page.locator("nav.lg\\:hidden");
    await expect(tabNav).toBeVisible();

    // Navigate to Calendar via bottom tab
    await tabNav.getByRole("button", { name: "Calendar" }).click();
    await expect(page).toHaveURL(/\/calendar/);

    // Navigate to Stay via bottom tab
    await tabNav.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(/\/concierge/);

    // Navigate back to Explore via bottom tab
    await tabNav.getByRole("button", { name: "Explore" }).click();
    await expect(page).toHaveURL("/");
  });

  test("universal quick search command palette opens and navigates to places and tools", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click the search button in header
    const searchBtn = page.getByRole("button", { name: "Search" }).first();
    await searchBtn.click();

    const searchInput = page.getByPlaceholder(/Search places, live events/i);
    await expect(searchInput).toBeVisible();

    // Search for Glenmore
    await searchInput.fill("Glenmore");
    const result = page.getByRole("button", { name: /The Glenmore/i }).first();
    await expect(result).toBeVisible();

    // Click the result to navigate
    await result.click();
    await expect(page).toHaveURL(/\/place\/glenmore/);
  });
});
