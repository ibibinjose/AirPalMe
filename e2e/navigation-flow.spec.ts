import { test, expect } from "@playwright/test";

test.describe("Global Navigation & Profile Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("airpal.door.v1", "explore");
      } catch {
        /* ignore */
      }
    });
  });

  test("first visit is three doors, not a feed", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("airpal.door.v1");
      } catch {
        /* ignore */
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /What do you need/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Plan with people/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /See what’s on|See what's on/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /I’m staying here|I'm staying here/i })).toBeVisible();
    await page.getByRole("button", { name: /See what’s on|See what's on/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1, name: "What's on" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Where are you going/i })).toBeVisible();
  });

  test("desktop top navigation links between major application hubs", async ({ page }) => {
    // TopNav is visible on large screens (default viewport in playwright desktop is 1280x720)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("header.hidden.lg\\:block");
    await expect(header).toBeVisible();

    await header.getByRole("button", { name: "Explore" }).click();
    await expect(page).toHaveURL(/\/explore/);

    await header.getByRole("button", { name: "Plan" }).click();
    await expect(page).toHaveURL(/\/plan/);

    await header.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL("/");

    await header.getByRole("button", { name: "Partner account" }).click();
    await expect(page).toHaveURL(/\/start\?role=business/);
  });

  test("time and weather sit above the main nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const locationBtn = page.getByRole("button", { name: /Current location/i }).first();
    await expect(locationBtn).toBeVisible();
    const header = page.locator("header.hidden.lg\\:block");
    await expect(header).toBeVisible();

    const weatherBox = await locationBtn.boundingBox();
    const headerBox = await header.boundingBox();
    expect(weatherBox).toBeTruthy();
    expect(headerBox).toBeTruthy();
    expect(weatherBox!.y).toBeLessThan(headerBox!.y);
  });

  test("unauthenticated profile menu provides entry to auth and partner tracks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open profile menu
    const menuTrigger = page.getByRole("button", { name: /menu and sign in/i });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    // Dropdown options
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Welcome to AirPal")).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Sign in \/ Create account/i })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Start your Circle/i })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Partner account/i })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Become a Host/i })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Organise an Event/i })).toBeVisible();

    // Click Sign in / Create account -> goes to /start
    await menu.getByRole("menuitem", { name: /Sign in \/ Create account/i }).click();
    await expect(page).toHaveURL(/\/start/);
  });

  test("mobile bottom tab bar enables smooth thumb navigation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const tabNav = page.locator("nav.lg\\:hidden");
    await expect(tabNav).toBeVisible();

    // Shipped companion dock: Home / Explore / Plan / Inbox / Me.
    await tabNav.getByRole("button", { name: "Explore" }).click();
    await expect(page).toHaveURL(/\/explore/);

    await tabNav.getByRole("button", { name: "Plan" }).click();
    await expect(page).toHaveURL(/\/plan/);

    await tabNav.getByRole("button", { name: "Home" }).click();
    await expect(page).toHaveURL("/");

    await tabNav.getByRole("button", { name: "Inbox" }).click();
    await expect(page).toHaveURL(/\/me\/inbox/);

    await tabNav.getByRole("button", { name: "My bio" }).click();
    await expect(page).toHaveURL(/\/start|\/bio\/setup|\/@|\/me/);
  });

  test("universal quick search command palette opens and navigates to places and tools", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click the search button in header
    const searchBtn = page.getByRole("button", { name: "Search" }).first();
    await searchBtn.click();

    const searchInput = page.getByPlaceholder(/Search people, places, events, stays, plans/i);
    await expect(searchInput).toBeVisible();

    // Search for Glenmore
    await searchInput.fill("Glenmore");
    const result = page.getByRole("button", { name: /The Glenmore/i }).first();
    await expect(result).toBeVisible();

    // Click the result to navigate
    await result.click();
    await expect(page).toHaveURL(/\/@glenmore|\/p\/glenmore/);
  });
});
