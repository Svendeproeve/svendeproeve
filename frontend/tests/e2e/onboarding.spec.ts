import { test, expect } from "@playwright/test";
import { generateTestUser } from "../helpers/auth";

test.describe("Onboarding Flow", () => {
  const testUser = generateTestUser("onboarding");

  test.beforeEach(async ({ page }) => {
    const email = `onboarding-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByTestId("register-fullname-input").fill(testUser.fullName);
    await page.getByTestId("register-email-input").fill(email);
    await page.getByTestId("register-password-input").fill(testUser.password);
    await page.getByTestId("register-confirm-password-input").fill(testUser.password);
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL("/onboarding", { timeout: 10000 });
  });

  test("should create organization successfully", async ({ page }) => {
    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill(testUser.orgName!);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible({ timeout: 10000 });
  });

  test("should show validation error when organization name is too short", async ({
    page,
  }) => {
    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill("A");
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByTestId("onboarding-error")).toBeVisible();
  });

  test("should show error when organization name is empty", async ({
    page,
  }) => {
    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page.getByTestId("onboarding-error")).toBeVisible();
  });
});
