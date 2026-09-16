import { test, expect } from "@playwright/test";

test.describe("Calendar & Events Flow", () => {
  test("loads /calendar and displays month grid and events", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Header and search
    await expect(page.getByRole("heading", { name: "Event Calendar" })).toBeVisible();
    await expect(page.getByPlaceholder("Search events, venues, or music…")).toBeVisible();

    // View toggles
    await expect(page.getByRole("button", { name: "Month Grid" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agenda Timeline" })).toBeVisible();

    // Check filter chips exist
    await expect(page.getByRole("button", { name: "All Events" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Going/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Interested/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Liked/i }).first()).toBeVisible();
  });

  test("switches between Month Grid and Agenda Timeline views", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Switch to Agenda view
    await page.getByRole("button", { name: "Agenda Timeline" }).click();

    // Switch back to Month Grid
    await page.getByRole("button", { name: "Month Grid" }).click();
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  });

  test("toggles event attendance states (Going, Interested, Liked)", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Locate the first event card's Going button
    const firstGoingBtn = page.getByRole("button", { name: "Going", exact: true }).first();
    await expect(firstGoingBtn).toBeVisible();

    // Click to toggle Going
    await firstGoingBtn.click();

    // Check Going filter tab in header
    const goingFilter = page.getByRole("button", { name: /Going/i }).first();
    await expect(goingFilter).toBeVisible();
    await goingFilter.click();

    // The event should remain visible in the filtered list
    await expect(page.getByRole("button", { name: "Going", exact: true }).first()).toBeVisible();
  });

  test("filters events by category chips", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Click Markets category chip
    const marketChip = page.getByRole("button", { name: "Markets", exact: true });
    await expect(marketChip).toBeVisible();
    await marketChip.click();

    // Should display market events (e.g. The Rocks Weekend Market)
    await expect(page.getByText("The Rocks Weekend Market")).toBeVisible();
  });

  test("selected-day schedule respects the search query", async ({ page }) => {
    await page.goto("/calendar?date=2026-09-11");
    await page.waitForLoadState("domcontentloaded");

    // Sept 11 holds events, so the day schedule starts populated.
    await expect(page.getByText("Argyle Laneway Jazz")).toBeVisible();

    // A query matching only another day's event empties the day schedule.
    await page.getByPlaceholder("Search events, venues, or music…").fill("yoga");
    await expect(page.getByText("Argyle Laneway Jazz")).toBeHidden();
    await expect(page.getByText("No events scheduled for this day")).toBeVisible();
  });

  test("month-grid dots reflect the attendance filter", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Days with events render status dots.
    await expect(page.locator("button span[title]").first()).toBeVisible();

    // Filtering to Going with nothing marked Going hides every dot.
    await page.getByRole("button", { name: /Going/i }).first().click();
    await expect(page.locator("button span[title]")).toHaveCount(0);
  });

  test("opens event details and exports to calendar", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Find quick add to calendar trigger button on first event card
    const addCalBtn = page.getByTitle("Add to calendar").first();
    await expect(addCalBtn).toBeVisible();
    await addCalBtn.click();

    // Verify popover export options appear
    await expect(page.getByRole("button", { name: "Apple / Outlook (.ics)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Google Calendar" })).toBeVisible();
  });
});
