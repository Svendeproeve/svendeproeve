import { test, expect } from "@playwright/test";
import { generateTestUser, completeOnboarding } from "../helpers/auth";

test.describe("Category Management", () => {
  test.beforeEach(async ({ page }) => {
    const user = generateTestUser("categories");
    await completeOnboarding(page, user);
    await page.goto("/inbox-management");
  });

  test("should create a new category", async ({ page }) => {
    await page.getByTestId("category-name-input").fill("Support");
    await page.getByTestId("category-description-input").fill(
      "Emails from customers needing help"
    );
    await page.getByTestId("category-submit").click();

    await expect(
      page.locator("[data-testid^='category-row-']").filter({ hasText: "Support" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should not allow creating a category without a description", async ({
    page,
  }) => {
    await page.getByTestId("category-name-input").fill("No Description");

    await expect(page.getByTestId("category-submit")).toBeDisabled();
  });

  test("should edit an existing category", async ({ page }) => {
    // Create the category first
    await page.getByTestId("category-name-input").fill("Before Edit");
    await page.getByTestId("category-description-input").fill(
      "Original description"
    );
    await page.getByTestId("category-submit").click();

    const row = page
      .locator("[data-testid^='category-row-']")
      .filter({ hasText: "Before Edit" });
    await expect(row).toBeVisible({ timeout: 10000 });

    const inboxId = await row
      .getAttribute("data-testid")
      .then((v) => v?.replace("category-row-", ""));

    await page.getByTestId(`category-edit-${inboxId}`).click();

    await page.getByTestId("category-edit-name").fill("After Edit");
    await page.getByTestId("category-edit-save").click();

    await expect(
      page.locator("[data-testid^='category-row-']").filter({ hasText: "After Edit" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("[data-testid^='category-row-']").filter({ hasText: "Before Edit" })
    ).not.toBeVisible();
  });

  test("should delete a category", async ({ page }) => {
    // Create the category first
    await page.getByTestId("category-name-input").fill("To Be Deleted");
    await page.getByTestId("category-description-input").fill(
      "This category will be deleted"
    );
    await page.getByTestId("category-submit").click();

    const row = page
      .locator("[data-testid^='category-row-']")
      .filter({ hasText: "To Be Deleted" });
    await expect(row).toBeVisible({ timeout: 10000 });

    const inboxId = await row
      .getAttribute("data-testid")
      .then((v) => v?.replace("category-row-", ""));

    await page.getByTestId(`category-delete-${inboxId}`).click();
    await page.getByTestId("category-delete-confirm").click();

    await expect(
      page.locator("[data-testid^='category-row-']").filter({ hasText: "To Be Deleted" })
    ).not.toBeVisible({ timeout: 10000 });
  });
});
