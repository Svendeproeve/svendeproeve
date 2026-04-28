import { test, expect, Page } from "@playwright/test";
import { generateTestUser, completeOnboarding } from "../helpers/auth";

test.describe("Category Management — table sorting", () => {
  test.beforeEach(async ({ page }) => {
    const user = generateTestUser("sort-cat");
    await completeOnboarding(page, user);
    await page.goto("/category-management");
  });

  async function createCategory(
    page: Page,
    name: string,
    description: string,
  ) {
    await page.getByTestId("category-name-input").fill(name);
    await page.getByTestId("category-description-input").fill(description);
    await page.getByTestId("category-submit").click();
    await page
      .locator("[data-testid^='category-row-']")
      .filter({ hasText: name })
      .waitFor({ timeout: 10000 });
  }

  async function getNameColumnValues(page: Page): Promise<string[]> {
    const rows = page.locator("[data-testid^='category-row-']");
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).locator("td").first().textContent();
      names.push(text?.trim() ?? "");
    }
    return names;
  }

  test("default sort is ascending by name", async ({ page }) => {
    await createCategory(page, "Gamma Sort Cat", "Third category");
    await createCategory(page, "Alpha Sort Cat", "First category");
    await createCategory(page, "Beta Sort Cat", "Second category");

    const names = await getNameColumnValues(page);
    const alphaIdx = names.findIndex((n) => n.includes("Alpha Sort Cat"));
    const betaIdx = names.findIndex((n) => n.includes("Beta Sort Cat"));
    const gammaIdx = names.findIndex((n) => n.includes("Gamma Sort Cat"));

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });

  test("clicking Name header toggles to descending sort", async ({ page }) => {
    await createCategory(page, "Gamma Sort Cat", "Third category");
    await createCategory(page, "Alpha Sort Cat", "First category");
    await createCategory(page, "Beta Sort Cat", "Second category");

    await page.locator("thead").getByRole("button", { name: "Name", exact: true }).click();

    const names = await getNameColumnValues(page);
    const alphaIdx = names.findIndex((n) => n.includes("Alpha Sort Cat"));
    const betaIdx = names.findIndex((n) => n.includes("Beta Sort Cat"));
    const gammaIdx = names.findIndex((n) => n.includes("Gamma Sort Cat"));

    expect(gammaIdx).toBeGreaterThanOrEqual(0);
    expect(gammaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(alphaIdx);
  });

  test("clicking Name header twice restores ascending sort", async ({
    page,
  }) => {
    await createCategory(page, "Gamma Sort Cat", "Third category");
    await createCategory(page, "Alpha Sort Cat", "First category");
    await createCategory(page, "Beta Sort Cat", "Second category");

    await page.locator("thead").getByRole("button", { name: "Name", exact: true }).click();
    await page.locator("thead").getByRole("button", { name: "Name", exact: true }).click();

    const names = await getNameColumnValues(page);
    const alphaIdx = names.findIndex((n) => n.includes("Alpha Sort Cat"));
    const betaIdx = names.findIndex((n) => n.includes("Beta Sort Cat"));
    const gammaIdx = names.findIndex((n) => n.includes("Gamma Sort Cat"));

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });

  test("clicking Description header sorts by description ascending", async ({
    page,
  }) => {
    await createCategory(page, "Cat X", "Zebra Sort Desc");
    await createCategory(page, "Cat Y", "Apple Sort Desc");
    await createCategory(page, "Cat Z", "Mango Sort Desc");

    await page.locator("thead").getByRole("button", { name: "Description", exact: true }).click();

    const rows = page.locator("[data-testid^='category-row-']");
    const count = await rows.count();
    const descriptions: string[] = [];
    for (let i = 0; i < count; i++) {
      // Description is column index 2 (Name=0, Color=1, Description=2)
      const text = await rows.nth(i).locator("td").nth(2).textContent();
      descriptions.push(text?.trim() ?? "");
    }

    const appleIdx = descriptions.findIndex((d) =>
      d.includes("Apple Sort Desc"),
    );
    const mangoIdx = descriptions.findIndex((d) =>
      d.includes("Mango Sort Desc"),
    );
    const zebraIdx = descriptions.findIndex((d) =>
      d.includes("Zebra Sort Desc"),
    );

    expect(appleIdx).toBeGreaterThanOrEqual(0);
    expect(appleIdx).toBeLessThan(mangoIdx);
    expect(mangoIdx).toBeLessThan(zebraIdx);
  });
});
