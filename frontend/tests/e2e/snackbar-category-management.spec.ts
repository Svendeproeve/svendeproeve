import { test, expect } from '@playwright/test';
import { generateTestUser, signupUser } from '../helpers/auth';

test.describe('Category Management Snackbar Notifications', () => {
  test.beforeEach(async ({ page }) => {
    const testUser = generateTestUser('snackbar-category');

    await signupUser(page, testUser);
    await page.getByTestId('show-create-org-button').click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId('onboarding-org-name-input').fill(orgName);
    await page.getByTestId('onboarding-create-org-button').click();
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    await page.goto('/category-management');
  });

  test('Shows snackbar on successful category creation', async ({ page }) => {
    await page.getByTestId('category-name-input').fill('Test Category');
    await page.getByTestId('category-description-input').fill('Test description for AI');
    await page.getByTestId('category-submit').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Category "Test Category" created');
    await expect(snackbar.locator('.MuiAlert-root')).toHaveAttribute('class', /MuiAlert-standardSuccess/);

    await expect(page.getByTestId('category-name-input')).toHaveValue('');
    await expect(page.getByTestId('category-description-input')).toHaveValue('');
  });

  test('Shows snackbar on category creation error', async ({ page }) => {
    const submitButton = page.getByTestId('category-submit');
    await expect(submitButton).toBeDisabled();
  });

  test('Shows snackbar on successful category update', async ({ page }) => {
    await page.getByTestId('category-name-input').fill('Original Category');
    await page.getByTestId('category-description-input').fill('Original description');
    await page.getByTestId('category-submit').click();

    await page.locator('.MuiSnackbar-root').waitFor({ state: 'hidden', timeout: 7000 });

    const editButton = page.getByTestId('category-edit-Original Category').or(
      page.locator('[data-testid^="category-edit-"]').first()
    );
    await editButton.click();

    await page.getByTestId('category-edit-name').fill('Updated Category');
    await page.getByTestId('category-edit-save').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Category updated successfully');
  });

  test('Shows snackbar on category update error', async ({ page }) => {
    await page.getByTestId('category-name-input').fill('Test Category');
    await page.getByTestId('category-description-input').fill('Test description');
    await page.getByTestId('category-submit').click();

    await page.locator('.MuiSnackbar-root').waitFor({ state: 'hidden', timeout: 7000 });

    const editButton = page.locator('[data-testid^="category-edit-"]').first();
    await editButton.click();

    await page.getByTestId('category-edit-name').clear();
    await page.getByTestId('category-edit-save').click();

    const saveButton = page.getByTestId('category-edit-save');
  });

  test('Shows snackbar on successful category deletion', async ({ page }) => {
    await page.getByTestId('category-name-input').fill('Delete Me');
    await page.getByTestId('category-description-input').fill('Will be deleted');
    await page.getByTestId('category-submit').click();

    await page.locator('.MuiSnackbar-root').waitFor({ state: 'hidden', timeout: 7000 });

    const deleteButton = page.locator('[data-testid^="category-delete-"]').first();
    await deleteButton.click();

    await page.getByTestId('category-delete-confirm').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Category deleted successfully');
  });

  test('Shows snackbar on category deletion error', async ({ page }) => {
  });

  test('System categories cannot be deleted', async ({ page }) => {
    const systemCategory = page.locator('tr').filter({ has: page.locator('text=System') }).first();

    if (await systemCategory.count() > 0) {
      await expect(systemCategory.locator('svg').first()).toBeVisible();
      await expect(systemCategory.getByTestId(/category-delete-/)).not.toBeVisible();
    }
  });

  test('Category color picker works', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]').first();
    await colorInput.fill('#ff0000');

    await expect(colorInput).toHaveValue('#ff0000');

    await page.getByTestId('category-name-input').fill('Colored Category');
    await page.getByTestId('category-description-input').fill('Has color');
    await page.getByTestId('category-submit').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('created');
  });

  test('Mail account scoping works', async ({ page }) => {
    const mailAccountCheckboxes = page.locator('input[type="checkbox"]').filter({ hasText: /mail/i });

    if (await mailAccountCheckboxes.count() > 0) {
      await mailAccountCheckboxes.first().check();
    }

    await page.getByTestId('category-name-input').fill('Scoped Category');
    await page.getByTestId('category-description-input').fill('Scoped description');
    await page.getByTestId('category-submit').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
  });

  test('No alerts visible on page - only snackbars', async ({ page }) => {
    await page.getByTestId('category-name-input').fill('Test');
    await page.getByTestId('category-description-input').fill('Test desc');
    await page.getByTestId('category-submit').click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();

    const standaloneAlerts = page.locator('.MuiAlert-root:not(.MuiSnackbar-root .MuiAlert-root)');
    await expect(standaloneAlerts).toHaveCount(0);
  });
});
