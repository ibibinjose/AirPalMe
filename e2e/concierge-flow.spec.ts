import { test, expect } from "@playwright/test";

test.describe("Concierge & Stay Companion Flow", () => {
  test("shows scan prompt with no demo room shortcut", async ({ page }) => {
    await page.goto("/concierge");
    await page.waitForLoadState("domcontentloaded");

    // No stay session: guest sees Scan + Explore, never a fake demo room.
    await expect(page.getByRole("button", { name: /Scan a code|Scan/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Try demo room/i })).toHaveCount(0);
  });

  test("direct URL access loads stay companion with 8 action tiles", async ({ page }) => {
    await page.goto("/g/harbour-hotel?r=tok-101-demo&room=101");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/Room 101/i).first()).toBeVisible();

    // Verify key action tiles exist in the 8-tile grid
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: "Wi-Fi", exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Staff" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Dining" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Calendar" })).toBeVisible();
  });

  test("Wi-Fi tile never invents a password for unknown stays", async ({ page }) => {
    await page.goto("/g/harbour-hotel?r=tok-101-demo&room=101");
    await page.waitForLoadState("domcontentloaded");

    // Click Wi-Fi tile in main content
    await page.getByRole("main").getByRole("button", { name: "Wi-Fi", exact: true }).click();

    // The demo stay publishes a network name but no password: the sheet must
    // point at the front desk and offer no password to copy.
    await expect(page.getByText(/ask front desk/i).first()).toBeVisible();
    await expect(page.getByText("Password", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copy Password" })).toHaveCount(0);
  });

  test("Calendar tile in concierge navigates directly to /calendar", async ({ page }) => {
    await page.goto("/g/harbour-hotel?r=tok-101-demo&room=101");
    await page.waitForLoadState("domcontentloaded");

    // Click Calendar tile
    await page.getByRole("main").getByRole("button", { name: "Calendar" }).click();

    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole("heading", { name: "Event Calendar" })).toBeVisible();
  });

  test("Ask AirPal input answers questions about checkout & breakfast", async ({ page }) => {
    await page.goto("/g/harbour-hotel?r=tok-101-demo&room=101");
    await page.waitForLoadState("domcontentloaded");

    const askInput = page.getByPlaceholder(/Ask AirPal/i);
    await expect(askInput).toBeVisible();

    await askInput.fill("What time is checkout?");
    await askInput.press("Enter");

    // Sheet should pop up answering the question with Checkout title
    await expect(page.getByText("Checkout").first()).toBeVisible();
  });
});
