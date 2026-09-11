import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { canModifyTask } from "@/lib/rbac";
import { pusherServer } from "@/lib/pusher";

const CommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string; id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await canModifyTask(user.id, params.workspaceId, params.id);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const result = CommentSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const { content } = result.data;

    // 1. Create Comment
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: params.id,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 2. Parse @mentions (e.g. @John Doe, @alice)
    const mentionRegex = /@([a-zA-Z0-9_ -]+)/g;
    const matches = Array.from(content.matchAll(mentionRegex)).map(m => m[1].trim().toLowerCase());
    
    if (matches.length > 0) {
      // Find workspace members matching the names
      const mentionedUsers = await prisma.membership.findMany({
        where: {
          workspaceId: params.workspaceId,
          user: {
            name: {
              in: matches,
              mode: 'insensitive' // Requires PG case-insensitive or similar, though Prisma `mode: 'insensitive'` works for Postgres
            }
          }
        },
        include: { user: true }
      });

      // 3. Create Notifications
      const notifications = [];
      for (const member of mentionedUsers) {
        if (member.userId === user.id) continue; // Don't notify self
        
        notifications.push({
          workspaceId: params.workspaceId,
          userId: member.userId,
          actorId: user.id,
          type: "MENTION",
          title: "You were mentioned",
          message: `${user.name} mentioned you in a comment.`,
          taskId: params.id,
        });
      }

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications,
        });

        // Emit pusher events
        for (const notif of notifications) {
          pusherServer.trigger(
            `private-workspace-${params.workspaceId}-user-${notif.userId}`,
            'notification:new',
            notif
          );
        }
      }
    }

    // Emit comment event
    pusherServer.trigger(
      `private-task-${params.id}`,
      'comment:new',
      comment
    );

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    console.error("Comment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const comments = await prisma.comment.findMany({
      where: { taskId: params.id },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error("Fetch Comments Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
