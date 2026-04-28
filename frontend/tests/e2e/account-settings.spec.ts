import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

const API_URL = process.env.API_URL || "http://localhost:8001";

test.describe("Account Settings", () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser("account-settings");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.goto("/account-settings");
    await expect(page.getByText("Account Settings")).toBeVisible();
  });

  test.describe("Profile Section", () => {
    test("should display profile information", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Profile Information" }),
      ).toBeVisible();
      await expect(page.getByText("Email cannot be changed")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save Changes" }),
      ).toBeVisible();
    });

    test("should successfully update full name", async ({ page }) => {
      const newName = `Updated Name ${Date.now()}`;

      const inputs = await page.locator('input[type="text"]').all();
      const fullNameInput = inputs[1];

      await fullNameInput.clear();
      await fullNameInput.fill(newName);
      await page.getByRole("button", { name: "Save Changes" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "Profile updated successfully",
      );
    });

    test("should show error when full name is empty", async ({ page }) => {
      const inputs = await page.locator('input[type="text"]').all();
      const fullNameInput = inputs[1];

      await fullNameInput.clear();
      await page.getByRole("button", { name: "Save Changes" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "Full name is required",
      );
    });
  });

  test.describe("Password Section", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Password" }).click();
      await expect(
        page.getByRole("heading", { name: "Change Password" }),
      ).toBeVisible();
    });

    test("should successfully change password", async ({ page, request }) => {
      const newPassword = `newpass${Date.now()}`;

      const passwordInputs = await page.locator('input[type="password"]').all();
      await passwordInputs[0].fill(testUser.password);
      await passwordInputs[1].fill(newPassword);
      await passwordInputs[2].fill(newPassword);

      await page.getByRole("button", { name: "Change Password" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "Password changed successfully",
      );
    });

    test("should show error when current password is incorrect", async ({
      page,
    }) => {
      const passwordInputs = await page.locator('input[type="password"]').all();
      await passwordInputs[0].fill("wrongpassword");
      await passwordInputs[1].fill("newpassword123");
      await passwordInputs[2].fill("newpassword123");

      await page.getByRole("button", { name: "Change Password" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        /current password is incorrect/i,
      );
    });

    test("should show error when new password is too short", async ({
      page,
    }) => {
      const passwordInputs = await page.locator('input[type="password"]').all();
      await passwordInputs[0].fill(testUser.password);
      await passwordInputs[1].fill("short");
      await passwordInputs[2].fill("short");

      await page.getByRole("button", { name: "Change Password" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "New password must be at least 8 characters",
      );
    });

    test("should show error when passwords do not match", async ({ page }) => {
      const passwordInputs = await page.locator('input[type="password"]').all();
      await passwordInputs[0].fill(testUser.password);
      await passwordInputs[1].fill("newpassword123");
      await passwordInputs[2].fill("differentpassword123");

      await page.getByRole("button", { name: "Change Password" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "New passwords do not match",
      );
    });

    test("should show error when password fields are empty", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Change Password" }).click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "All password fields are required",
      );
    });
  });

  test.describe("Delete Account Section", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Delete Account" }).click();
      await expect(
        page.getByRole("heading", { name: "Delete Account" }),
      ).toBeVisible();
    });

    test("should display delete account warning", async ({ page }) => {
      await expect(
        page.getByText(
          "Deleting your account is permanent and cannot be undone",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Delete all your personal data and profile"),
      ).toBeVisible();
    });

    test("should show error when confirmation text is incorrect", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Delete My Account" }).click();

      await expect(page.locator(".MuiDialog-root")).toBeVisible();

      const dialogInput = page.locator('.MuiDialog-root input[type="text"]');
      const deleteButton = page
        .locator(".MuiDialog-root")
        .getByRole("button", { name: "Delete Account" });

      await dialogInput.fill("WRONG");
      await expect(deleteButton).toBeDisabled();

      await dialogInput.clear();
      await dialogInput.fill("DELETE");
      await expect(deleteButton).toBeEnabled();
    });

    test("should cancel deletion when clicking cancel", async ({ page }) => {
      await page.getByRole("button", { name: "Delete My Account" }).click();
      await expect(page.locator(".MuiDialog-root")).toBeVisible();

      await page
        .locator(".MuiDialog-root")
        .getByRole("button", { name: "Cancel" })
        .click();
      await expect(page.locator(".MuiDialog-root")).not.toBeVisible();
      await expect(page).toHaveURL("/account-settings");
    });
  });

  test.describe("Navigation", () => {
    test("should navigate between tabs", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Profile Information" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Password" }).click();
      await expect(
        page.getByRole("heading", { name: "Change Password" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Delete Account" }).click();
      await expect(
        page.getByText("Deleting your account is permanent"),
      ).toBeVisible();

      await page.getByRole("button", { name: "Profile" }).click();
      await expect(
        page.getByRole("heading", { name: "Profile Information" }),
      ).toBeVisible();
    });
  });
});
