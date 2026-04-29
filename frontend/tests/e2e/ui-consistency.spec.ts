import { test, expect } from "@playwright/test";

test.describe("UI Consistency", () => {
  test.describe("Logo Styling Consistency", () => {
    test("should have consistent logo styling on landing page", async ({
      page,
    }) => {
      await page.goto("/");

      const navbarLogo = page.getByText("Sortr").first();
      await expect(navbarLogo).toBeVisible();

      const navbarLogoStyles = await navbarLogo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(navbarLogoStyles.fontFamily).toContain("Inria Serif");

      const footerLogo = page.getByText("Sortr").last();
      await expect(footerLogo).toBeVisible();

      const footerLogoStyles = await footerLogo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(footerLogoStyles.fontFamily).toContain("Inria Serif");
    });

    test("should have consistent logo styling on login page", async ({
      page,
    }) => {
      await page.goto("/login");

      const logo = page.getByTestId("login-title");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveText("Sortr");

      const logoStyles = await logo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(logoStyles.fontFamily).toContain("Inria Serif");
    });

    test("should have consistent logo styling on register page", async ({
      page,
    }) => {
      await page.goto("/register");

      const logo = page.getByTestId("register-title");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveText("Sortr");

      const logoStyles = await logo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(logoStyles.fontFamily).toContain("Inria Serif");
    });

    test("should have consistent logo styling on pricing page", async ({
      page,
    }) => {
      await page.goto("/pricing");

      const navbarLogo = page.getByText("Sortr").first();
      await expect(navbarLogo).toBeVisible();

      const navbarLogoStyles = await navbarLogo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(navbarLogoStyles.fontFamily).toContain("Inria Serif");
    });

    test("should have consistent logo styling on about page", async ({
      page,
    }) => {
      await page.goto("/about");

      const navbarLogo = page.getByText("Sortr").first();
      await expect(navbarLogo).toBeVisible();

      const navbarLogoStyles = await navbarLogo.evaluate((el) =>
        window.getComputedStyle(el),
      );
      expect(navbarLogoStyles.fontFamily).toContain("Inria Serif");
    });
  });

  test.describe("Navigation Links", () => {
    test("should have working navigation links on all public pages", async ({
      page,
    }) => {
      const pages = ["/", "/pricing", "/about"];

      for (const pagePath of pages) {
        await page.goto(pagePath);

        await page.getByText("Pricing", { exact: true }).click();
        await expect(page).toHaveURL("/pricing");

        await page.goto(pagePath);
        await page.getByText("About", { exact: true }).click();
        await expect(page).toHaveURL("/about");

        await page.goto(pagePath);
        await page.getByRole("button", { name: /log in/i }).click();
        await expect(page).toHaveURL("/login");
      }
    });
  });
});
