import { test, expect } from "@playwright/test";
import {
  completeOnboarding,
  generateTestUser,
  logout,
  signupUser,
} from "../helpers/auth";

test.describe("User Management — invite", () => {
  test("cannot invite a user who is already a member", async ({ page }) => {
    const memberUser = generateTestUser("already-member");
    const ownerUser = generateTestUser("owner-invite");

    await signupUser(page, memberUser);
    await logout(page);

    await completeOnboarding(page, ownerUser);

    await page.goto("/user-management");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("invite-email-input").fill(memberUser.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible({ timeout: 15000 });
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Successfully invited');

    await expect(page.getByText(memberUser.email, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    await page.locator('.MuiSnackbar-root').waitFor({ state: 'hidden', timeout: 7000 });

    await page.getByTestId("invite-email-input").fill(memberUser.email);
    await page.getByTestId("invite-submit-button").click();

    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator('.MuiAlert-message')).toContainText(/already a member/i);
  });
});
