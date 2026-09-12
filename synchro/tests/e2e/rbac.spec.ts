import { test, expect } from '@playwright/test';

// Use seeded users from prisma/seed.ts
const users = {
  admin: { email: 'admin@test.com', password: 'Admin123!' },
  manager: { email: 'manager@test.com', password: 'Manager123!' },
  member: { email: 'member@test.com', password: 'Member123!' }
};

let workspaceId = '';
let taskCreatedByManager = '';
let taskAssignedToMember = '';

test.describe('RBAC Verification', () => {
  // First, we get the workspaceId and task IDs using the Admin account API context
  test.beforeAll(async ({ request }) => {
    // Login as Admin
    let res = await request.post('/api/auth/login', { data: users.admin });
    let data = await res.json();
    expect(data.success).toBe(true);

    // Get Workspaces
    res = await request.get('/api/workspaces');
    data = await res.json();
    workspaceId = data.data[0].id;
    
    // Get Tasks
    res = await request.get(`/api/workspaces/${workspaceId}/tasks`);
    data = await res.json();
    
    // Seed creates multiple tasks. The second one is assigned to Member by Manager.
    const tasks = data.data.items || data.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskAssignedToMember = tasks.find((t: any) => t.status === 'IN_PROGRESS')?.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskCreatedByManager = tasks.find((t: any) => t.status === 'TODO')?.id;
    
    if (!taskAssignedToMember || !taskCreatedByManager) {
      throw new Error("Could not find seeded tasks. Please run npm run db:seed");
    }
  });

  test.describe('MEMBER Role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let memberContext: any;
    
    test.beforeAll(async ({ playwright }) => {
      memberContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
      const res = await memberContext.post('/api/auth/login', { data: users.member });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('MEMBER cannot access team management page UI', async ({ page }) => {
      // Login via UI
      await page.goto('/login');
      await page.fill('input[type="email"]', users.member.email);
      await page.fill('input[type="password"]', users.member.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Navigate to /team
      await page.goto('/team');
      
      // Should show Unauthorized / Access Denied or redirect
      // Assuming layout handles this or it shows a blank state/error.
      // We can check if it stays on team or shows an error.
      const heading = page.locator('h1').first();
      const text = await heading.textContent();
      expect(text?.toLowerCase()).not.toContain('team management');
    });

    test('MEMBER -> create task -> 403', async () => {
      const res = await memberContext.post(`/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Hack Task', description: 'Malicious', status: 'TODO', priority: 'LOW' }
      });
      expect(res.status()).toBe(403);
    });

    test('MEMBER -> edit another user\'s task -> 403', async () => {
      const res = await memberContext.patch(`/api/workspaces/${workspaceId}/tasks/${taskCreatedByManager}`, {
        data: { title: 'Hacked Title', version: 1 }
      });
      expect(res.status()).toBe(403);
    });

    test('MEMBER -> delete task -> 403', async () => {
      const res = await memberContext.delete(`/api/workspaces/${workspaceId}/tasks/${taskCreatedByManager}`);
      expect(res.status()).toBe(403);
    });

    test('MEMBER -> update assigned task status -> 200', async () => {
      // Must get latest version first
      let res = await memberContext.get(`/api/workspaces/${workspaceId}/tasks/${taskAssignedToMember}`);
      const data = await res.json();
      const version = data.data?.version || 1;

      res = await memberContext.patch(`/api/workspaces/${workspaceId}/tasks/${taskAssignedToMember}/status`, {
        data: { status: 'DONE', version }
      });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('MANAGER Role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let managerContext: any;
    let newTask = '';
    
    test.beforeAll(async ({ playwright }) => {
      managerContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
      await managerContext.post('/api/auth/login', { data: users.manager });
    });

    test('MANAGER -> create task -> 200', async () => {
      const res = await managerContext.post(`/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Manager Task', description: 'Good', status: 'TODO', priority: 'LOW' }
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      newTask = data.data.id;
    });

    test('MANAGER -> edit task -> 200', async () => {
      const res = await managerContext.patch(`/api/workspaces/${workspaceId}/tasks/${newTask}`, {
        data: { title: 'Manager Task Edited', version: 1 }
      });
      expect(res.status()).toBe(200);
    });
    
    test('MANAGER -> delete task -> 403', async () => {
      const res = await managerContext.delete(`/api/workspaces/${workspaceId}/tasks/${newTask}`);
      expect(res.status()).toBe(403);
    });
  });

  test.describe('ADMIN Role', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let adminContext: any;
    
    test.beforeAll(async ({ playwright }) => {
      adminContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
      await adminContext.post('/api/auth/login', { data: users.admin });
    });

    test('ADMIN -> delete task -> 200', async () => {
      const res = await adminContext.delete(`/api/workspaces/${workspaceId}/tasks/${taskCreatedByManager}`);
      expect(res.status()).toBe(200);
    });
  });
});
