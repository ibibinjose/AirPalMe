import { test, expect } from "@playwright/test";

test.describe("Partners & Inbox CRM", () => {
  test("partners page introduces partnership and merchant opportunities", async ({ page }) => {
    await page.goto("/partners");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("inbox is a notification list", async ({ page }) => {
    await page.goto("/me/inbox");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /inbox|Your inbox|Sign in/i })).toBeVisible();
  });
});
