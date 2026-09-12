import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership, canUpdateStatus } from "@/lib/rbac";
import { UpdateTaskStatusSchema } from "@/lib/validators";
import { pusherServer } from "@/lib/pusher";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    
    // Rate limit check
    const rateLimit = await checkRateLimit(`task-status-${session.id}`);
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for task status update", { userId: session.id });
      return NextResponse.json(
        { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }

    const { workspaceId, id } = await params;

    // Verify workspace membership
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = UpdateTaskStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status or version parameters",
            details: result.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { status: nextStatus, version } = result.data;

    // Verify task exists inside this workspace
    const existingTask = await prisma.task.findFirst({
      where: { id, workspaceId },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found in this workspace" } },
        { status: 404 }
      );
    }

    // Role check: Members can only update their own assigned task
    if (!canUpdateStatus(membership.role, session.id, existingTask.assignedToId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Workspace members can only update status for tasks assigned to them.",
          },
        },
        { status: 403 }
      );
    }

    // Atomic update with OCC increment and activity log
    const updatedTask = await prisma.$transaction(async (tx) => {
      const result = await tx.task.updateMany({
        where: { id, workspaceId, version },
        data: {
          status: nextStatus,
          version: { increment: 1 },
        },
      });

      if (result.count !== 1) {
        throw new Error("VERSION_CONFLICT");
      }

      const task = await tx.task.findUniqueOrThrow({
        where: { id },
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
          action: "STATUS_UPDATED",
          metadata: {
            from: existingTask.status,
            to: nextStatus,
          },
        },
      });

      return task;
    });

    // Trigger Pusher real-time event
    try {
      await pusherServer.trigger(`private-workspace-${workspaceId}`, "task.updated", updatedTask);
    } catch (e) {
      console.error("Pusher error:", e);
    }

    return NextResponse.json({ success: true, data: updatedTask });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Update task status error", { error });
    if (error.message === "VERSION_CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "This task was modified concurrently by another user. Please refresh.",
          },
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update task status" } },
      { status: 500 }
    );
  }
}
