import { test, expect } from "@playwright/test";
import {
  generateTestUser,
  completeOnboarding,
  logout,
  TestUser,
} from "../helpers/auth";

test.describe("Login Flow", () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser("login");
    await completeOnboarding(page, testUser);
    await logout(page);
    await page.goto("/login");
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.getByTestId("login-email-input").fill(testUser.email);
    await page.getByTestId("login-password-input").fill(testUser.password);
    await page.getByTestId("login-submit-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.getByTestId("login-email-input").fill("wrong@example.com");
    await page.getByTestId("login-password-input").fill("wrongpassword");
    await page.getByTestId("login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      /Login failed|Invalid credentials/i,
    );
  });

  test("should show validation error when fields are empty", async ({
    page,
  }) => {
    await page.getByTestId("login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "All fields are required",
    );
  });
});
