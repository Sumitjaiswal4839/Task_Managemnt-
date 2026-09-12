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
    test.setTimeout(60000); // Give plenty of time for DB operations and seeding on slow machines
    // Login as Admin
    let res = await request.post('/api/auth/login', { data: users.admin });
    let data = await res.json();
    expect(data.success).toBe(true);

    // Get Workspaces
    res = await request.get('/api/workspaces');
    data = await res.json();
    workspaceId = data.data[0].id;
    
    // Create Fixture Tasks deterministically
    // 1. Task assigned to member
    res = await request.post(`/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Member Assigned Task', description: 'Deterministic', status: 'TODO', priority: 'MEDIUM' }
    });
    let tData = await res.json();
    taskAssignedToMember = tData.data.id;
    
    // Admin finds member ID to assign
    const mRes = await request.get(`/api/workspaces/${workspaceId}/members`);
    const mData = await mRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberObj = mData.data.find((m: any) => m.email === users.member.email);
    
    if (memberObj) {
      await request.patch(`/api/workspaces/${workspaceId}/tasks/${taskAssignedToMember}`, {
        data: { assignedToId: memberObj.id, version: 1 }
      });
    }

    // 2. Task created by manager (Admin creates it for test purposes, representing an unassigned task)
    res = await request.post(`/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Manager Task', description: 'Unassigned', status: 'TODO', priority: 'LOW' }
    });
    tData = await res.json();
    taskCreatedByManager = tData.data.id;
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
      test.setTimeout(60000);
      // Login via UI
      await page.goto('/login');
      await page.fill('input[type="email"]', users.member.email);
      await page.fill('input[type="password"]', users.member.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 30000 });
      
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
      const version = data.version || 1;

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

    test('MANAGER -> create task -> 201', async () => {
      const res = await managerContext.post(`/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Manager Task', description: 'Good', status: 'TODO', priority: 'LOW' }
      });
      expect([200, 201]).toContain(res.status());
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
