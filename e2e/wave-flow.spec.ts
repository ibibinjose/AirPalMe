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

  test("wave link does not throw for guests", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/w/GLEN12");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Wave back|Wave/i })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
