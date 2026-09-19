import { test, expect } from "@playwright/test";

test.describe("Authentication & Security Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders login and signup segmented controls on /start", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign In", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mobile" })).toBeVisible();

    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
  });

  test("create account starts with handle and mobile, not email", async ({ page }) => {
    await page.getByRole("button", { name: "Create Account", exact: true }).click();

    await expect(page.getByPlaceholder("maya")).toBeVisible();
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send SMS code" })).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Alex Rivera")).toHaveCount(0);
    await expect(page.getByPlaceholder("you@domain.com")).toHaveCount(0);
  });

  test("toggles password visibility with Eye icon", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = page.getByRole("button", { name: "Show password" });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    const hideBtn = page.getByRole("button", { name: "Hide password" });
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("mobile sign-in offers password and SMS", async ({ page }) => {
    await page.getByRole("button", { name: "Mobile" }).click();
    await expect(page.getByRole("button", { name: "Password", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "SMS code" })).toBeVisible();
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByText(/SMS code always works/i)).toBeVisible();

    await page.getByRole("button", { name: "SMS code" }).click();
    await expect(page.getByRole("button", { name: "Send SMS Code" })).toBeVisible();
  });

  test("displays context-aware role banner for Host and Business", async ({ page }) => {
    await page.goto("/start?role=host");
    await expect(page.getByText("Host Portal")).toBeVisible();
    await expect(page.getByText("Sign in to Host Tools")).toBeVisible();

    await page.goto("/start?role=business");
    await expect(page.getByText("Your place", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sign in to add your place")).toBeVisible();
  });

  test("renders password reset view and navigates back to Sign In", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();

    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Email reset link" })).toBeVisible();

    await page.getByRole("button", { name: "Back to Sign In" }).click();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
  });

  test("displays AuthGate when navigating to protected role routes", async ({ page }) => {
    await page.goto("/host");
    await expect(page.getByRole("heading", { name: "List your place" })).toBeVisible();
    await expect(page.getByText("Host", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in with Email or Phone/i })).toBeVisible();

    await page.getByRole("button", { name: /Sign in with Email or Phone/i }).click();
    await expect(page).toHaveURL(/\/start\?tab=signin&next=%2Fhost&role=host/);
  });
});
