import { test, expect } from "@playwright/test";

test.describe("Circle CRM", () => {
  test("circle asks to sign in, then is a place for audience", async ({ page }) => {
    await page.goto("/circle");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: /Bring your people here|Your people|Start your Circle/i }),
    ).toBeVisible();
    await expect(page.getByText(/share I.?m here at an event/i)).toBeVisible();
  });

  test("inbox is a notification list", async ({ page }) => {
    await page.goto("/me/inbox");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /inbox|Your inbox|Sign in/i })).toBeVisible();
  });
});
