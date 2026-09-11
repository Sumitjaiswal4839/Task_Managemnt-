import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Synchro multi-tenant workspace database...");

  // Clean existing records in reverse dependency order
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords using Argon2id (OWASP standard)
  const adminPassword = await argon2.hash("Admin123!", { type: argon2.argon2id });
  const managerPassword = await argon2.hash("Manager123!", { type: argon2.argon2id });
  const memberPassword = await argon2.hash("Member123!", { type: argon2.argon2id });

  // 1. Create Core Users
  const admin = await prisma.user.create({
    data: {
      name: "Alex Admin",
      email: "admin@test.com",
      password: adminPassword,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Marcus Manager",
      email: "manager@test.com",
      password: managerPassword,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Maya Member",
      email: "member@test.com",
      password: memberPassword,
    },
  });

  // 2. Create Default Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Engineering Workspace",
      slug: "engineering",
    },
  });

  console.log("🏢 Created Workspace: Engineering Workspace (slug: engineering)");

  // 3. Create Memberships with Scoped Roles
  await prisma.membership.createMany({
    data: [
      { userId: admin.id, workspaceId: workspace.id, role: Role.ADMIN },
      { userId: manager.id, workspaceId: workspace.id, role: Role.MANAGER },
      { userId: member.id, workspaceId: workspace.id, role: Role.MEMBER },
    ],
  });

  console.log("👥 Created Workspace Memberships:");
  console.log("   - Alex Admin:      ADMIN   (admin@test.com / Admin123!)");
  console.log("   - Marcus Manager:  MANAGER (manager@test.com / Manager123!)");
  console.log("   - Maya Member:     MEMBER  (member@test.com / Member123!)");

  // 4. Create Workspace Tasks
  const task1 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title: "Initialize Synchro Architecture & Specifications",
      description: "Establish 3NF/BCNF schema, Argon2id security, and workspace isolation.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      createdById: admin.id,
      assignedToId: admin.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title: "Workspace-Scoped Status Transitions",
      description: "Build state machine transitions with Optimistic Concurrency Control.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      createdById: manager.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    },
  });

  await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title: "Interactive Kanban Board UI",
      description: "Implement responsive drag-and-drop task columns.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      createdById: manager.id,
      assignedToId: member.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
  });

  // 5. Create Comments
  await prisma.comment.create({
    data: {
      content: "All Phase 1 specifications and multi-tenant schema models are complete.",
      taskId: task1.id,
      authorId: admin.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Testing status changes on Maya's assigned task.",
      taskId: task2.id,
      authorId: member.id,
    },
  });

  // 6. Create Activity Logs
  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      taskId: task1.id,
      userId: admin.id,
      action: "TASK_CREATED",
      metadata: { title: task1.title, priority: task1.priority },
    },
  });

  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      taskId: task2.id,
      userId: manager.id,
      action: "TASK_ASSIGNED",
      metadata: { assignedTo: member.name },
    },
  });

  console.log("✅ Synchro Seed Complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
