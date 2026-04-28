import { test, expect, Page } from "@playwright/test";
import {
  completeOnboarding,
  generateTestUser,
  logout,
  signupUser,
} from "../helpers/auth";

test.describe("User Management - table sorting", () => {
  async function setupWithTwoMembers(
    page: Page,
    member1: { prefix: string; fullName: string },
    member2: { prefix: string; fullName: string },
    ownerPrefix: string,
  ) {
    const user1 = { ...generateTestUser(member1.prefix), fullName: member1.fullName };
    const user2 = { ...generateTestUser(member2.prefix), fullName: member2.fullName };
    const owner = { ...generateTestUser(ownerPrefix), fullName: "Sort Owner User" };

    await signupUser(page, user1);
    await logout(page);
    await signupUser(page, user2);
    await logout(page);

    await completeOnboarding(page, owner);
    await page.goto("/user-management");
    await expect(
      page.getByRole("heading", { name: "User Management" }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByTestId("invite-email-input").fill(user1.email);
    await page.getByTestId("invite-submit-button").click();
    await page
      .locator(".MuiSnackbar-root")
      .waitFor({ state: "hidden", timeout: 7000 });

    await page.getByTestId("invite-email-input").fill(user2.email);
    await page.getByTestId("invite-submit-button").click();
    // Scope to tbody to avoid matching the snackbar ("Successfully invited [email]")
    await expect(
      page.locator("tbody td").filter({ hasText: user2.email }),
    ).toBeVisible({ timeout: 10000 });
    await page
      .locator(".MuiSnackbar-root")
      .waitFor({ state: "hidden", timeout: 7000 });

    await expect(page.locator("tbody tr")).toHaveCount(3, { timeout: 10000 });

    return { user1, user2, owner };
  }

  async function getNameColumnValues(page: Page): Promise<string[]> {
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).locator("td").first().textContent();
      names.push(text?.trim() ?? "");
    }
    return names;
  }

  test("default sort is ascending by name", async ({ page }) => {
    const { user1, user2 } = await setupWithTwoMembers(
      page,
      { prefix: "alpha-nm", fullName: "Alpha Sort Member" },
      { prefix: "gamma-nm", fullName: "Gamma Sort Member" },
      "owner-nm",
    );

    const names = await getNameColumnValues(page);
    const alphaIdx = names.findIndex((n) => n.includes(user1.fullName));
    const gammaIdx = names.findIndex((n) => n.includes(user2.fullName));

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(gammaIdx).toBeGreaterThanOrEqual(0);
    expect(alphaIdx).toBeLessThan(gammaIdx);
  });

  test("clicking Name header toggles to descending sort", async ({ page }) => {
    const { user1, user2 } = await setupWithTwoMembers(
      page,
      { prefix: "alpha-nd", fullName: "Alpha Sort Member" },
      { prefix: "gamma-nd", fullName: "Gamma Sort Member" },
      "owner-nd",
    );

    await page.locator("thead").getByRole("button", { name: "Name", exact: true }).click();

    const names = await getNameColumnValues(page);
    const alphaIdx = names.findIndex((n) => n.includes(user1.fullName));
    const gammaIdx = names.findIndex((n) => n.includes(user2.fullName));

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(gammaIdx).toBeGreaterThanOrEqual(0);
    expect(gammaIdx).toBeLessThan(alphaIdx);
  });

  test("clicking Email header sorts members by email", async ({ page }) => {
    // Use prefixes that sort predictably: "aaa-..." < "zzz-..."
    const { user1, user2 } = await setupWithTwoMembers(
      page,
      { prefix: "aaa-em", fullName: "Email Sort Alpha" },
      { prefix: "zzz-em", fullName: "Email Sort Gamma" },
      "owner-em",
    );

    await page.locator("thead").getByRole("button", { name: "Email", exact: true }).click();

    const rows = page.locator("tbody tr");
    const count = await rows.count();
    const emails: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).locator("td").nth(1).textContent();
      emails.push(text?.trim() ?? "");
    }

    const alphaEmailIdx = emails.indexOf(user1.email);
    const gammaEmailIdx = emails.indexOf(user2.email);

    expect(alphaEmailIdx).toBeGreaterThanOrEqual(0);
    expect(gammaEmailIdx).toBeGreaterThanOrEqual(0);
    expect(alphaEmailIdx).toBeLessThan(gammaEmailIdx);
  });
});
