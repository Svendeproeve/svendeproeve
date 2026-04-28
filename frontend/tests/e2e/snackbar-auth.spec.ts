import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Auth Pages Snackbar Notifications", () => {
  test("Login page shows snackbar on validation error", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "All fields are required",
    );
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute(
      "class",
      /MuiAlert-standardError/,
    );
  });

  test("Login page shows snackbar on authentication error", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByTestId("login-email-input").fill("wrong@example.com");
    await page.getByTestId("login-password-input").fill("wrongpassword");
    await page.getByTestId("login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      /Login failed|Invalid credentials/i,
    );
  });

  test("Register page shows snackbar on validation errors", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByTestId("register-fullname-input").fill("A");
    await page.getByTestId("register-email-input").fill("test@example.com");
    await page.getByTestId("register-password-input").fill("short");
    await page.getByTestId("register-confirm-password-input").fill("short");
    await page.getByTestId("register-submit-button").click();

    let snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Password must be at least 8 characters",
    );

    await page.locator(".MuiSnackbar-root .MuiAlert-action button").click();

    await page.getByTestId("register-password-input").fill("password123");
    await page
      .getByTestId("register-confirm-password-input")
      .fill("different123");
    await page.getByTestId("register-submit-button").click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Passwords do not match",
    );
  });

  test("Forgot password page shows snackbar on validation error", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByTestId("forgot-password-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Email is required",
    );
  });

  test("Forgot password page shows snackbar on success", async ({ page }) => {
    await page.goto("/forgot-password");

    await page
      .getByTestId("forgot-password-email-input")
      .fill("test@example.com");
    await page.getByTestId("forgot-password-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      /password reset link has been sent/i,
    );
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute(
      "class",
      /MuiAlert-standardSuccess/,
    );
  });

  test("Reset password page shows snackbar on validation errors", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=test-token");

    await page.getByTestId("reset-password-submit-button").click();

    let snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "All fields are required",
    );

    await page.locator(".MuiSnackbar-root .MuiAlert-action button").click();

    await page.getByTestId("reset-password-new-password-input").fill("short");
    await page
      .getByTestId("reset-password-confirm-password-input")
      .fill("short");
    await page.getByTestId("reset-password-submit-button").click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Password must be at least 8 characters",
    );

    await page.locator(".MuiSnackbar-root .MuiAlert-action button").click();

    await page
      .getByTestId("reset-password-new-password-input")
      .fill("password123");
    await page
      .getByTestId("reset-password-confirm-password-input")
      .fill("different123");
    await page.getByTestId("reset-password-submit-button").click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Passwords do not match",
    );
  });

  test("Reset password page shows snackbar on missing token", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Invalid or missing reset token",
    );
  });

  test("Onboarding page shows snackbar on validation errors", async ({
    page,
  }) => {
    const testUser = generateTestUser("onboarding-snackbar");
    await signupUser(page, testUser);

    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-create-org-button").click();

    let snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Organization name is required",
    );

    await page.locator(".MuiSnackbar-root .MuiAlert-action button").click();

    await page.getByTestId("onboarding-org-name-input").fill("A");
    await page.getByTestId("onboarding-create-org-button").click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Organization name must be at least 2 characters",
    );
  });

  test("Snackbar persists across navigation", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();

    await page.getByRole("link", { name: "Register here!" }).click();
    await page.waitForURL("/register");

    await expect(snackbar).not.toBeVisible();
  });
});
