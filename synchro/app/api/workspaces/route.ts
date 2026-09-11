import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { tasks: true, memberships: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        tasksCount: m.workspace._count.tasks,
        membersCount: m.workspace._count.memberships,
      })),
    });
  } catch (error) {
    console.error("Fetch workspaces error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch workspaces" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Workspace name must be at least 2 characters." } },
        { status: 400 }
      );
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Create workspace and assign creator as ADMIN
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          slug: uniqueSlug,
        },
      });

      await tx.membership.create({
        data: {
          userId: session.id,
          workspaceId: ws.id,
          role: Role.ADMIN,
        },
      });

      return ws;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: Role.ADMIN,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create workspace error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create workspace" } },
      { status: 500 }
    );
  }
}
