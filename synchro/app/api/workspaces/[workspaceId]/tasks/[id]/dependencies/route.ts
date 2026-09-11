import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { workspaceId, id } = await params;
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

    const body = await req.json();
    const { dependsOnTaskId, type } = body;

    if (!dependsOnTaskId || !type || !["BLOCKS", "BLOCKED_BY"].includes(type)) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid parameters" } }, { status: 400 });
    }

    if (id === dependsOnTaskId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "A task cannot depend on itself" } }, { status: 400 });
    }

    // Verify both tasks exist in the workspace
    const [task1, task2] = await Promise.all([
      prisma.task.findUnique({ where: { id } }),
      prisma.task.findUnique({ where: { id: dependsOnTaskId } }),
    ]);

    if (!task1 || !task2 || task1.workspaceId !== workspaceId || task2.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "One or both tasks not found in this workspace" } }, { status: 404 });
    }

    // Check for reverse dependency (Cycle prevention A -> B, B -> A)
    const reverseDependency = await prisma.taskDependency.findFirst({
      where: {
        OR: [
          { taskId: id, dependsOnTaskId },
          { taskId: dependsOnTaskId, dependsOnTaskId: id }
        ]
      }
    });

    if (reverseDependency) {
      return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "A dependency or circular dependency already exists between these two tasks." } }, { status: 409 });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: id,
        dependsOnTaskId,
        type,
      },
    });

    return NextResponse.json({ success: true, data: dependency }, { status: 201 });
  } catch (error) {
    console.error("Dependency creation error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
