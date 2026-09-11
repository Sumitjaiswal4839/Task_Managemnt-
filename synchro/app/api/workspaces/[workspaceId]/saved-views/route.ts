import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const SavedViewSchema = z.object({
  name: z.string().min(1).max(50),
  query: z.any() // JSON object representing the filter configuration
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const result = SavedViewSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { name, query } = result.data;

    const savedView = await prisma.savedView.create({
      data: {
        name,
        query,
        userId: user.id,
        workspaceId: params.workspaceId,
      },
    });

    return NextResponse.json({ success: true, data: savedView });
  } catch (error) {
    console.error("SavedView Create Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const savedViews = await prisma.savedView.findMany({
      where: {
        workspaceId: params.workspaceId,
        userId: user.id, // Only user's own saved views
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: savedViews });
  } catch (error) {
    console.error("Fetch SavedViews Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
