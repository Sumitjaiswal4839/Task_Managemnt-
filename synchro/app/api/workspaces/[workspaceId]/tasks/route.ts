import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership, canCreateTask } from "@/lib/rbac";
import { CreateTaskSchema } from "@/lib/validators";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { workspaceId } = await params;

    // IDOR / BOLA Guard: Verify caller belongs to this workspace
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const priority = searchParams.get("priority") as TaskPriority | null;
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const sortField = searchParams.get("sort") || "createdAt";
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
    
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Server-side sorting allowlist to prevent injection
    const allowedSortFields: Record<string, string> = {
      createdAt: "createdAt",
      dueDate: "dueDate",
      title: "title",
      updatedAt: "updatedAt"
    };
    
    const validatedSortField = allowedSortFields[sortField] || "createdAt";
    const orderBy = { [validatedSortField]: sortOrder };

    const where: Record<string, unknown> = { workspaceId };

    if (status && ["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      where.status = status;
    }

    if (priority && ["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      where.priority = priority;
    }

    const parentId = searchParams.get("parentId");
    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null; // Default to main tasks if not fetching subtasks specifically
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: tasks.map((t) => ({
          id: t.id,
          workspaceId: t.workspaceId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          version: t.version,
          parentId: t.parentId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          assignedTo: t.assignedTo,
          createdBy: t.createdBy,
          commentsCount: t._count.comments,
        })),
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Fetch workspace tasks error", { error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch workspace tasks" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    
    const rateLimit = await checkRateLimit(`task-create-${session.id}`, { interval: 60000, maxRequests: 20 });
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for task creation", { userId: session.id });
      return NextResponse.json(
        { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }

    const { workspaceId } = await params;

    // Verify workspace membership & role
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } },
        { status: 403 }
      );
    }

    if (!canCreateTask(membership.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only Workspace Admins and Managers can create tasks" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = CreateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid task parameters",
            details: result.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { title, description, priority, status, dueDate, assignedToId, parentId } = result.data;

    // Verify assigned user is enrolled in this workspace
    if (assignedToId) {
      const assigneeMembership = await getWorkspaceMembership(assignedToId, workspaceId);
      if (!assigneeMembership) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_ASSIGNEE", message: "Assigned user is not enrolled in this workspace" },
          },
          { status: 400 }
        );
      }
    }

    // Subtask Strict Constraints (Phase 2B)
    if (parentId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parentId },
        select: { workspaceId: true, parentId: true }
      });
      
      if (!parentTask) {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Parent task not found" } }, { status: 404 });
      }

      if (parentTask.workspaceId !== workspaceId) {
        return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Cross-workspace subtasks are forbidden" } }, { status: 400 });
      }

      if (parentTask.parentId !== null) {
        return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Maximum subtask depth is 1 (cannot nest a subtask inside a subtask)" } }, { status: 400 });
      }
    }

    // Atomic transaction: Create Task + Create Activity Log
    const newTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          workspaceId,
          title,
          description: description || null,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate) : null,
          createdById: session.id,
          assignedToId: assignedToId || null,
          parentId: parentId || null,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          taskId: task.id,
          userId: session.id,
          action: "TASK_CREATED",
          metadata: {
            title: task.title,
            priority: task.priority,
            assignedTo: task.assignedTo?.name || "Unassigned",
          },
        },
      });

      return task;
    });

    // Trigger Pusher real-time event
    try {
      await pusherServer.trigger(`private-workspace-${workspaceId}`, "task.created", newTask);
    } catch (e) {
      console.error("Pusher error:", e);
    }

    // Create Notification if assigned to someone else
    if (assignedToId && assignedToId !== session.id) {
      try {
        await prisma.notification.create({
          data: {
            workspaceId,
            userId: assignedToId,
            actorId: session.id,
            type: "TASK_ASSIGNED",
            title: "New Task Assigned",
            message: `${session.name} assigned you a new task: "${title}"`,
            taskId: newTask.id
          }
        });
      } catch (e) {
        console.error("Notification creation error:", e);
      }
    }

    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (error) {
    logger.error("Create workspace task error", { error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create task" } },
      { status: 500 }
    );
  }
}
