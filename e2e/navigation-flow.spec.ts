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

  test("initial visit displays home hero and quick navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1, name: "What do you want to do?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /search mates, places, events, or trips/i })).toBeVisible();
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

    // Dropdown options (filter visible since desktop and mobile markup coexist in DOM)
    await expect(page.getByText("Welcome to AirPal").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Sign in \/ Create account/i }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Start your Circle/i }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Partner account/i }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Become a Host/i }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Organise an Event/i }).filter({ visible: true })).toBeVisible();

    // Click Sign in / Create account -> goes to /start
    await page.getByRole("menuitem", { name: /Sign in \/ Create account/i }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/start/);
  });

  test("mobile bottom tab bar enables smooth thumb navigation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const tabNav = page.locator("nav.lg\\:hidden");
    await expect(tabNav).toBeVisible();

    // Shipped companion dock: Home / Explore / Trips / Inbox / Me.
    await tabNav.getByRole("button", { name: "Explore" }).click();
    await expect(page).toHaveURL(/\/explore/);

    await tabNav.getByRole("button", { name: "Trips" }).click();
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

  test("showcase tour opens for guests and links live stops", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/Demo/i);
    await expect(page.getByRole("heading", { level: 1, name: /five minutes/i })).toBeVisible();
    await page.getByRole("link", { name: /tour the demo hotel/i }).click();
    await expect(page).toHaveURL(/\/DemoHotel/i);
  });
});
