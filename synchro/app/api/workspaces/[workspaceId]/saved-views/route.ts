import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";
import { z } from "zod";

const SavedViewSchema = z.object({
  name: z.string().min(1).max(50),
  query: z.any() // JSON object representing the filter configuration
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });

    const body = await req.json();
    const result = SavedViewSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid data", details: result.error.errors } }, { status: 400 });
    }

    const { name, query } = result.data;
    const { workspaceId } = await params;

    const membership = await getWorkspaceMembership(user.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this workspace",
          },
        },
        { status: 403 }
      );
    }

    const savedView = await prisma.savedView.create({
      data: {
        name,
        query,
        userId: user.id,
        workspaceId,
      },
    });

    return NextResponse.json({ success: true, data: savedView });
  } catch (error) {
    console.error("SavedView Create Error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal Server Error" } }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });

    const { workspaceId } = await params;

    const membership = await getWorkspaceMembership(user.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this workspace",
          },
        },
        { status: 403 }
      );
    }

    const savedViews = await prisma.savedView.findMany({
      where: {
        workspaceId,
        userId: user.id, // Only user's own saved views
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: savedViews });
  } catch (error) {
    console.error("Fetch SavedViews Error:", error);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal Server Error" } }, { status: 500 });
  }
}
