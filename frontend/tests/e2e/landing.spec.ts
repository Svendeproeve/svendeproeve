import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display landing page when not authenticated", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("landing-title")).toBeVisible();
    await expect(page.getByTestId("landing-tagline")).toBeVisible();
    await expect(page.getByTestId("get-started-button")).toBeVisible();
    await expect(page.getByTestId("login-button")).toBeVisible();
  });

  test("should navigate to register from Get Started button", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("get-started-button").click();

    await expect(page).toHaveURL("/register");
  });

  test("should navigate to login from Login button", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("login-button").click();

    await expect(page).toHaveURL("/login");
  });
});
