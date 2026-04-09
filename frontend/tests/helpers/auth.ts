import { Page } from '@playwright/test';

export interface TestUser {
  fullName: string;
  email: string;
  password: string;
  orgName?: string;
}

export async function signupUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.getByPlaceholder('John Doe').fill(user.fullName);
  await page.getByPlaceholder('you@example.com').fill(user.email);
  await page.getByPlaceholder('••••••••••••••••').first().fill(user.password);
  await page.getByPlaceholder('••••••••••••••••').last().fill(user.password);
  await page.getByRole('button', { name: 'Register' }).click();
}

export async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(user.email);
  await page.getByPlaceholder('••••••••••••••••').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function createOrganization(page: Page, orgName: string): Promise<void> {
  await page.getByPlaceholder('My Company').fill(orgName);
  await page.getByRole('button', { name: 'Create Organization' }).click();
}

export async function completeOnboarding(page: Page, user: TestUser): Promise<void> {
  await signupUser(page, user);
  await createOrganization(page, user.orgName || `Test Org ${Date.now()}`);
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
