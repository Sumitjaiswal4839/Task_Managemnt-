import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { canModifyTask, canDeleteTask } from "@/lib/rbac";
import { pusherServer } from "@/lib/pusher";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  version: z.number().int().positive(),
}).strict();

type RouteContext = {
  params: Promise<{
    workspaceId: string;
    id: string; // our sub-path is [id]
  }>;
};

async function getMembership(userId: string, workspaceId: string) {
  return prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });
}

/**
 * GET /api/workspaces/:workspaceId/tasks/:id
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET task error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

/**
 * PATCH /api/workspaces/:workspaceId/tasks/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    if (!canModifyTask(membership.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to modify tasks" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      select: { id: true, workspaceId: true, version: true },
    });

    if (!existingTask) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }

    if (existingTask.version !== data.version) {
      return NextResponse.json(
        { success: false, error: { code: "VERSION_CONFLICT", message: "Task was modified by another user", currentVersion: existingTask.version } },
        { status: 409 }
      );
    }

    if (data.assignedToId) {
      const assignee = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: data.assignedToId, workspaceId } },
      });
      if (!assignee) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Assigned user is not a member of this workspace" } },
          { status: 400 }
        );
      }
    }

    const updatedTask = await prisma.task.updateMany({
      where: { id: taskId, workspaceId, version: data.version },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        version: { increment: 1 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    if (updatedTask.count !== 1) {
      return NextResponse.json(
        { success: false, error: { code: "VERSION_CONFLICT", message: "Task was modified by another user" } },
        { status: 409 }
      );
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH task error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/:workspaceId/tasks/:id
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
    }

    if (!canDeleteTask(membership.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to delete tasks" } },
        { status: 403 }
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Task not found" } }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: task.id } });

    // Trigger Pusher real-time event
    try {
      await pusherServer.trigger(`private-workspace-${workspaceId}`, "task.deleted", { id: task.id });
    } catch (e) {
      console.error("Pusher error:", e);
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE task error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}
