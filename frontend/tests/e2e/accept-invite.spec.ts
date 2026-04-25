import { test, expect } from "@playwright/test";
import { completeOnboarding, generateTestUser, getAuthToken, getOrgId, logout } from "../helpers/auth";
import { getOrgInviteToken } from "../helpers/db";

const API_URL = process.env.API_URL || "http://localhost:8001";

test.describe("Accept Invite — invalid token", () => {
  test("shows error for missing token", async ({ page }) => {
    await page.goto("/accept-invite");
    await expect(page.getByText(/invalid or missing/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows error for unknown token", async ({ page }) => {
    await page.goto("/accept-invite?token=this-token-does-not-exist");
    await expect(page.getByText(/not found|expired/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Accept Invite — new user registration", () => {
  test("shows org name and role from invite", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner");
    await completeOnboarding(page, owner);
    const token = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const invitee = generateTestUser("ai-new-user");
    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: invitee.email, role: "member" },
    });

    const inviteToken = await getOrgInviteToken(invitee.email);
    await logout(page);

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("invite-preview")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("invite-org-name")).toContainText(owner.orgName!);
    await expect(page.getByTestId("invite-role-chip")).toContainText("MEMBER");
  });

  test("new user can register and accept → lands on dashboard", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-reg");
    await completeOnboarding(page, owner);
    const token = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const invitee = generateTestUser("ai-register");
    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: invitee.email, role: "member" },
    });

    const inviteToken = await getOrgInviteToken(invitee.email);
    await logout(page);

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-register-submit-button")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("accept-invite-fullname-input").fill(invitee.fullName);
    await page.getByTestId("accept-invite-register-password-input").fill(invitee.password);
    await page.getByTestId("accept-invite-register-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(/joined|welcome/i);
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("new user decline removes invitation", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-dec");
    await completeOnboarding(page, owner);
    const token = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const invitee = generateTestUser("ai-decline");
    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: invitee.email, role: "member" },
    });

    const inviteToken = await getOrgInviteToken(invitee.email);
    await logout(page);

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-decline-button")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("accept-invite-decline-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(/declined/i);
    await expect(page).toHaveURL("/login", { timeout: 5000 });

    // Token is now gone — revisiting shows not found
    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByText(/not found|expired/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Accept Invite — existing user", () => {
  test("shows login form for existing user", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-ex");
    await completeOnboarding(page, owner);
    const token = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const existingUser = generateTestUser("ai-existing");
    await request.post(`${API_URL}/auth/signup`, {
      data: { email: existingUser.email, password: existingUser.password, full_name: existingUser.fullName },
    });

    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: existingUser.email, role: "admin" },
    });

    const inviteToken = await getOrgInviteToken(existingUser.email);
    await logout(page);

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-email-input")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("invite-role-chip")).toContainText("ADMIN", { timeout: 10000 });
  });

  test("existing user can log in and accept → lands on dashboard", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-login");
    await completeOnboarding(page, owner);
    const token = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const existingUser = generateTestUser("ai-login-accept");
    await request.post(`${API_URL}/auth/signup`, {
      data: { email: existingUser.email, password: existingUser.password, full_name: existingUser.fullName },
    });

    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: existingUser.email, role: "member" },
    });

    const inviteToken = await getOrgInviteToken(existingUser.email);
    await logout(page);

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-email-input")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("accept-invite-email-input").fill(existingUser.email);
    await page.getByTestId("accept-invite-password-input").fill(existingUser.password);
    await page.getByTestId("accept-invite-login-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(/joined/i);
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("logged-in user with matching email sees accept/decline buttons", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-loggedin");
    await completeOnboarding(page, owner);
    const ownerToken = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const existingUser = generateTestUser("ai-loggedin-accept");
    const signupRes = await request.post(`${API_URL}/auth/signup`, {
      data: { email: existingUser.email, password: existingUser.password, full_name: existingUser.fullName },
    });
    const { access_token: userToken, user: userObj } = await signupRes.json();

    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { email: existingUser.email, role: "member" },
    });

    const inviteToken = await getOrgInviteToken(existingUser.email);

    // Log in as the invited user
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
      },
      { token: userToken, user: userObj }
    );

    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-accept-button")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("accept-invite-decline-button")).toBeVisible();
  });

  test("logged-in user with wrong email sees warning", async ({ page, request }) => {
    const owner = generateTestUser("ai-owner-wrong");
    await completeOnboarding(page, owner);
    const ownerToken = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const invitee = generateTestUser("ai-wrong-invitee");
    await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { email: invitee.email, role: "member" },
    });
    const inviteToken = await getOrgInviteToken(invitee.email);

    // Still logged in as owner (different email)
    await page.goto(`/accept-invite?token=${inviteToken}`);
    await expect(page.getByTestId("accept-invite-wrong-account")).toBeVisible({ timeout: 10000 });
  });
});
