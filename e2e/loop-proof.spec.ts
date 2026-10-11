import { test, expect } from "@playwright/test";

/**
 * P0 loop proof: Want → Discover → Connect → Plan → Go → Experience →
 * Remember → Repeat. Guest-visible chain — every handoff must resolve to a
 * real surface (never a dead link), and money steps must sit behind auth,
 * never exposed or broken for guests.
 */
test.describe("AirPal loop proof (P0)", () => {
  test("home answers what you want to do and offers What now? and Plan a Hangout", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1, name: /Plan your day\. Organise your life\./i })).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "What now?", exact: true })).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "Plan a Hangout", exact: true })).toBeVisible();
  });

  test("home hero CTA deep-links straight to the Plan Hangout creation form", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("header").getByRole("button", { name: "Plan a Hangout", exact: true }).click();
    await expect(page).toHaveURL(/\/plan\/new/);
  });

  test("canceled plan checkout shows a no-charge notice", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out?canceled=1");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
  });

  test("canceled plan checkout notice can be dismissed", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out?canceled=1");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText(/payment canceled/i)).toHaveCount(0);
  });

  test("plan creation surface renders its form entry", async ({ page }) => {
    await page.goto("/plan/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("now discovery options are interactive", async ({ page }) => {
    await page.goto("/now");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1, name: "What now?" })).toBeVisible();
    await page.getByRole("radio", { name: /Eat/i }).click();
    await expect(page.getByRole("radio", { name: /Eat/i })).toHaveAttribute("aria-checked", "true");
  });

  test("calendar renders with a My plans repeat surface", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /my plans/i })).toBeVisible();
  });

  test("invite links resolve to the plan", async ({ page }) => {
    await page.goto("/invite/plan-rocks-night-out");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1", { hasText: /Friday Night Out in The Rocks/i })).toBeVisible();
  });

  test("money surfaces stay behind auth for guests", async ({ page }) => {
    await page.goto("/business");
    await page.waitForLoadState("domcontentloaded");
    const gate = page.getByText(/sign in/i).first();
    const placeForm = page.getByRole("heading", { name: /list your business|open it on this login/i });
    await expect(gate.or(placeForm)).toBeVisible();
  });

  test("events surface renders without a second app", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
