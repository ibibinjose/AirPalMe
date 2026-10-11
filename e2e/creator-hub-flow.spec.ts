import { test, expect } from "@playwright/test";

test.describe("Join & business profile", () => {
  test("join explains personal account vs business profile", async ({ page }) => {
    await page.goto("/start?role=business");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Partner account", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Same login as your/i).first()).toBeVisible();
    await expect(page.getByText("Sign in — same AirPal login")).toBeVisible();
  });

  test("partner account uses the same login, then onboard", async ({ page }) => {
    await page.goto("/start?role=business");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Partner account", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Same login as your/i).first()).toBeVisible();
  });

  test("onboard is Register, You, then Google import — not Google ownership", async ({ page }) => {
    await page.goto("/business/onboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /What is the venue or business called/i })).toBeVisible();
    await expect(page.getByPlaceholder(/The Glenmore Hotel/i)).toBeVisible();
    await page.getByPlaceholder(/The Glenmore Hotel/i).fill("The Glenmore");
    await expect(page.getByRole("button", { name: "Coffee", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Coffee", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 1: Owner
    await expect(page.getByRole("heading", { name: /Owner & Contact Details/i })).toBeVisible();
    await page.getByPlaceholder(/Sarah Jenkins/i).fill("Sam Chen");
    await page.getByPlaceholder(/sarah@venue.com.au/i).fill("sam@gmail.com");
    await page.getByPlaceholder(/0412 345 678/i).fill("0412 345 678");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Location & verify
    await expect(page.getByRole("heading", { name: /Verify Location Details/i })).toBeVisible();
    await page.getByPlaceholder(/18 Lower Fort/i).fill("96 Cumberland St, The Rocks");
    await page.getByText(/I manage this venue listing/i).click();
    await page.getByText(/This is my legitimate business/i).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Review & Go Live
    await expect(page.getByRole("heading", { name: /Review & Go Live/i })).toBeVisible();
    await expect(page.getByText(/The Glenmore/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Go Live/i })).toBeVisible();
  });

  test("after go live, setup is add 3 things", async ({ page }) => {
    await page.goto("/business/setup");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Add 3 things/i })).toBeVisible();
  });

  test("personal bio edit does not import a Google listing", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "airpal.bios.v1",
        JSON.stringify([
          {
            id: "bio-maya",
            handle: "maya",
            kind: "person",
            name: "Maya",
            shortWhy: "On AirPal",
            city: "Sydney",
            category: "services",
            hours: "",
            openNow: true,
            products: [],
            services: [],
            deals: [],
            links: [],
          },
        ]),
      );
    });
    await page.goto("/bio/edit");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Personal Profile")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Import or sync the listing/i })).toHaveCount(0);
    await expect(page.getByTestId("personal-listing-hint")).toBeVisible();
    await expect(page.getByRole("button", { name: /Register the business/i })).toBeVisible();
  });
});

