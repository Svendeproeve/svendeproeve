/**
 * End-to-end integration test covering the full user journey:
 * sign up → onboarding → dashboard → logout → log back in.
 *
 * Individual flows (registration validation, login errors, route guards, onboarding
 * edge cases) are each covered in their own dedicated spec files.
 */
import { test, expect } from "@playwright/test";
import { generateTestUser, logout } from "../helpers/auth";

test("complete user journey: sign up, onboard, log out, log in", async ({
  page,
}) => {
  const user = generateTestUser("journey");

  // — Sign up —
  await page.goto("/register");
  await page.getByTestId("register-fullname-input").fill(user.fullName);
  await page.getByTestId("register-email-input").fill(user.email);
  await page.getByTestId("register-password-input").fill(user.password);
  await page.getByTestId("register-confirm-password-input").fill(user.password);
  await page.getByTestId("register-submit-button").click();

  await expect(page).toHaveURL("/onboarding", { timeout: 15000 });

  // — Onboarding: create org and select it —
  await page.getByTestId("show-create-org-button").click();
  await page.getByTestId("onboarding-org-name-input").fill(user.orgName!);
  await page.getByTestId("onboarding-create-org-button").click();

  await expect(page.getByText("Your Organizations")).toBeVisible({ timeout: 10000 });
  await page.getByText(user.orgName!).click();

  await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
  await expect(page.getByTestId("dashboard-greeting")).toBeVisible();

  // — Log out —
  await logout(page);
  await page.goto("/login");

  await expect(page).toHaveURL("/login");

  // — Log back in —
  await page.getByTestId("login-email-input").fill(user.email);
  await page.getByTestId("login-password-input").fill(user.password);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
  await expect(page.getByTestId("dashboard-greeting")).toBeVisible();
});
