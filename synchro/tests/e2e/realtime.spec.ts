import { test, expect } from '@playwright/test';

const users = {
  admin: { email: 'admin@test.com', password: 'Admin123!' },
  manager: { email: 'manager@test.com', password: 'Manager123!' },
};

test.describe('Realtime Updates', () => {
  test('task update in one browser updates the other', async ({ browser }) => {
    test.setTimeout(120000); // 2 minutes for slow Next.js dev server
    // Context A (Admin)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Context B (Manager)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Both log in
    await pageA.goto('/login');
    await pageA.fill('input[type="email"]', users.admin.email);
    await pageA.fill('input[type="password"]', users.admin.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('/dashboard');

    await pageB.goto('/login');
    await pageB.fill('input[type="email"]', users.manager.email);
    await pageB.fill('input[type="password"]', users.manager.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('/dashboard');

    // Go to tasks board
    await pageA.goto('/tasks');
    await pageB.goto('/tasks');

    // Wait for the board to load on both pages
    // We expect some initial seeded tasks to be visible
    await expect(pageA.locator('text=Interactive Kanban Board UI').first()).toBeVisible({ timeout: 15000 });
    await expect(pageB.locator('text=Interactive Kanban Board UI').first()).toBeVisible({ timeout: 15000 });

    const uniqueTaskName = `Realtime Task ${Date.now()}`;

    // Context A creates a task via UI or API
    // To make it reliable without UI interaction complexities, let's use the API from context A
    // But since the task requires A creates -> B UI updates, we should create via API in context A, 
    // and wait for it to appear in Context B's UI.
    await contextA.request.post('/api/auth/login', { data: users.admin });
    
    const wRes = await contextA.request.get('/api/workspaces');
    const wData = await wRes.json();
    const workspaceId = wData.data[0].id;

    await contextA.request.post(`/api/workspaces/${workspaceId}/tasks`, {
      data: {
        title: uniqueTaskName,
        description: 'Testing realtime',
        status: 'TODO',
        priority: 'HIGH'
      }
    });

    // Wait for it to appear on B's UI via Pusher
    // We wait up to 10 seconds for the realtime event to propagate
    await expect(pageB.locator(`text=${uniqueTaskName}`)).toBeVisible({ timeout: 10000 });
    
    // Now edit the task status in Context B via API, see if Context A updates
    // (In kanban, it might move columns. We can test deletion instead for simplicity)
    const tRes = await contextB.request.get(`/api/workspaces/${workspaceId}/tasks`);
    const tData = await tRes.json();
    const tasks = tData.data.items || tData.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskToDelete = tasks.find((t: any) => t.title === uniqueTaskName);
    
    // Admin (Context A) deletes the task
    await contextA.request.delete(`/api/workspaces/${workspaceId}/tasks/${taskToDelete.id}`);
    
    // Wait for it to disappear on B's UI
    await expect(pageB.locator(`text=${uniqueTaskName}`)).toBeHidden({ timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});
