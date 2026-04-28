import { test, expect } from "@playwright/test";
import { generateTestUser } from "../helpers/auth";

test.describe("Registration Flow", () => {
  test("should complete full signup flow", async ({ page }) => {
    const testUser = generateTestUser("signup");

    await page.goto("/");
    await page.getByTestId("get-started-button").click();

    await expect(page).toHaveURL("/register");
    await expect(page.getByTestId("register-title")).toBeVisible();

    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(testUser.email);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page
      .getByTestId("register-confirm-password-input")
      .fill(testUser.password);

    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 15000 });
    await expect(page.getByTestId("onboarding-welcome-title")).toBeVisible();
    await expect(page.getByTestId("onboarding-subtitle")).toBeVisible();

    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName!);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible();
  });

  test("should show validation error for short password", async ({ page }) => {
    const testUser = generateTestUser("validation");

    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(testUser.email);
    await page.getByTestId("register-password-input").fill("short");
    await page.getByTestId("register-confirm-password-input").fill("short");
    await page.getByTestId("register-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Password must be at least 8 characters",
    );
  });

  test("should show validation error for password mismatch", async ({
    page,
  }) => {
    const testUser = generateTestUser("mismatch");

    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(testUser.email);
    await page.getByTestId("register-password-input").fill("password123");
    await page
      .getByTestId("register-confirm-password-input")
      .fill("different123");
    await page.getByTestId("register-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Passwords do not match",
    );
  });
});
