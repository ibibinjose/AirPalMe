import { test, expect } from "@playwright/test";

test.describe("Wave", () => {
  test("scan explains waving at AirPals in the room", async ({ page }) => {
    await page.goto("/scan");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Find a Wave|is waving/i)).toBeVisible();
  });

  test("wave link asks to sign in then wave back", async ({ page }) => {
    await page.goto("/w/GLEN12");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Wave back|Wave/i })).toBeVisible();
  });
});
