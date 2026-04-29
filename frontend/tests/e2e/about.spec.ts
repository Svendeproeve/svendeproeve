import { test, expect } from "@playwright/test";

test.describe("About Page", () => {
  test("should display about page when not authenticated", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByText("About Sortr")).toBeVisible();
    await expect(
      page.getByText(
        /Sortr is a school project exam\/svendeprøve made by Julius, Oskar and Noah/,
      ),
    ).toBeVisible();
    await expect(page.getByText(/sorts email using AI/)).toBeVisible();
    await expect(page.getByText(/IMAP and SMTP connections/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /get started now/i }),
    ).toBeVisible();
  });

  test("should navigate to register from Get Started button", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: /get started now/i }).click();

    await expect(page).toHaveURL("/register");
  });

  test("should navigate to login from navbar", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL("/login");
  });

  test("should navigate to landing page from logo", async ({ page }) => {
    await page.goto("/about");
    await page.getByText("Sortr").first().click();

    await expect(page).toHaveURL("/");
  });

  test("should navigate to pricing from navbar Pricing link", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.getByText("Pricing").click();

    await expect(page).toHaveURL("/pricing");
  });

  test("should navigate to about from landing page navbar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText("About").click();

    await expect(page).toHaveURL("/about");
  });
});
