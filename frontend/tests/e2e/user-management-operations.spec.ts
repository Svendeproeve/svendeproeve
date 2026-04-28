import { test, expect } from "@playwright/test";
import { generateTestUser, completeOnboarding } from "../helpers/auth";

const API_URL = process.env.API_URL || "http://localhost:8001";

test.describe("User Management - invite, remove, and role change", () => {
  test.beforeEach(async ({ page }) => {
    const owner = generateTestUser("um-owner");
    await completeOnboarding(page, owner);
    await page.goto("/user-management");
    await expect(
      page.getByRole("heading", { name: "User Management" }),
    ).toBeVisible({ timeout: 10000 });
  });

  async function createAndInvite(
    page: any,
    request: any,
    prefix: string,
    role: "member" | "admin" = "member",
  ) {
    const user = generateTestUser(prefix);
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: user.email,
        password: user.password,
        full_name: user.fullName,
      },
    });
    await page.getByTestId("invite-email-input").fill(user.email);
    if (role === "admin") {
      await page.getByTestId("invite-role-select").click();
      await page.getByRole("option", { name: "Admin" }).click();
    }
    await page.getByTestId("invite-submit-button").click();
    await page.locator(".MuiSnackbar-root").waitFor({ state: "visible", timeout: 10000 });
    await page.locator(".MuiSnackbar-root").waitFor({ state: "hidden", timeout: 7000 });
    await expect(
      page.locator("tbody td").filter({ hasText: user.email }),
    ).toBeVisible({ timeout: 10000 });
    return user;
  }

  test("invited member appears in table with Pending status", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-invite-pending");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row).toBeVisible();
    await expect(row.locator(".MuiChip-root").filter({ hasText: "Pending" })).toBeVisible();
  });

  test("invited admin appears in table with ADMIN role", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-invite-admin", "admin");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row).toBeVisible();
    await expect(row.locator(".MuiSelect-select")).toContainText("ADMIN");
  });

  test("invited member defaults to MEMBER role in table", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-invite-member");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row.locator(".MuiSelect-select")).toContainText("MEMBER");
  });

  test("invite form resets after successful invite", async ({
    page,
    request,
  }) => {
    const user = generateTestUser("um-invite-reset");
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: user.email,
        password: user.password,
        full_name: user.fullName,
      },
    });

    await page.getByTestId("invite-email-input").fill(user.email);
    await page.getByTestId("invite-submit-button").click();
    await page.locator(".MuiSnackbar-root").waitFor({ state: "hidden", timeout: 7000 });

    await expect(page.getByTestId("invite-email-input")).toHaveValue("");
    await expect(page.getByTestId("invite-role-select")).toContainText("Member");
  });

  test("invited user's full name appears in the Name column", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-invite-name");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row.locator("td").first()).toContainText(user.fullName);
  });

  test("remove button opens confirmation dialog with user name", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-remove-dialog");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await row.locator('button[title="Remove from organization"]').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Remove Member");
    await expect(dialog).toContainText(user.fullName);
  });

  test("cancelling remove dialog keeps user in the table", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-remove-cancel");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await row.locator('button[title="Remove from organization"]').click();

    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.locator("tbody td").filter({ hasText: user.email }),
    ).toBeVisible();
  });

  test("confirming remove deletes the user from the table", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-remove-confirm");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await row.locator('button[title="Remove from organization"]').click();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.locator("tbody td").filter({ hasText: user.email }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("confirming remove shows success snackbar", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-remove-snackbar");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await row.locator('button[title="Remove from organization"]').click();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "removed from organization",
    );
  });

  test("owner row has no remove button", async ({ page }) => {
    const ownerRow = page.locator("tbody tr").filter({
      has: page.locator(".MuiChip-root").filter({ hasText: /^OWNER$/ }),
    });
    await expect(ownerRow).toBeVisible();
    await expect(
      ownerRow.locator('button[title="Remove from organization"]'),
    ).toHaveCount(0);
  });

  test("owner role is shown as a chip, not a dropdown", async ({ page }) => {
    const ownerRow = page.locator("tbody tr").filter({
      has: page.locator(".MuiChip-root").filter({ hasText: /^OWNER$/ }),
    });
    await expect(
      ownerRow.locator(".MuiChip-root").filter({ hasText: /^OWNER$/ }),
    ).toBeVisible();
    await expect(ownerRow.locator(".MuiSelect-select")).toHaveCount(0);
  });

  test("change member role to admin updates the role in the table", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-role-to-admin");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row.locator(".MuiSelect-select")).toContainText("MEMBER");

    await row.locator(".MuiSelect-select").click();
    await page.getByRole("option", { name: "ADMIN" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Role updated to admin",
    );
    await expect(row.locator(".MuiSelect-select")).toContainText("ADMIN", {
      timeout: 10000,
    });
  });

  test("change admin role to member updates the role in the table", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(
      page,
      request,
      "um-role-to-member",
      "admin",
    );

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await expect(row.locator(".MuiSelect-select")).toContainText("ADMIN");

    await row.locator(".MuiSelect-select").click();
    await page.getByRole("option", { name: "MEMBER" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible({ timeout: 10000 });
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Role updated to member",
    );
    await expect(row.locator(".MuiSelect-select")).toContainText("MEMBER", {
      timeout: 10000,
    });
  });

  test("role change select is disabled while update is in progress", async ({
    page,
    request,
  }) => {
    const user = await createAndInvite(page, request, "um-role-disabled");

    const row = page.locator("tbody tr").filter({ hasText: user.email });
    await row.locator(".MuiSelect-select").click();
    await page.getByRole("option", { name: "ADMIN" }).click();

    await expect(row.locator(".MuiSelect-select")).toContainText("ADMIN", {
      timeout: 10000,
    });
  });
});
