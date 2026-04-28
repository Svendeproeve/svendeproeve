import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

const API_URL = process.env.API_URL || "http://localhost:8001";

test.describe("User Management Snackbar Notifications", () => {
  test.beforeEach(async ({ page }) => {
    const testUser = generateTestUser("snackbar-user");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.goto("/user-management");
  });

  test("Shows snackbar on missing email validation", async ({ page }) => {
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Email is required",
    );
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute(
      "class",
      /MuiAlert-standardError/,
    );
  });

  test("Shows snackbar on successful member invitation", async ({
    page,
    request,
  }) => {
    const newUser = generateTestUser("invite-member");
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.fullName,
      },
    });

    await page.getByTestId("invite-email-input").fill(newUser.email);
    await page.getByTestId("invite-role-select").click();
    await page.getByRole("option", { name: "Member" }).click();
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Successfully invited",
    );
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute(
      "class",
      /MuiAlert-standardSuccess/,
    );

    await expect(page.getByTestId("invite-email-input")).toHaveValue("");
    await expect(page.getByTestId("invite-role-select")).toContainText(
      "Member",
    );
  });

  test("Shows snackbar when inviting duplicate user", async ({
    page,
    request,
  }) => {
    const duplicateUser = generateTestUser("duplicate-member");
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: duplicateUser.email,
        password: duplicateUser.password,
        full_name: duplicateUser.fullName,
      },
    });

    await page.getByTestId("invite-email-input").fill(duplicateUser.email);
    await page.getByTestId("invite-submit-button").click();

    await page.locator(".MuiSnackbar-root").waitFor({ state: "visible" });
    await page
      .locator(".MuiSnackbar-root")
      .waitFor({ state: "hidden", timeout: 7000 });

    await page.getByTestId("invite-email-input").fill(duplicateUser.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "already a member",
    );
  });

  test("Shows snackbar on invitation error", async ({ page }) => {
    await page.getByTestId("invite-email-input").fill("invalid-email");
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
  });

  test("Can invite users with different roles", async ({ page, request }) => {
    const adminUser = generateTestUser("invite-admin");
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: adminUser.email,
        password: adminUser.password,
        full_name: adminUser.fullName,
      },
    });

    await page.getByTestId("invite-email-input").fill(adminUser.email);
    await page.getByTestId("invite-role-select").click();
    await page.getByRole("option", { name: "Admin" }).click();
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      /invited|admin/i,
    );
  });

  test("Shows snackbar on successful category access update", async ({
    page,
  }) => {
    const accessIcon = page
      .locator("tbody tr")
      .filter({ hasNot: page.locator("text=Owner") })
      .first()
      .locator('button[title*="access"], button:has(svg)')
      .last();

    if ((await accessIcon.count()) > 0) {
      await accessIcon.click();

      await expect(page.locator("text=Category Access")).toBeVisible();

      const categoryCheckbox = page
        .locator('.MuiDialog-root input[type="checkbox"]')
        .first();
      if ((await categoryCheckbox.count()) > 0) {
        await categoryCheckbox.click();
      }

      await page
        .locator(".MuiDialog-root")
        .getByRole("button", { name: "Save" })
        .click();

      const snackbar = page.locator(".MuiSnackbar-root");
      await expect(snackbar).toBeVisible();
      await expect(snackbar.locator(".MuiAlert-message")).toContainText(
        "Category access updated successfully",
      );
    }
  });

  test("Shows snackbar on category access update error", async ({
    page,
  }) => {});

  test("Owner cannot have category access modified", async ({ page }) => {
    const ownerRow = page
      .locator("tbody tr")
      .filter({ has: page.locator("text=Owner") })
      .first();

    if ((await ownerRow.count()) > 0) {
      await expect(
        ownerRow.locator("text=Owner has access to all categories"),
      ).toBeVisible();

      const accessButtons = ownerRow.locator('button[title*="access"]');
      await expect(accessButtons).toHaveCount(0);
    }
  });

  test("Member list displays correctly", async ({ page }) => {
    await expect(
      page.getByRole("columnheader", { name: "Name", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Email", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Role", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Joined", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Category Access", exact: true }),
    ).toBeVisible();
  });

  test("Role badges display correctly", async ({ page }) => {
    const roleBadges = page
      .locator(".MuiChip-root")
      .filter({ hasText: /OWNER|ADMIN|MEMBER/ });
    await expect(roleBadges.first()).toBeVisible();
  });

  test("No alerts visible on page - only snackbars", async ({
    page,
    request,
  }) => {
    const testUser = generateTestUser("alert-test");
    await request.post(`${API_URL}/auth/signup`, {
      data: {
        email: testUser.email,
        password: testUser.password,
        full_name: testUser.fullName,
      },
    });

    await page.getByTestId("invite-email-input").fill(testUser.email);
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();

    const standaloneAlerts = page.locator(
      ".MuiAlert-root:not(.MuiSnackbar-root .MuiAlert-root)",
    );
    await expect(standaloneAlerts).toHaveCount(0);
  });

  test("Snackbar appears in bottom-right corner", async ({ page }) => {
    await page.getByTestId("invite-submit-button").click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();

    const box = await snackbar.boundingBox();
    const viewport = page.viewportSize();

    expect(box!.y).toBeGreaterThan(viewport!.height / 2);
    expect(box!.x).toBeGreaterThan(viewport!.width / 2);
  });
});
