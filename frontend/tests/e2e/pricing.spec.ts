import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test("should display pricing page when not authenticated", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Check that the pricing card title is visible (just "FREE" not in bullet points)
    await expect(
      page
        .getByRole("heading", { name: "FREE" })
        .or(page.getByText("FREE").first()),
    ).toBeVisible();
    await expect(page.getByText("0 DKK")).toBeVisible();

    await expect(
      page.getByText("FREE SMTP CONNECTIONS", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("FREE IMAP CONNECTIONS", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("FREE ORGANIZATION USERS", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /register/i })).toBeVisible();
  });

  test("should navigate to register from Register button", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: /register/i }).click();

    await expect(page).toHaveURL("/register");
  });

  test("should navigate to login from navbar", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL("/login");
  });

  test("should navigate to landing page from logo", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByText("Sortr").first().click();

    await expect(page).toHaveURL("/");
  });

  test("should navigate to pricing from navbar Pricing link", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText("Pricing").click();

    await expect(page).toHaveURL("/pricing");
  });

  test("should navigate to about from navbar About link", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByText("About").click();

    await expect(page).toHaveURL("/about");
  });
});
