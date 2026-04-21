import { test, expect } from '@playwright/test';
import { generateTestUser } from '../helpers/auth';
import { getPasswordResetToken } from '../helpers/db';

const API_URL = process.env.API_URL || 'http://localhost:8001';

test.describe('Forgot Password', () => {
  test('login page links to forgot password', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-forgot-password-link').click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('shows error when email field is empty', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByTestId('forgot-password-submit-button').click();
    await expect(page.getByTestId('forgot-password-error')).toBeVisible();
  });

  test('shows success message for non-existent email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByTestId('forgot-password-email-input').fill('nobody@example.com');
    await page.getByTestId('forgot-password-submit-button').click();
    await expect(page.getByTestId('forgot-password-success')).toBeVisible({ timeout: 10000 });
  });

  test('shows success message for a registered email', async ({ page, request }) => {
    const user = generateTestUser('forgot-pw');
    await request.post(`${API_URL}/auth/signup`, {
      data: { email: user.email, password: user.password, full_name: user.fullName },
    });

    await page.goto('/forgot-password');
    await page.getByTestId('forgot-password-email-input').fill(user.email);
    await page.getByTestId('forgot-password-submit-button').click();
    await expect(page.getByTestId('forgot-password-success')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Reset Password', () => {
  test('shows error when token is missing from URL', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByTestId('reset-password-error')).toBeVisible();
  });

  test('shows error when fields are empty', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken');
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-error')).toBeVisible();
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken');
    await page.getByTestId('reset-password-new-password-input').fill('short');
    await page.getByTestId('reset-password-confirm-password-input').fill('short');
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-error')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken');
    await page.getByTestId('reset-password-new-password-input').fill('password123');
    await page.getByTestId('reset-password-confirm-password-input').fill('different123');
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-error')).toBeVisible();
  });

  test('shows error for an invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-that-does-not-exist');
    await page.getByTestId('reset-password-new-password-input').fill('newpassword123');
    await page.getByTestId('reset-password-confirm-password-input').fill('newpassword123');
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-error')).toBeVisible({ timeout: 10000 });
  });

  test('full flow: reset password then login with new password', async ({ page, request }) => {
    const user = generateTestUser('reset-flow');
    const newPassword = 'newpassword456';

    await request.post(`${API_URL}/auth/signup`, {
      data: { email: user.email, password: user.password, full_name: user.fullName },
    });

    await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: user.email },
    });

    const token = await getPasswordResetToken(user.email);
    expect(token).toBeTruthy();

    await page.goto(`/reset-password?token=${token}`);
    await page.getByTestId('reset-password-new-password-input').fill(newPassword);
    await page.getByTestId('reset-password-confirm-password-input').fill(newPassword);
    await page.getByTestId('reset-password-submit-button').click();

    await expect(page.getByTestId('reset-password-success')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    await page.getByTestId('login-email-input').fill(user.email);
    await page.getByTestId('login-password-input').fill(newPassword);
    await page.getByTestId('login-submit-button').click();
    await expect(page).toHaveURL('/onboarding', { timeout: 10000 });
  });
});
