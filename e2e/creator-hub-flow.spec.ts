import { test, expect } from "@playwright/test";

test.describe("Join & business profile", () => {
  test("join explains personal account vs business profile", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Join the AirPal Network — Made Easy/i })).toBeVisible();
    await expect(page.getByText(/Everyone on AirPal has a personal account/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Just use AirPal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create a business profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Register the business/i })).toBeVisible();
    await expect(page.getByText("Stay Partner")).toHaveCount(0);
  });

  test("register the business goes to signup then onboard", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: /Register the business/i }).click();
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByText("Your place", { exact: true }).first()).toBeVisible();
  });

  test("onboard is Register, You, then Google import — not Google ownership", async ({ page }) => {
    await page.goto("/business/onboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Register the business/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /What's the business called/i })).toBeVisible();
    await expect(page.getByText(/Search Google/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/The Glenmore Hotel/i)).toBeVisible();
    await page.getByPlaceholder(/The Glenmore Hotel/i).fill("The Glenmore");
    await expect(page.getByRole("button", { name: "Coffee", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Coffee", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "You" })).toBeVisible();
    await expect(page.getByText(/Featured uses that address|Gmail is fine for a free listing/i)).toBeVisible();
    await page.getByPlaceholder(/Sam Chen/i).fill("Sam Chen");
    await page.getByPlaceholder(/sam@venue.com.au/i).fill("sam@gmail.com");
    await page.getByPlaceholder(/0412 345 678/i).fill("0412 345 678");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: /Verify The Glenmore/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Import or sync the listing/i })).toBeVisible();
    await expect(page.getByText(/directory claim — not Google ownership/i)).toBeVisible();
    await page.getByPlaceholder(/18 Lower Fort/i).fill("96 Cumberland St, The Rocks");
    await page.getByText(/directory claim — not Google ownership/i).click();
    await page.getByText(/This is my business and the details look right/i).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: /Check everything/i })).toBeVisible();
    await expect(page.getByText(/Directory claim/i)).toBeVisible();
    await expect(page.getByText(/Needs a work email on the Google website, or an ABN/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Go live/i })).toBeDisabled();
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

