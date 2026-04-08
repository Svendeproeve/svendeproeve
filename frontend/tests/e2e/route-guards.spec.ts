import { test, expect } from "@playwright/test";
import { generateTestUser } from "../helpers/auth";

test.describe("Route Guards", () => {
  const testUser = generateTestUser("guards");
  let authenticatedEmail: string;

  test.beforeEach(async ({ page }) => {
    authenticatedEmail = `guard-test-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(authenticatedEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page
      .getByTestId("register-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName!);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByText("Your Organizations")).toBeVisible({
      timeout: 10000,
    });

    await page.getByText(testUser.orgName!).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from landing to dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from login to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect authenticated user from register to dashboard", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should redirect to onboarding if no organization exists", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });

    const newEmail = `no-org-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(newEmail);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page
      .getByTestId("register-confirm-password-input")
      .fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });
});
