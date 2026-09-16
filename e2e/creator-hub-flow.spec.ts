import { test, expect } from "@playwright/test";

test.describe("Creator & Partner Hub Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders Creator & Partner Hub header and value proposition", async ({ page }) => {
    await expect(page.getByText("Partner & Creator Hub")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome visitors, publish guides & grow locally" })
    ).toBeVisible();
    await expect(page.getByText("Whether you run a hotel, boutique venue")).toBeVisible();
  });

  test("displays all 3 role tracks: Host, Local Business, and Event Organiser", async ({ page }) => {
    // Track 1: Host
    await expect(page.getByRole("heading", { name: "Become a Host" })).toBeVisible();
    await expect(page.getByText("Instant interactive Guest Companion")).toBeVisible();
    await expect(page.getByText("One-tap Wi-Fi QR connection")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start as Host/i })).toBeVisible();

    // Track 2: Local Business
    await expect(page.getByRole("heading", { name: "List a Business" })).toBeVisible();
    await expect(page.getByText("Claim your unique public @handle")).toBeVisible();
    await expect(page.getByText("Publish live visitor deals & offers")).toBeVisible();
    await expect(page.getByRole("button", { name: /List Your Business/i })).toBeVisible();

    // Track 3: Community Events
    await expect(page.getByRole("heading", { name: "Run an Event" })).toBeVisible();
    await expect(page.getByText("Gate QR code for paperless guest entry")).toBeVisible();
    await expect(page.getByText("Interactive stall directory with booth numbers")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create an Event/i })).toBeVisible();
  });

  test("routes unauthenticated users to /start with appropriate role context banner", async ({ page }) => {
    // Click Start as Host
    await page.getByRole("button", { name: /Start as Host/i }).click();
    await expect(page).toHaveURL(/\/start\?role=host/);
    await expect(page.getByText("Host Portal")).toBeVisible();
    await expect(page.getByText("Sign in to Host Tools")).toBeVisible();

    // Return to /join and click List Your Business
    await page.goto("/join");
    await page.getByRole("button", { name: /List Your Business/i }).click();
    await expect(page).toHaveURL(/\/start\?role=business/);
    await expect(page.getByText("Local Business")).toBeVisible();
    await expect(page.getByText("Sign in to Place Portal")).toBeVisible();

    // Return to /join and click Create an Event
    await page.goto("/join");
    await page.getByRole("button", { name: /Create an Event/i }).click();
    await expect(page).toHaveURL(/\/start\?role=event/);
    await expect(page.getByText("Event Organiser")).toBeVisible();
    await expect(page.getByText("Sign in to Event Manager")).toBeVisible();
  });

  test("displays 3-step guide and trust guarantees", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Live in three simple steps" })).toBeVisible();
    await expect(page.getByText("Choose role & sign up")).toBeVisible();
    await expect(page.getByText("Enter your details")).toBeVisible();
    await expect(page.getByText("Print & display your QR")).toBeVisible();

    // Trust guarantees
    await expect(page.getByText("Zero App Download")).toBeVisible();
    await expect(page.getByText("Instant QR Kits")).toBeVisible();
    await expect(page.getByText("Safe & Privacy-First")).toBeVisible();
    await expect(page.getByText("Unified Account")).toBeVisible();
  });
});
