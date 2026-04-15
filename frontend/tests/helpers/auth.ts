import { Page, expect } from '@playwright/test';

export interface TestUser {
  fullName: string;
  email: string;
  password: string;
  orgName?: string;
}

export async function signupUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.getByTestId('register-fullname-input').fill(user.fullName);
  await page.getByTestId('register-email-input').fill(user.email);
  await page.getByTestId('register-password-input').fill(user.password);
  await page.getByTestId('register-confirm-password-input').fill(user.password);
  await page.getByTestId('register-submit-button').click();
  await expect(page).toHaveURL('/onboarding', { timeout: 10000 });
}

export async function loginUser(page: Page, user: Pick<TestUser, 'email' | 'password'>): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(user.email);
  await page.getByTestId('login-password-input').fill(user.password);
  await page.getByTestId('login-submit-button').click();
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

export async function completeOnboarding(page: Page, user: TestUser): Promise<void> {
  const orgName = user.orgName || `Test Org ${Date.now()}`;
  await signupUser(page, user);
  await page.getByTestId('show-create-org-button').click();
  await page.getByTestId('onboarding-org-name-input').fill(orgName);
  await page.getByTestId('onboarding-create-org-button').click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  await expect(page.getByTestId('dashboard-greeting')).toBeVisible({ timeout: 10000 });
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  });
}

export function generateTestUser(prefix: string = 'test'): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    fullName: `Test User ${id}`,
    email: `${prefix}-${id}@example.com`,
    password: 'testpassword123',
    orgName: `Test Org ${id}`,
  };
}

export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('auth_token'));
}

export async function getAuthUser(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  });
}
