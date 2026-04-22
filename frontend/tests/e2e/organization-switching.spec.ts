import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Organization Switching", () => {
  test("should allow switching between organizations", async ({ page }) => {
    const testUser = generateTestUser("org-switch");

    // Sign up the user
    await signupUser(page, testUser);

    // Create first organization
    await page.getByTestId("show-create-org-button").click();
    const firstOrgName = `First Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(firstOrgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible({
      timeout: 10000,
    });

    // Verify first org name is displayed in sidebar
    await expect(page.getByText(firstOrgName)).toBeVisible();

    // Click the organization switcher link
    await page.getByText("+ Create or select organization").click();

    // Should navigate to onboarding with switch=true parameter
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    // Should see the existing organization in the list
    await expect(page.getByText("Your Organizations")).toBeVisible();
    await expect(page.getByText(firstOrgName)).toBeVisible();

    // Create second organization
    await page.getByText("Create New Organization").click();
    const secondOrgName = `Second Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(secondOrgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Verify second org name is now displayed in sidebar
    await expect(page.getByText(secondOrgName)).toBeVisible();

    // Switch back to first organization
    await page.getByText("+ Create or select organization").click();
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    // Click on first organization to switch
    await page.getByRole("button", { name: firstOrgName }).click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    // Verify we're back in the first organization
    await expect(page.getByText(firstOrgName)).toBeVisible();
  });

  test("should show all organizations when switching", async ({ page }) => {
    const testUser = generateTestUser("org-list");

    // Sign up and create first org
    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName1 = `Org 1 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName1);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Create second org
    await page.getByText("+ Create or select organization").click();
    await page.getByText("Create New Organization").click();
    const orgName2 = `Org 2 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName2);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Create third org
    await page.getByText("+ Create or select organization").click();
    await page.getByText("Create New Organization").click();
    const orgName3 = `Org 3 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName3);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Go to organization switcher
    await page.getByText("+ Create or select organization").click();
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    // All three organizations should be listed
    await expect(page.getByText("Your Organizations")).toBeVisible();
    await expect(page.getByText(orgName1)).toBeVisible();
    await expect(page.getByText(orgName2)).toBeVisible();
    await expect(page.getByText(orgName3)).toBeVisible();
  });

  test("should not auto-redirect when accessing onboarding with switch parameter", async ({
    page,
  }) => {
    const testUser = generateTestUser("no-redirect");

    // Sign up and create organization
    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Navigate to onboarding with switch=true
    await page.goto("/onboarding?switch=true");

    // Should stay on onboarding page, not redirect to dashboard
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 5000,
    });
    await expect(page.getByText("Your Organizations")).toBeVisible();
  });

  test("should auto-redirect when accessing onboarding without switch parameter", async ({
    page,
  }) => {
    const testUser = generateTestUser("auto-redirect");

    // Sign up and create organization
    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Navigate to onboarding without switch parameter
    await page.goto("/onboarding");

    // Should auto-redirect to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });
  });
});
