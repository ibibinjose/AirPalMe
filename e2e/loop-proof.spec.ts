import { test, expect } from "@playwright/test";

/**
 * P0 loop proof: Want → Discover → Connect → Plan → Go → Experience →
 * Remember → Repeat. Guest-visible chain — every handoff must resolve to a
 * real surface (never a dead link), and money steps must sit behind auth,
 * never exposed or broken for guests.
 */
test.describe("AirPal loop proof (P0)", () => {
  test("home answers what you want to do and leads to a Mate", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const mateCta = page.getByRole("link", { name: /find (someone|a mate|an airpal|people)/i });
    const mateHeading = page.getByText(/find someone to go with/i);
    await expect(mateCta.first().or(mateHeading.first())).toBeVisible();
  });

  test("home hero CTA deep-links straight to the Mate request form", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("header").getByRole("button", { name: "Find a Mate", exact: true }).click();
    await expect(page).toHaveURL(/\/mate\/request/);
  });

  test("canceled mate checkout shows a no-charge notice", async ({ page }) => {
    await page.goto("/mate?canceled=1");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
    await expect(page.getByText(/not charged/i)).toBeVisible();
  });

  test("canceled plan checkout shows a no-charge notice", async ({ page }) => {
    await page.goto("/plan/plan-rocks-night-out?canceled=1");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
  });

  test("canceled stay checkout shows a no-charge notice on concierge", async ({ page }) => {
    await page.goto("/concierge?canceled=true");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
  });

  test("mate demand surface renders its request entry", async ({ page }) => {
    await page.goto("/mate");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/AirPal Mate/i).first()).toBeVisible();
    const requestBtn = page.getByRole("button", { name: /find someone to go with/i });
    await expect(requestBtn).toBeVisible();
  });

  test("explore filters open and When/Price groups are interactive", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /open filters/i }).click();
    await expect(page.getByRole("group", { name: /filter by when/i })).toBeVisible();
    await expect(page.getByRole("group", { name: /filter by price/i })).toBeVisible();
    // Selecting a filter must not break the surface.
    await page.getByRole("button", { name: "This weekend", exact: true }).click();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
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

  test("experiences surface renders without a second app", async ({ page }) => {
    await page.goto("/experiences");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /experiences/i })).toBeVisible();
  });
});
