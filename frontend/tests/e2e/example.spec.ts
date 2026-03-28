import { test, expect } from '@playwright/test';

test.describe('Example E2E test', () => {
  test('should verify backend is running', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const response = await request.get(`${apiUrl}/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('should load the login page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sortr' })).toBeVisible();
  });
});
