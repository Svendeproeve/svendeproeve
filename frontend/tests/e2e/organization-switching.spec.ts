import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Organization Switching", () => {
  test("should allow switching between organizations", async ({ page }) => {
    const testUser = generateTestUser("org-switch");

    await signupUser(page, testUser);

    await page.getByTestId("show-create-org-button").click();
    const firstOrgName = `First Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(firstOrgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await expect(page.getByTestId("dashboard-greeting")).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText(firstOrgName)).toBeVisible();

    await page.getByText("+ Create or select organization").click();

    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    await expect(page.getByText("Your Organizations")).toBeVisible();
    await expect(page.getByText(firstOrgName)).toBeVisible();

    await page.getByText("Create New Organization").click();
    const secondOrgName = `Second Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(secondOrgName);
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await expect(page.getByText(secondOrgName)).toBeVisible();

    await page.getByText("+ Create or select organization").click();
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    await page.getByRole("button", { name: firstOrgName }).click();

    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });

    await expect(page.getByText(firstOrgName)).toBeVisible();
  });

  test("should show all organizations when switching", async ({ page }) => {
    const testUser = generateTestUser("org-list");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName1 = `Org 1 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName1);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.getByText("+ Create or select organization").click();
    await page.getByText("Create New Organization").click();
    const orgName2 = `Org 2 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName2);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.getByText("+ Create or select organization").click();
    await page.getByText("Create New Organization").click();
    const orgName3 = `Org 3 ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName3);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.getByText("+ Create or select organization").click();
    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 10000,
    });

    await expect(page.getByText("Your Organizations")).toBeVisible();
    await expect(page.getByText(orgName1)).toBeVisible();
    await expect(page.getByText(orgName2)).toBeVisible();
    await expect(page.getByText(orgName3)).toBeVisible();
  });

  test("should not auto-redirect when accessing onboarding with switch parameter", async ({
    page,
  }) => {
    const testUser = generateTestUser("no-redirect");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.goto("/onboarding?switch=true");

    await expect(page).toHaveURL(/\/onboarding\?switch=true/, {
      timeout: 5000,
    });
    await expect(page.getByText("Your Organizations")).toBeVisible();
  });

  test("should auto-redirect when accessing onboarding without switch parameter", async ({
    page,
  }) => {
    const testUser = generateTestUser("auto-redirect");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.goto("/onboarding");

    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });
  });
});
