import { test, expect, Page } from "@playwright/test";
import { generateTestUser, signupUser } from "../helpers/auth";

test.describe("Mail Account Management - table sorting", () => {
  test.beforeEach(async ({ page }) => {
    const user = generateTestUser("sort-mail");
    await signupUser(page, user);
    await page.getByTestId("show-create-org-button").click();
    await page.getByTestId("onboarding-org-name-input").fill(`Sort Org ${Date.now()}`);
    await page.getByTestId("onboarding-create-org-button").click();
    await expect(page).toHaveURL("/dashboard", { timeout: 15000 });
    await page.goto("/mail-account-management");
  });

  async function createMailAccount(
    page: Page,
    name: string,
    imapHost: string,
  ) {
    await page.getByLabel("Account Name").fill(name);
    await page.getByLabel("IMAP Host").fill(imapHost);
    await page.getByLabel("Port").first().fill("993");
    await page.getByLabel("Username").first().fill(`user@${imapHost}`);
    await page.getByLabel("Password").first().fill("password123");
    await page.getByLabel("SMTP Host").fill(`smtp.${imapHost.replace("imap.", "")}`);
    await page.getByLabel("Port").last().fill("465");
    await page.getByLabel("SMTP Username").fill(`user@${imapHost}`);
    await page.getByLabel("SMTP Password").fill("password123");
    await page.getByRole("button", { name: "Add Account" }).click();
    await page
      .locator("tbody tr")
      .filter({ hasText: name })
      .waitFor({ timeout: 10000 });
  }

  async function getColumnValues(page: Page, colIndex: number): Promise<string[]> {
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).locator("td").nth(colIndex).textContent();
      values.push(text?.trim() ?? "");
    }
    return values;
  }

  test("default sort is ascending by name", async ({ page }) => {
    await createMailAccount(page, "Gamma Mail Account", "imap.gamma.com");
    await createMailAccount(page, "Alpha Mail Account", "imap.alpha.com");
    await createMailAccount(page, "Beta Mail Account", "imap.beta.com");

    const names = await getColumnValues(page, 0);
    const alphaIdx = names.indexOf("Alpha Mail Account");
    const betaIdx = names.indexOf("Beta Mail Account");
    const gammaIdx = names.indexOf("Gamma Mail Account");

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });

  test("clicking Name header toggles to descending sort", async ({ page }) => {
    await createMailAccount(page, "Gamma Mail Account", "imap.gamma.com");
    await createMailAccount(page, "Alpha Mail Account", "imap.alpha.com");
    await createMailAccount(page, "Beta Mail Account", "imap.beta.com");

    await page.locator("thead").getByRole("button", { name: "Name", exact: true }).click();

    const names = await getColumnValues(page, 0);
    const alphaIdx = names.indexOf("Alpha Mail Account");
    const betaIdx = names.indexOf("Beta Mail Account");
    const gammaIdx = names.indexOf("Gamma Mail Account");

    expect(gammaIdx).toBeGreaterThanOrEqual(0);
    expect(gammaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(alphaIdx);
  });

  test("clicking IMAP Host header sorts by IMAP host ascending", async ({
    page,
  }) => {
    await createMailAccount(page, "Account Zebra", "imap.zebra.com");
    await createMailAccount(page, "Account Apple", "imap.apple.com");
    await createMailAccount(page, "Account Mango", "imap.mango.com");

    await page.locator("thead").getByRole("button", { name: "IMAP Host", exact: true }).click();

    const hosts = await getColumnValues(page, 1);
    const appleIdx = hosts.indexOf("imap.apple.com");
    const mangoIdx = hosts.indexOf("imap.mango.com");
    const zebraIdx = hosts.indexOf("imap.zebra.com");

    expect(appleIdx).toBeGreaterThanOrEqual(0);
    expect(appleIdx).toBeLessThan(mangoIdx);
    expect(mangoIdx).toBeLessThan(zebraIdx);
  });
});
