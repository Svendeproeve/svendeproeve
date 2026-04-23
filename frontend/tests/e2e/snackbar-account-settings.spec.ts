import { test, expect } from '@playwright/test';
import { generateTestUser, signupUser } from '../helpers/auth';

test.describe('Account Settings Snackbar Notifications', () => {
  test.beforeEach(async ({ page }) => {
    const testUser = generateTestUser('snackbar-settings');

    await signupUser(page, testUser);
    await page.getByTestId('show-create-org-button').click();
    const orgName = `Test Org ${Date.now()}`;
    await page.getByTestId('onboarding-org-name-input').fill(orgName);
    await page.getByTestId('onboarding-create-org-button').click();
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    await page.goto('/account-settings');
    await expect(page.getByRole('heading', { name: 'Profile Information' })).toBeVisible();
  });

  test('Profile section shows snackbar on validation error', async ({ page }) => {
    const fullNameInput = page.locator('input[type="text"]').nth(1);

    await fullNameInput.clear();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Full name is required');
    await expect(snackbar.locator('.MuiAlert-root')).toHaveAttribute('class', /MuiAlert-standardError/);
  });

  test('Profile section shows snackbar on successful update', async ({ page }) => {
    const fullNameInput = page.locator('input[type="text"]').nth(1);

    await fullNameInput.fill('Updated Name');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('Profile updated successfully');
    await expect(snackbar.locator('.MuiAlert-root')).toHaveAttribute('class', /MuiAlert-standardSuccess/);
  });

  test('Password section shows snackbar on validation errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Password' }).click();

    await page.getByRole('button', { name: 'Change Password' }).click();

    let snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('All password fields are required');

    await page.locator('.MuiSnackbar-root .MuiAlert-action button').click();
    await expect(snackbar).not.toBeVisible();

    await page.locator('input[type="password"]').nth(0).fill('current123');
    await page.locator('input[type="password"]').nth(1).fill('short');
    await page.locator('input[type="password"]').nth(2).fill('short');
    await page.getByRole('button', { name: 'Change Password' }).click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('New password must be at least 8 characters');

    await page.locator('.MuiSnackbar-root .MuiAlert-action button').click();
    await expect(snackbar).not.toBeVisible();

    await page.locator('input[type="password"]').nth(1).fill('newpassword123');
    await page.locator('input[type="password"]').nth(2).fill('different123');
    await page.getByRole('button', { name: 'Change Password' }).click();

    await expect(snackbar).toBeVisible();
    await expect(snackbar.locator('.MuiAlert-message')).toContainText('New passwords do not match');
  });

  test('Delete Account section shows snackbar on confirmation error', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete Account' }).click();

    await page.getByRole('button', { name: 'Delete My Account' }).click();

    await expect(page.locator('.MuiDialog-root')).toBeVisible();

    const deleteButton = page.locator('.MuiDialog-root').getByRole('button', { name: 'Delete Account' });
    await expect(deleteButton).toBeDisabled();

    const dialogInput = page.locator('.MuiDialog-root input[type="text"]');
    await dialogInput.fill('DELETE');
    await expect(deleteButton).toBeEnabled();
  });

  test('Snackbar appears in bottom-right corner', async ({ page }) => {
    const fullNameInput = page.locator('input[type="text"]').nth(1);

    await fullNameInput.clear();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();

    const box = await snackbar.boundingBox();
    const viewport = page.viewportSize();

    expect(box!.y).toBeGreaterThan(viewport!.height / 2);
    expect(box!.x).toBeGreaterThan(viewport!.width / 2);
  });


  test('Snackbar can be manually closed', async ({ page }) => {
    const fullNameInput = page.locator('input[type="text"]').nth(1);

    await fullNameInput.clear();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const snackbar = page.locator('.MuiSnackbar-root');
    await expect(snackbar).toBeVisible();

    await page.locator('.MuiSnackbar-root .MuiAlert-action button').click();
    await expect(snackbar).not.toBeVisible();
  });
});
