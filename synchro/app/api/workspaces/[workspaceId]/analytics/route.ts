import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";

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
    const membership = await getWorkspaceMembership(session.id, workspaceId);

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } },
        { status: 403 }
      );
    }

    const now = new Date();

    // PostgreSQL Native Aggregates (O(1) memory overhead in Node)
    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      statusCounts,
      priorityCounts,
      recentActivity
    ] = await Promise.all([
      // 1. Total tasks
      prisma.task.count({ where: { workspaceId } }),
      // 2. Completed tasks
      prisma.task.count({ where: { workspaceId, status: "DONE" } }),
      // 3. Overdue tasks (status != DONE AND dueDate < now)
      prisma.task.count({
        where: {
          workspaceId,
          status: { not: "DONE" },
          dueDate: { lt: now }
        }
      }),
      // 4. By Status breakdown
      prisma.task.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { status: true }
      }),
      // 5. By Priority breakdown
      prisma.task.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: { priority: true }
      }),
      // 6. Recent Activity Feed (Limit 20 for performance)
      prisma.activityLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true } }
        }
      })
    ]);

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Transform Prisma groupBy results into easy-to-use maps
    const byStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = priorityCounts.reduce((acc, curr) => {
      acc[curr.priority] = curr._count.priority;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate.toFixed(2)),
        overdueTasks,
        byStatus,
        byPriority,
        recentActivity
      }
    });

  } catch (error) {
    console.error("Fetch analytics error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch dashboard analytics" } },
      { status: 500 }
    );
  }
}
