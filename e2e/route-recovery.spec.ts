import { test, expect } from "@playwright/test";

test.describe("Route error recovery", () => {
  test("a failed page chunk shows reload and recovers after reload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Fail the plan-thread chunk exactly once (dev server serves source modules).
    await page.route("**/PlanDetailPage.tsx*", (route) => route.abort("failed"), { times: 1 });
    await page.goto("/plan/e2e-missing-chunk");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("This page broke")).toBeVisible();
    // Chunk failures offer reload (an in-place retry cannot clear React's
    // cached rejected import). The card renders in-shell: the dock is
    // intentionally hidden on plan routes, so assert layout containment.
    await expect(page.locator("#main-content").getByText("This page broke")).toBeVisible();
    const reload = page.getByRole("button", { name: "Reload page" });
    await expect(reload).toBeVisible();
    await reload.click();
    // Reload refetches the chunk (the one-shot abort is spent); the unknown
    // id lands on the not-found page.
    await expect(page.getByText("This page broke")).toHaveCount(0);
    await expect(page).toHaveURL(/\/plan\/e2e-missing-chunk/);
    await expect(page.getByText("404", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
