import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      select: { id: true, workspaceId: true, version: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (existingTask.version !== data.version) {
      return NextResponse.json(
        { error: "Task was modified by another user", code: "VERSION_CONFLICT", currentVersion: existingTask.version },
        { status: 409 }
      );
    }

    if (data.assignedToId) {
      const assignee = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: data.assignedToId, workspaceId } },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Assigned user is not a member of this workspace" },
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
      } as any,
    });

    if (updatedTask.count !== 1) {
      return NextResponse.json(
        { error: "Task was modified by another user", code: "VERSION_CONFLICT" },
        { status: 409 }
      );
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, id: taskId } = await context.params;

    const membership = await getMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (membership.role !== "ADMIN" && membership.role !== "MANAGER") {
      return NextResponse.json(
        { error: "You do not have permission to delete tasks" },
        { status: 403 }
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: task.id } });
    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
