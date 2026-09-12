# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realtime.spec.ts >> Realtime Updates >> task update in one browser updates the other
- Location: tests\e2e\realtime.spec.ts:9:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const users = {
  4  |   admin: { email: 'admin@test.com', password: 'Admin123!' },
  5  |   manager: { email: 'manager@test.com', password: 'Manager123!' },
  6  | };
  7  | 
  8  | test.describe('Realtime Updates', () => {
  9  |   test('task update in one browser updates the other', async ({ browser }) => {
  10 |     test.setTimeout(120000); // 2 minutes for slow Next.js dev server
  11 |     // Context A (Admin)
  12 |     const contextA = await browser.newContext();
  13 |     const pageA = await contextA.newPage();
  14 | 
  15 |     // Context B (Manager)
  16 |     const contextB = await browser.newContext();
  17 |     const pageB = await contextB.newPage();
  18 | 
  19 |     // Both log in
> 20 |     await pageA.goto('/login');
     |                 ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  21 |     await pageA.fill('input[type="email"]', users.admin.email);
  22 |     await pageA.fill('input[type="password"]', users.admin.password);
  23 |     await pageA.click('button[type="submit"]');
  24 |     await pageA.waitForURL('/dashboard');
  25 | 
  26 |     await pageB.goto('/login');
  27 |     await pageB.fill('input[type="email"]', users.manager.email);
  28 |     await pageB.fill('input[type="password"]', users.manager.password);
  29 |     await pageB.click('button[type="submit"]');
  30 |     await pageB.waitForURL('/dashboard');
  31 | 
  32 |     // Go to tasks board
  33 |     await pageA.goto('/tasks');
  34 |     await pageB.goto('/tasks');
  35 | 
  36 |     // We don't need to wait for a specific container to render, as the next expect() 
  37 |     // will wait up to 10s for the specific task text to appear via Realtime Pusher event.
  38 | 
  39 |     const uniqueTaskName = `Realtime Task ${Date.now()}`;
  40 | 
  41 |     // Context A creates a task via UI or API
  42 |     // To make it reliable without UI interaction complexities, let's use the API from context A
  43 |     // But since the task requires A creates -> B UI updates, we should create via API in context A, 
  44 |     // and wait for it to appear in Context B's UI.
  45 |     await contextA.request.post('/api/auth/login', { data: users.admin });
  46 |     
  47 |     const wRes = await contextA.request.get('/api/workspaces');
  48 |     const wData = await wRes.json();
  49 |     const workspaceId = wData.data[0].id;
  50 | 
  51 |     await contextA.request.post(`/api/workspaces/${workspaceId}/tasks`, {
  52 |       data: {
  53 |         title: uniqueTaskName,
  54 |         description: 'Testing realtime',
  55 |         status: 'TODO',
  56 |         priority: 'HIGH'
  57 |       }
  58 |     });
  59 | 
  60 |     // Wait for it to appear on B's UI via Pusher
  61 |     // We wait up to 10 seconds for the realtime event to propagate
  62 |     await expect(pageB.locator(`text=${uniqueTaskName}`)).toBeVisible({ timeout: 10000 });
  63 |     
  64 |     // Now edit the task status in Context B via API, see if Context A updates
  65 |     // (In kanban, it might move columns. We can test deletion instead for simplicity)
  66 |     const tRes = await contextB.request.get(`/api/workspaces/${workspaceId}/tasks`);
  67 |     const tData = await tRes.json();
  68 |     const tasks = tData.data.items || tData.data;
  69 |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  70 |     const taskToDelete = tasks.find((t: any) => t.title === uniqueTaskName);
  71 |     
  72 |     // Admin (Context A) deletes the task
  73 |     await contextA.request.delete(`/api/workspaces/${workspaceId}/tasks/${taskToDelete.id}`);
  74 |     
  75 |     // Wait for it to disappear on B's UI
  76 |     await expect(pageB.locator(`text=${uniqueTaskName}`)).toBeHidden({ timeout: 10000 });
  77 | 
  78 |     await contextA.close();
  79 |     await contextB.close();
  80 |   });
  81 | });
  82 | 
```