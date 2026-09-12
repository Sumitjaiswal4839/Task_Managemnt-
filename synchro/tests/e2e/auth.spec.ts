import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login.*/);
  });

  test('validates incorrect login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'badpassword');
    await page.click('button[type="submit"]');

    const errorDiv = page.locator('.text-red-300');
    await expect(errorDiv).toBeVisible({ timeout: 15000 });
  });
});
