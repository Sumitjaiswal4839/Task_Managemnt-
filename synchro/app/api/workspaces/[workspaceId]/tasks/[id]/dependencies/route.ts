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
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });

    const { workspaceId, id } = await params;
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } }, { status: 403 });

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

    // Check for deep dependency cycles (A -> B -> C -> A)
    const allWorkspaceTasks = await prisma.task.findMany({
      where: { workspaceId },
      select: { id: true }
    });
    const workspaceTaskIds = allWorkspaceTasks.map(t => t.id);

    const allDependencies = await prisma.taskDependency.findMany({
      where: { taskId: { in: workspaceTaskIds } }
    });

    const graph = new Map<string, string[]>();
    for (const tid of workspaceTaskIds) {
      graph.set(tid, []);
    }

    for (const dep of allDependencies) {
      if (dep.type === "BLOCKED_BY") {
        graph.get(dep.taskId)?.push(dep.dependsOnTaskId);
      } else if (dep.type === "BLOCKS") {
        graph.get(dep.dependsOnTaskId)?.push(dep.taskId);
      }
    }

    if (type === "BLOCKED_BY") {
      graph.get(id)?.push(dependsOnTaskId);
    } else {
      graph.get(dependsOnTaskId)?.push(id);
    }

    function hasCycle(node: string, visited: Set<string>, recStack: Set<string>): boolean {
      if (recStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      recStack.add(node);
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor, visited, recStack)) return true;
      }
      recStack.delete(node);
      return false;
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    let cycleDetected = false;
    for (const node of workspaceTaskIds) {
      if (hasCycle(node, visited, recStack)) {
        cycleDetected = true;
        break;
      }
    }

    if (cycleDetected) {
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
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to create dependency" } }, { status: 500 });
  }
}
