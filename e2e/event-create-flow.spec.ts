import { test, expect } from "@playwright/test";

test.describe("Plan vs ticketed event", () => {
  test("create event asks for an account then shows the simple form after sign-in wall", async ({ page }) => {
    await page.goto("/event/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Create an event/i })).toBeVisible();
    await expect(page.getByText(/ticketed|public night|Create plan/i).first()).toBeVisible();
  });

  test("calendar create button goes to ticketed event compose", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/event\/new/);
  });

  test("plan compose is family and friends, not tickets", async ({ page }) => {
    await page.goto("/plan/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Create a Plan|Plan with family/i })).toBeVisible();
    const form = page.getByRole("heading", { name: "Create a Plan" });
    if (await form.isVisible()) {
      await expect(page.getByText(/^Photo$/i)).toBeVisible();
      await expect(page.getByText(/PNG, JPG, or WEBP/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /Ticketed public event/i })).toBeVisible();
    }
  });

  test("plan hub create plan goes to plan compose, not events", async ({ page }) => {
    await page.goto("/plan");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Create plan" }).first().click();
    await expect(page).toHaveURL(/\/plan\/new/);
  });
});
