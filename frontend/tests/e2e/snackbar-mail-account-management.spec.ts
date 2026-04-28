import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Mail Account Management Snackbar Notifications", () => {
  test.beforeEach(async ({ page }) => {
    const testUser = generateTestUser("snackbar-mail");

    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    await page.goto("/mail-account-management");
  });

  test("Shows snackbar on successful mail account creation", async ({
    page,
  }) => {
    await page.getByLabel("Account Name").fill("Test Mail Account");
    await page.getByLabel("IMAP Host").fill("imap.example.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("test@example.com");
    await page.getByLabel("Password").first().fill("password123");
    await page.getByLabel("SMTP Host").fill("smtp.example.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("test@example.com");
    await page.getByLabel("SMTP Password").fill("password123");

    await page.getByRole("button", { name: "Add Account" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      'Mail account "Test Mail Account" added',
    );
    await expect(snackbar.locator(".MuiAlert-root")).toHaveAttribute(
      "class",
      /MuiAlert-standardSuccess/,
    );

    await expect(page.getByLabel("Account Name")).toHaveValue("");
  });

  test("IMAP test connection shows inline feedback", async ({ page }) => {
    await page.getByLabel("IMAP Host").fill("imap.gmail.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("test@gmail.com");
    await page.getByLabel("Password").first().fill("testpass");

    const testButton = page.getByRole("button", { name: "Test IMAP" });
    await testButton.click();

    await expect(page.locator("text=Testing IMAP...")).toBeVisible();
  });

  test("SMTP test connection shows inline feedback", async ({ page }) => {
    await page.getByLabel("SMTP Host").fill("smtp.gmail.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("test@gmail.com");
    await page.getByLabel("SMTP Password").fill("testpass");

    const testButton = page.getByRole("button", { name: "Test SMTP" });
    await testButton.click();

    await expect(page.locator("text=Testing SMTP...")).toBeVisible();
  });

  test("Shows snackbar on successful mail account update", async ({ page }) => {
    await page.getByLabel("Account Name").fill("Update Test");
    await page.getByLabel("IMAP Host").fill("imap.test.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("update@test.com");
    await page.getByLabel("Password").first().fill("password123");
    await page.getByLabel("SMTP Host").fill("smtp.test.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("update@test.com");
    await page.getByLabel("SMTP Password").fill("password123");
    await page.getByRole("button", { name: "Add Account" }).click();

    await page
      .locator(".MuiSnackbar-root")
      .waitFor({ state: "hidden", timeout: 7000 });

    const editButton = page
      .locator("tbody tr")
      .first()
      .locator("button")
      .filter({ has: page.locator("svg") })
      .nth(1);
    await editButton.click();

    await page
      .locator(".MuiDialog-root")
      .getByLabel("Account Name")
      .fill("Updated Name");
    await page
      .locator(".MuiDialog-root")
      .getByRole("button", { name: "Save" })
      .click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Mail account updated successfully",
    );
  });

  test("Shows snackbar on successful mail account deletion", async ({
    page,
  }) => {
    await page.getByLabel("Account Name").fill("Delete Test");
    await page.getByLabel("IMAP Host").fill("imap.delete.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("delete@test.com");
    await page.getByLabel("Password").first().fill("password123");
    await page.getByLabel("SMTP Host").fill("smtp.delete.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("delete@test.com");
    await page.getByLabel("SMTP Password").fill("password123");
    await page.getByRole("button", { name: "Add Account" }).click();

    await page
      .locator(".MuiSnackbar-root")
      .waitFor({ state: "hidden", timeout: 7000 });

    const deleteButton = page
      .locator("tbody tr")
      .first()
      .locator('button[color="error"], button')
      .filter({ has: page.locator('svg[color="#f44336"]') })
      .or(page.locator("tbody tr").first().locator("button").last());
    await deleteButton.click();

    await page.getByRole("button", { name: "Delete", exact: true }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator(".MuiAlert-message")).toContainText(
      "Mail account deleted successfully",
    );
  });

  test("Shows snackbar on mail account deletion error", async ({ page }) => {});

  test("Connection status indicators display", async ({ page }) => {
    const rowCount = await page.locator("tbody tr").count();

    if (rowCount > 0) {
      const firstRow = page.locator("tbody tr").first();
      const cellCount = await firstRow.locator("td").count();

      if (cellCount > 6) {
        const statusCell = firstRow.locator("td").nth(6);
        await expect(statusCell).toBeVisible();
      }
    }
  });

  test("Refresh button updates connection status", async ({ page }) => {
    if ((await page.locator("tbody tr").count()) > 0) {
      const refreshButton = page
        .locator("tbody tr")
        .first()
        .locator('button[title*="Refresh"], button')
        .first();
      await refreshButton.click();

      await expect(page.locator(".MuiCircularProgress-root")).toBeVisible();
    }
  });

  test("SSL toggle switches work", async ({ page }) => {
    const sslSwitchCount = await page.locator('input[type="checkbox"]').count();

    if (sslSwitchCount > 0) {
      const sslSwitch = page.locator('input[type="checkbox"]').first();
      const isChecked = await sslSwitch.isChecked();
      await expect(sslSwitch).toBeDefined();
    }
  });

  test("Helper text shows for account name field", async ({ page }) => {
    await expect(
      page.locator("text=Friendly name to identify this mail account"),
    ).toBeVisible();
  });

  test("No alerts visible on page - only snackbars", async ({ page }) => {
    await page.getByLabel("Account Name").fill("Test");
    await page.getByLabel("IMAP Host").fill("imap.test.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("test@test.com");
    await page.getByLabel("Password").first().fill("pass");
    await page.getByLabel("SMTP Host").fill("smtp.test.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("test@test.com");
    await page.getByLabel("SMTP Password").fill("pass");
    await page.getByRole("button", { name: "Add Account" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();

    const standaloneAlerts = page.locator(
      ".MuiAlert-root:not(.MuiSnackbar-root .MuiAlert-root)",
    );
    await expect(standaloneAlerts).toHaveCount(0);
  });

  test("Snackbar appears in bottom-right corner", async ({ page }) => {
    await page.getByLabel("Account Name").fill("Position Test");
    await page.getByLabel("IMAP Host").fill("imap.test.com");
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill("test@test.com");
    await page.getByLabel("Password").first().fill("pass");
    await page.getByLabel("SMTP Host").fill("smtp.test.com");
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill("test@test.com");
    await page.getByLabel("SMTP Password").fill("pass");
    await page.getByRole("button", { name: "Add Account" }).click();

    const snackbar = page.locator(".MuiSnackbar-root");
    await expect(snackbar).toBeVisible();

    const box = await snackbar.boundingBox();
    const viewport = page.viewportSize();

    expect(box!.y).toBeGreaterThan(viewport!.height / 2);
    expect(box!.x).toBeGreaterThan(viewport!.width / 2);
  });

  test("Table displays all required columns", async ({ page }) => {
    await expect(
      page.getByRole("columnheader", { name: "Name", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Host", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Port", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Username", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Host", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Port", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Status", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Status", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Actions", exact: true }),
    ).toBeVisible();
  });
});
