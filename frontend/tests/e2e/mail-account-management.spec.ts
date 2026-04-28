import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Mail Account Management", () => {
  test.beforeEach(async ({ page }) => {
    const testUser = generateTestUser("mail-account");

    // Sign up and create organization
    await signupUser(page, testUser);
    await page.getByTestId("show-create-org-button").click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId("onboarding-org-name-input").fill(orgName);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });

    // Navigate to mail account management
    await page.goto("/mail-account-management");
  });

  test("should display mail account management page for admin", async ({
    page,
  }) => {
    await expect(page.getByText("Mail Accounts")).toBeVisible();
    await expect(page.getByText("Add Mail Account")).toBeVisible();
  });

  test("should show helper text for account name field", async ({ page }) => {
    // Check that the Account Name field has helper text
    await expect(
      page.getByText(
        /Friendly name to identify this mail account.*Support Email.*Sales Team/,
      ),
    ).toBeVisible();
  });

  test("should display account name field with label", async ({ page }) => {
    // Check that the Account Name label is present
    await expect(page.getByLabel("Account Name")).toBeVisible();
  });

  test("should have all required IMAP fields", async ({ page }) => {
    await expect(page.getByLabel("Account Name")).toBeVisible();
    await expect(page.getByLabel("IMAP Host")).toBeVisible();
    await expect(page.getByLabel("Port").first()).toBeVisible();
    await expect(page.getByLabel("Username").first()).toBeVisible();
    await expect(page.getByLabel("Password").first()).toBeVisible();
  });

  test("should have all required SMTP fields", async ({ page }) => {
    // Scroll down to make SMTP fields visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByLabel("SMTP Host")).toBeVisible();
    await expect(page.getByLabel("SMTP Username")).toBeVisible();
    await expect(page.getByLabel("SMTP Password")).toBeVisible();
  });

  test("should show SMTP settings divider", async ({ page }) => {
    await expect(page.getByText("SMTP Settings")).toBeVisible();
  });

  test("should have SSL switches for both IMAP and SMTP", async ({ page }) => {
    // There should be two SSL switches (IMAP and SMTP)
    const sslSwitches = page.getByText("SSL");
    await expect(sslSwitches).toHaveCount(2);
  });

  test("should have Test IMAP and Test SMTP buttons", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /test imap/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /test smtp/i }),
    ).toBeVisible();
  });

  test("should have Add Account button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /add account/i }),
    ).toBeVisible();
  });

  test("should show Connected Accounts section", async ({ page }) => {
    await expect(page.getByText("Connected Accounts")).toBeVisible();
  });

  test("should show table headers for mail accounts", async ({ page }) => {
    // Check that the table has all expected headers using role-based selectors
    await expect(
      page.getByRole("columnheader", { name: "Name", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Host" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Port" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Username" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Host" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Port" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "IMAP Status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "SMTP Status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Actions" }),
    ).toBeVisible();
  });

  test("should show no accounts message initially", async ({ page }) => {
    await expect(page.getByText("No mail accounts yet.")).toBeVisible();
  });

  test("should disable test buttons when fields are empty", async ({
    page,
  }) => {
    const testImapButton = page.getByRole("button", { name: /test imap/i });
    const testSmtpButton = page.getByRole("button", { name: /test smtp/i });

    await expect(testImapButton).toBeDisabled();
    await expect(testSmtpButton).toBeDisabled();
  });

  test("should enable test IMAP button when IMAP fields are filled", async ({
    page,
  }) => {
    await page.getByLabel("IMAP Host").fill("imap.example.com");
    await page.getByLabel("Username").first().fill("user@example.com");
    await page.getByLabel("Password").first().fill("password123");

    const testImapButton = page.getByRole("button", { name: /test imap/i });
    await expect(testImapButton).toBeEnabled();
  });

  test("should enable test SMTP button when SMTP fields are filled", async ({
    page,
  }) => {
    await page.getByLabel("SMTP Host").fill("smtp.example.com");
    await page.getByLabel("SMTP Username").fill("user@example.com");
    await page.getByLabel("SMTP Password").fill("password123");

    const testSmtpButton = page.getByRole("button", { name: /test smtp/i });
    await expect(testSmtpButton).toBeEnabled();
  });
});
