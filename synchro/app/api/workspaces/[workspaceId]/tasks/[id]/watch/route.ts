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

    await prisma.taskWatcher.upsert({
      where: {
        taskId_userId: {
          taskId: id,
          userId: session.id,
        },
      },
      update: {},
      create: {
        taskId: id,
        userId: session.id,
      },
    });

    return NextResponse.json({ success: true, message: "Started watching task" });
  } catch (error) {
    console.error("Watch error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { workspaceId, id } = await params;
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

    await prisma.taskWatcher.deleteMany({
      where: {
        taskId: id,
        userId: session.id,
      },
    });

    return NextResponse.json({ success: true, message: "Stopped watching task" });
  } catch (error) {
    console.error("Unwatch error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
