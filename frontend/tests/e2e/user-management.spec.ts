import { test, expect } from "@playwright/test";
import {
  completeOnboarding,
  generateTestUser,
  getAuthToken,
  getOrgId,
  logout,
} from "../helpers/auth";
import { getOrgInviteToken } from "../helpers/db";

const API_URL = process.env.API_URL || "http://localhost:8001";

// Sets up an org owner on the user-management page and returns their token + org ID.
async function setupOwnerOnUserManagement(page: any) {
  const owner = generateTestUser("um-owner");
  await completeOnboarding(page, owner);
  await page.goto("/user-management");
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible({ timeout: 10000 });
  const token = await getAuthToken(page);
  const orgId = await getOrgId(page);
  return { owner, token: token!, orgId: orgId! };
}

// Creates a second user, invites them via API, and accepts via API so they are a real member.
async function addMemberViaInviteFlow(
  request: any,
  token: string,
  orgId: string,
  role: "admin" | "member" = "member"
) {
  const member = generateTestUser("um-member");
  await request.post(`${API_URL}/auth/signup`, {
    data: { email: member.email, password: member.password, full_name: member.fullName },
  });
  const signinRes = await request.post(`${API_URL}/auth/signin`, {
    data: { email: member.email, password: member.password },
  });
  const { access_token: memberToken } = await signinRes.json();

  await request.post(`${API_URL}/organizations/${orgId}/members/invite`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email: member.email, role },
  });

  const inviteToken = await getOrgInviteToken(member.email);
  await request.post(`${API_URL}/invitations/${inviteToken}/accept`, {
    headers: { Authorization: `Bearer ${memberToken}` },
  });

  return { member, memberToken };
}

test.describe("User Management — invite", () => {
  test("sends invitation and shows success snackbar", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    const invitee = generateTestUser("invite-new");

    await page.getByTestId("invite-email-input").fill(invitee.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("Invitation sent to");
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute("class", /MuiAlert-standardSuccess/);
    await expect(page.getByTestId("invite-email-input")).toHaveValue("");
  });

  test("cannot invite a user who is already a member", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    const { member } = await addMemberViaInviteFlow(request, token, orgId);

    await page.reload();
    await expect(page.getByText(member.email, { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByTestId("invite-email-input").fill(member.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(/already a member/i);
  });

  test("can re-invite a pending (not yet accepted) email", async ({ page }) => {
    await setupOwnerOnUserManagement(page);
    const invitee = generateTestUser("reinvite");

    await page.getByTestId("invite-email-input").fill(invitee.email);
    await page.getByTestId("invite-submit-button").click();
    await page.locator(".MuiSnackbar-root").waitFor({ state: "hidden", timeout: 7000 });

    await page.getByTestId("invite-email-input").fill(invitee.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("Invitation sent to");
  });

  test("validates empty email", async ({ page }) => {
    await setupOwnerOnUserManagement(page);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("Email is required");
  });
});

test.describe("User Management — role change", () => {
  test("owner can promote a member to admin", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    const { member } = await addMemberViaInviteFlow(request, token, orgId, "member");

    await page.reload();
    const memberRow = page.locator("tbody tr").filter({ hasText: member.email });
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const roleSelect = memberRow.locator(".MuiSelect-select");
    await roleSelect.click();
    await page.getByRole("option", { name: "Admin" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("Role updated to admin");
  });

  test("owner can demote an admin to member", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    await addMemberViaInviteFlow(request, token, orgId, "admin");
    const { member: admin } = await addMemberViaInviteFlow(request, token, orgId, "admin");

    await page.reload();
    const adminRow = page.locator("tbody tr").filter({ hasText: admin.email });
    await expect(adminRow).toBeVisible({ timeout: 10000 });

    const roleSelect = adminRow.locator(".MuiSelect-select");
    await roleSelect.click();
    await page.getByRole("option", { name: "Member" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("Role updated to member");
  });

  test("owner role chip is not editable", async ({ page }) => {
    await setupOwnerOnUserManagement(page);
    const ownerRow = page.locator("tbody tr").filter({ has: page.locator(".MuiChip-root", { hasText: "OWNER" }) });
    await expect(ownerRow.locator(".MuiSelect-select")).toHaveCount(0);
    await expect(ownerRow.locator(".MuiChip-root", { hasText: "OWNER" })).toBeVisible();
  });
});

test.describe("User Management — remove member", () => {
  test("owner can remove a member", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    const { member } = await addMemberViaInviteFlow(request, token, orgId, "member");

    await page.reload();
    const memberRow = page.locator("tbody tr").filter({ hasText: member.email });
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    await memberRow.locator("button[title='Remove member']").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("has been removed");
    await expect(page.getByText(member.email, { exact: true })).toHaveCount(0);
  });

  test("owner can remove an admin", async ({ page, request }) => {
    const { token, orgId } = await setupOwnerOnUserManagement(page);
    const { member: admin } = await addMemberViaInviteFlow(request, token, orgId, "admin");

    await page.reload();
    const adminRow = page.locator("tbody tr").filter({ hasText: admin.email });
    await expect(adminRow).toBeVisible({ timeout: 10000 });

    await adminRow.locator("button[title='Remove member']").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText("has been removed");
  });

  test("owner row has no remove button", async ({ page }) => {
    await setupOwnerOnUserManagement(page);
    const ownerRow = page.locator("tbody tr").filter({ has: page.locator(".MuiChip-root", { hasText: "OWNER" }) });
    await expect(ownerRow.locator("button[title='Remove member']")).toHaveCount(0);
  });

  test("admin cannot remove another admin — no remove button shown", async ({ page, request }) => {
    const owner = generateTestUser("remove-owner");
    await completeOnboarding(page, owner);
    const ownerToken = await getAuthToken(page);
    const orgId = await getOrgId(page);

    const { member: admin, memberToken: adminToken } = await addMemberViaInviteFlow(
      request, ownerToken!, orgId!, "admin"
    );
    const { member: otherAdmin } = await addMemberViaInviteFlow(request, ownerToken!, orgId!, "admin");

    // Log in as admin
    await logout(page);
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
      },
      { token: adminToken, user: { email: admin.email } }
    );

    await page.goto("/user-management");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible({ timeout: 10000 });

    const otherAdminRow = page.locator("tbody tr").filter({ hasText: otherAdmin.email });
    await expect(otherAdminRow).toBeVisible({ timeout: 10000 });
    await expect(otherAdminRow.locator("button[title='Remove member']")).toHaveCount(0);
  });
});
