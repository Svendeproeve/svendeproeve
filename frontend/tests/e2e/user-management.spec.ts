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
    await expect(page.getByTestId("invite-success")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(memberUser.email, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("invite-email-input").fill(memberUser.email);
    await page.getByTestId("invite-submit-button").click();

    await expect(page.getByTestId("invite-error")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("invite-error")).toContainText(/already a member/i);
  });
});
