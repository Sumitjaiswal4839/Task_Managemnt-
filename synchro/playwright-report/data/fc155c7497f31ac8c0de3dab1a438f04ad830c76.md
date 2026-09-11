# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> validates incorrect login
- Location: tests\e2e\auth.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.text-red-300')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.text-red-300') with timeout 5000ms
  - waiting for locator('.text-red-300')

```

```yaml
- link "Synchro Synchro":
  - /url: /
  - img "Synchro"
  - text: Synchro
- heading "Sign in to your workspace" [level=1]
- paragraph: Enter your credentials or choose a pre-configured test account below
- paragraph: 1-Click Demo Accounts
- button "Admin":
  - img
  - text: Admin
- button "Manager":
  - img
  - text: Manager
- button "Member":
  - img
  - text: Member
- text: Email address
- img
- textbox "name@example.com": wrong@test.com
- text: Password
- img
- textbox "••••••••": badpassword
- button "Signing in..." [disabled]:
  - img
  - text: Signing in...
- paragraph:
  - text: Don't have an account?
  - link "Register here":
    - /url: /register
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('redirects unauthenticated user to login', async ({ page }) => {
  5  |     await page.goto('/dashboard');
  6  |     await expect(page).toHaveURL(/.*\/login.*/);
  7  |   });
  8  | 
  9  |   test('validates incorrect login', async ({ page }) => {
  10 |     await page.goto('/login');
  11 |     await page.fill('input[type="email"]', 'wrong@test.com');
  12 |     await page.fill('input[type="password"]', 'badpassword');
  13 |     await page.click('button[type="submit"]');
  14 | 
  15 |     const errorDiv = page.locator('.text-red-300');
> 16 |     await expect(errorDiv).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  17 |   });
  18 | });
  19 | 
```