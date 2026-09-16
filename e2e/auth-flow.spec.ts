import { test, expect } from "@playwright/test";

test.describe("Authentication & Security Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders login and signup segmented controls on /start", async ({ page }) => {
    // Check main segmented control and mode switches
    await expect(page.getByRole("button", { name: "Sign In", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mobile SMS" })).toBeVisible();

    // Verify Email inputs are visible in default Sign In mode
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
  });

  test("switches between Sign In and Create Account modes", async ({ page }) => {
    // Switch to Create Account
    await page.getByRole("button", { name: "Create Account", exact: true }).click();

    // In signup mode, name and public handle fields become visible
    await expect(page.getByPlaceholder("e.g. Alex Rivera")).toBeVisible();
    await expect(page.getByPlaceholder("username")).toBeVisible();

    // Type short password to trigger password checklist requirement
    await page.getByPlaceholder("••••••••").fill("short");
    await expect(page.getByText("At least 8 characters")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Free Account" })).toBeVisible();

    // Switch back to Sign In
    await page.getByRole("button", { name: "Sign In", exact: true }).first().click();
    await expect(page.getByPlaceholder("e.g. Alex Rivera")).not.toBeVisible();
  });

  test("toggles password visibility with Eye icon", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle button
    const toggleBtn = page.getByRole("button", { name: "Show password" });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to hide
    const hideBtn = page.getByRole("button", { name: "Hide password" });
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("switches to Mobile SMS OTP authentication", async ({ page }) => {
    // Switch to Mobile SMS
    await page.getByRole("button", { name: "Mobile SMS" }).click();

    // Verify Phone input and action button
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send SMS Code" })).toBeVisible();
  });

  test("displays context-aware role banner for Host and Business", async ({ page }) => {
    // Host role context
    await page.goto("/start?role=host");
    await expect(page.getByText("Host Portal")).toBeVisible();
    await expect(page.getByText("Sign in to Host Tools")).toBeVisible();

    // Business role context
    await page.goto("/start?role=business");
    await expect(page.getByText("Local Business")).toBeVisible();
    await expect(page.getByText("Sign in to Place Portal")).toBeVisible();
  });

  test("renders password reset view and navigates back to Sign In", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();

    // Verify Reset mode
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Email reset link" })).toBeVisible();

    // Click Back to Sign In
    await page.getByRole("button", { name: "Back to Sign In" }).click();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("displays AuthGate when navigating to protected role routes", async ({ page }) => {
    await page.goto("/host");
    await expect(page.getByRole("heading", { name: "List your place" })).toBeVisible();
    await expect(page.getByText("Host", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in with Email or Phone/i })).toBeVisible();

    // Clicking the CTA in AuthGate brings user to /start
    await page.getByRole("button", { name: /Sign in with Email or Phone/i }).click();
    await expect(page).toHaveURL(/\/start\?tab=signin&next=%2Fhost&role=host/);
  });
});
