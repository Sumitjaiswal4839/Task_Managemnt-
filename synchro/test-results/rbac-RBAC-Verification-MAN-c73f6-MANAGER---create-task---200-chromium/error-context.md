# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC Verification >> MANAGER Role >> MANAGER -> create task -> 200
- Location: tests\e2e\rbac.spec.ts:115:9

# Error details

```
Error: Could not find seeded tasks. Please run npm run db:seed
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Use seeded users from prisma/seed.ts
  4   | const users = {
  5   |   admin: { email: 'admin@test.com', password: 'Admin123!' },
  6   |   manager: { email: 'manager@test.com', password: 'Manager123!' },
  7   |   member: { email: 'member@test.com', password: 'Member123!' }
  8   | };
  9   | 
  10  | let workspaceId = '';
  11  | let taskCreatedByManager = '';
  12  | let taskAssignedToMember = '';
  13  | 
  14  | test.describe('RBAC Verification', () => {
  15  |   // First, we get the workspaceId and task IDs using the Admin account API context
  16  |   test.beforeAll(async ({ request }) => {
  17  |     // Login as Admin
  18  |     let res = await request.post('/api/auth/login', { data: users.admin });
  19  |     let data = await res.json();
  20  |     expect(data.success).toBe(true);
  21  | 
  22  |     // Get Workspaces
  23  |     res = await request.get('/api/workspaces');
  24  |     data = await res.json();
  25  |     workspaceId = data.data[0].id;
  26  |     
  27  |     // Get Tasks
  28  |     res = await request.get(`/api/workspaces/${workspaceId}/tasks`);
  29  |     data = await res.json();
  30  |     
  31  |     // Seed creates multiple tasks. The second one is assigned to Member by Manager.
  32  |     const tasks = data.data.items || data.data;
  33  |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  34  |     taskAssignedToMember = tasks.find((t: any) => t.status === 'IN_PROGRESS')?.id;
  35  |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  36  |     taskCreatedByManager = tasks.find((t: any) => t.status === 'TODO')?.id;
  37  |     
  38  |     if (!taskAssignedToMember || !taskCreatedByManager) {
> 39  |       throw new Error("Could not find seeded tasks. Please run npm run db:seed");
      |             ^ Error: Could not find seeded tasks. Please run npm run db:seed
  40  |     }
  41  |   });
  42  | 
  43  |   test.describe('MEMBER Role', () => {
  44  |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  45  |     let memberContext: any;
  46  |     
  47  |     test.beforeAll(async ({ playwright }) => {
  48  |       memberContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  49  |       const res = await memberContext.post('/api/auth/login', { data: users.member });
  50  |       const data = await res.json();
  51  |       expect(data.success).toBe(true);
  52  |     });
  53  | 
  54  |     test('MEMBER cannot access team management page UI', async ({ page }) => {
  55  |       // Login via UI
  56  |       await page.goto('/login');
  57  |       await page.fill('input[type="email"]', users.member.email);
  58  |       await page.fill('input[type="password"]', users.member.password);
  59  |       await page.click('button[type="submit"]');
  60  |       await page.waitForURL('/dashboard');
  61  |       
  62  |       // Navigate to /team
  63  |       await page.goto('/team');
  64  |       
  65  |       // Should show Unauthorized / Access Denied or redirect
  66  |       // Assuming layout handles this or it shows a blank state/error.
  67  |       // We can check if it stays on team or shows an error.
  68  |       const heading = page.locator('h1').first();
  69  |       const text = await heading.textContent();
  70  |       expect(text?.toLowerCase()).not.toContain('team management');
  71  |     });
  72  | 
  73  |     test('MEMBER -> create task -> 403', async () => {
  74  |       const res = await memberContext.post(`/api/workspaces/${workspaceId}/tasks`, {
  75  |         data: { title: 'Hack Task', description: 'Malicious', status: 'TODO', priority: 'LOW' }
  76  |       });
  77  |       expect(res.status()).toBe(403);
  78  |     });
  79  | 
  80  |     test('MEMBER -> edit another user\'s task -> 403', async () => {
  81  |       const res = await memberContext.patch(`/api/workspaces/${workspaceId}/tasks/${taskCreatedByManager}`, {
  82  |         data: { title: 'Hacked Title', version: 1 }
  83  |       });
  84  |       expect(res.status()).toBe(403);
  85  |     });
  86  | 
  87  |     test('MEMBER -> delete task -> 403', async () => {
  88  |       const res = await memberContext.delete(`/api/workspaces/${workspaceId}/tasks/${taskCreatedByManager}`);
  89  |       expect(res.status()).toBe(403);
  90  |     });
  91  | 
  92  |     test('MEMBER -> update assigned task status -> 200', async () => {
  93  |       // Must get latest version first
  94  |       let res = await memberContext.get(`/api/workspaces/${workspaceId}/tasks/${taskAssignedToMember}`);
  95  |       const data = await res.json();
  96  |       const version = data.data?.version || 1;
  97  | 
  98  |       res = await memberContext.patch(`/api/workspaces/${workspaceId}/tasks/${taskAssignedToMember}/status`, {
  99  |         data: { status: 'DONE', version }
  100 |       });
  101 |       expect(res.status()).toBe(200);
  102 |     });
  103 |   });
  104 | 
  105 |   test.describe('MANAGER Role', () => {
  106 |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  107 |     let managerContext: any;
  108 |     let newTask = '';
  109 |     
  110 |     test.beforeAll(async ({ playwright }) => {
  111 |       managerContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  112 |       await managerContext.post('/api/auth/login', { data: users.manager });
  113 |     });
  114 | 
  115 |     test('MANAGER -> create task -> 200', async () => {
  116 |       const res = await managerContext.post(`/api/workspaces/${workspaceId}/tasks`, {
  117 |         data: { title: 'Manager Task', description: 'Good', status: 'TODO', priority: 'LOW' }
  118 |       });
  119 |       expect(res.status()).toBe(200);
  120 |       const data = await res.json();
  121 |       newTask = data.data.id;
  122 |     });
  123 | 
  124 |     test('MANAGER -> edit task -> 200', async () => {
  125 |       const res = await managerContext.patch(`/api/workspaces/${workspaceId}/tasks/${newTask}`, {
  126 |         data: { title: 'Manager Task Edited', version: 1 }
  127 |       });
  128 |       expect(res.status()).toBe(200);
  129 |     });
  130 |     
  131 |     test('MANAGER -> delete task -> 403', async () => {
  132 |       const res = await managerContext.delete(`/api/workspaces/${workspaceId}/tasks/${newTask}`);
  133 |       expect(res.status()).toBe(403);
  134 |     });
  135 |   });
  136 | 
  137 |   test.describe('ADMIN Role', () => {
  138 |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  139 |     let adminContext: any;
```