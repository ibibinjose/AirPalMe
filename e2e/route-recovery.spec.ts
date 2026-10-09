import { test, expect } from "@playwright/test";

test.describe("Route error recovery", () => {
  test("a failed page chunk shows the retry card and Try again recovers", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Fail the plan-thread chunk exactly once (dev server serves source modules).
    await page.route("**/PlanDetailPage.tsx*", (route) => route.abort("failed"), { times: 1 });
    await page.goto("/plan/e2e-missing-chunk");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("This page broke")).toBeVisible();
    const retry = page.getByRole("button", { name: "Try again" });
    await expect(retry).toBeVisible();
    // Shell chrome survives the isolated crash.
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await retry.click();
    // Chunk loads on retry; the unknown id lands on the not-found page.
    await expect(page.getByText("This page broke")).toHaveCount(0);
    await expect(page).toHaveURL(/\/plan\/e2e-missing-chunk/);
    await expect(page.getByText("404", { exact: true })).toBeVisible();
  });
});
