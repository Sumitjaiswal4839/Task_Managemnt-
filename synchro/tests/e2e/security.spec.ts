import { test, expect } from '@playwright/test';

const users = {
  admin: { email: 'admin@test.com', password: 'Admin123!' },
  manager: { email: 'manager@test.com', password: 'Manager123!' }, // We will use manager for workspace A
  member: { email: 'member@test.com', password: 'Member123!' } // We will use member for workspace B
};

test.describe('Cross-Workspace Security Negative Tests', () => {
  let workspaceA = '';
  let taskInA = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminContext: any; // admin in workspaceA, but not in workspaceB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let managerContext: any; // manager, not in workspaceA

  test.beforeAll(async ({ playwright }) => {
    // Setup contexts
    adminContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    managerContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

    await adminContext.post('/api/auth/login', { data: users.admin });
    await managerContext.post('/api/auth/login', { data: users.manager });

    const wResA = await adminContext.post('/api/workspaces', { data: { name: 'Workspace A Security' } });
    const wDataA = await wResA.json();
    workspaceA = wDataA.data.id;

    // Admin creates a task in Workspace A
    const tResA = await adminContext.post(`/api/workspaces/${workspaceA}/tasks`, {
      data: { title: 'Task in Workspace A', description: 'Secret', status: 'TODO', priority: 'HIGH' }
    });
    const tDataA = await tResA.json();
    taskInA = tDataA.data.id;
  });

  test('User B cannot GET task in Workspace A', async () => {
    const res = await managerContext.get(`/api/workspaces/${workspaceA}/tasks/${taskInA}`);
    expect(res.status()).toBe(403);
  });

  test('User B cannot PATCH task in Workspace A', async () => {
    const res = await managerContext.patch(`/api/workspaces/${workspaceA}/tasks/${taskInA}`, {
      data: { title: 'Hacked', version: 1 }
    });
    expect([403, 404]).toContain(res.status());
  });

  test('User B cannot DELETE task in Workspace A', async () => {
    const res = await managerContext.delete(`/api/workspaces/${workspaceA}/tasks/${taskInA}`);
    expect([403, 404]).toContain(res.status());
  });

  test('User B cannot GET comments for task in Workspace A', async () => {
    const res = await managerContext.get(`/api/workspaces/${workspaceA}/tasks/${taskInA}/comments`);
    expect([403, 404]).toContain(res.status());
  });

  test('User B cannot POST comments for task in Workspace A', async () => {
    const res = await managerContext.post(`/api/workspaces/${workspaceA}/tasks/${taskInA}/comments`, {
      data: { content: 'Malicious comment' }
    });
    expect([403, 404]).toContain(res.status());
  });

  test('User B cannot GET attachments for task in Workspace A', async () => {
    const res = await managerContext.get(`/api/workspaces/${workspaceA}/tasks/${taskInA}/attachments`);
    expect([403, 404]).toContain(res.status());
  });

  test('User B cannot POST attachment metadata for task in Workspace A', async () => {
    const res = await managerContext.post(`/api/workspaces/${workspaceA}/tasks/${taskInA}/attachments`, {
      data: { storageKey: 'test', originalName: 'test.png', mimeType: 'image/png' }
    });
    expect([403, 404]).toContain(res.status());
  });

  test('Unauthorized Pusher private-channel subscription', async () => {
    // We attempt to hit the pusher auth endpoint directly as User B for Workspace A's channel
    const formData = new URLSearchParams();
    formData.append('socket_id', '12345.67890');
    formData.append('channel_name', `private-workspace-${workspaceA}`);

    const res = await managerContext.post('/api/pusher/auth', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: formData.toString()
    });

    // Should be Forbidden because User B is not in Workspace A
    expect(res.status()).toBe(403);
  });
});
