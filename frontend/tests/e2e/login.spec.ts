import { test, expect } from "@playwright/test";
import { generateTestUser, completeOnboarding, logout } from "../helpers/auth";

test.describe("Login Flow", () => {
  let userEmail: string;
  const testUser = generateTestUser("login");

  test.beforeEach(async ({ page }) => {
    const signupEmail = `login-test-${Date.now()}@example.com`;
    userEmail = signupEmail;

    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(signupEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName!);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByText("Your Organizations")).toBeVisible({ timeout: 10000 });
    await page.getByText(testUser.orgName!).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    await logout(page);
    await page.goto("/");
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.getByTestId("login-button").click();

    await expect(page).toHaveURL("/login");

    await page.getByTestId("login-email-input").fill(userEmail);
    await page.getByTestId("login-password-input").fill(testUser.password);
    await page.getByTestId("login-submit-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    await expect(page.getByTestId("dashboard-weekly-stats-title")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-email-input").fill("wrong@example.com");
    await page.getByTestId("login-password-input").fill("wrongpassword");
    await page.getByTestId("login-submit-button").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("should show validation error when fields are empty", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByTestId("login-submit-button").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
