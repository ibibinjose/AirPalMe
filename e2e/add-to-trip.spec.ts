import { test, expect } from "@playwright/test";

/**
 * Contextual "Add to Trip" (playbook §6–7): detail pages offer the stop to an
 * upcoming plan and confirm with the plan name. The guest path (no login, no
 * plans) is covered here; the signed-in pick-a-plan path needs an authed
 * session, which the suite does not provide yet.
 */
test.describe("Add to Trip", () => {
  test("place page offers Add to Trip and prompts a first trip for guests", async ({ page }) => {
    await page.goto("/p/glenmore");
    await page.waitForLoadState("domcontentloaded");

    const add = page.getByRole("button", { name: "Add to Trip" }).filter({ visible: true }).first();
    await expect(add).toBeVisible();
    await add.click();

    const sheet = page.getByRole("dialog", { name: "Add to trip" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /plan a trip/i })).toBeVisible();
  });
});
