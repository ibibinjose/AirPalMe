import { test, expect } from "@playwright/test";

test.describe("Tickets wallet as guest", () => {
  test("signed-out visitors get a sign-in call to action, not an empty wallet", async ({ page }) => {
    await page.goto("/me/tickets");
    await page.waitForLoadState("domcontentloaded");
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: /My event passes/ })).toBeVisible();
    await expect(main.getByText("Sign in to see your passes")).toBeVisible();
    const signIn = main.getByRole("link", { name: "Sign in", exact: true });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute("href", "/start?tab=signin");
    await expect(main.getByText("No tickets or passes yet")).toHaveCount(0);
  });
});
