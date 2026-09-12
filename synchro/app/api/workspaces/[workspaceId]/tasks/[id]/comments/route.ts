import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher";

const CommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, id } = await params;

    // Validate workspace membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = CommentSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const { content } = result.data;

    // Create Comment
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: id,
        authorId: user.id,
      },
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
    });

    // Detect @mentions
    const mentionRegex = /@([a-zA-Z0-9_ -]+)/g;
    const matches = Array.from(content.matchAll(mentionRegex)).map(m => m[1].trim().toLowerCase());
    
    if (matches.length > 0) {
      // Find workspace members matching the names
      const mentionedUsers = await prisma.membership.findMany({
        where: {
          workspaceId,
          user: {
            name: {
              in: matches,
              mode: 'insensitive'
            }
          }
        },
        include: { user: true }
      });

      for (const member of mentionedUsers) {
        if (member.userId === user.id) continue; // Don't notify self
        
        if (member?.user) {
          await prisma.notification.create({
            data: {
              userId: member.user.id,
              type: "MENTION",
              title: "You were mentioned",
              message: `${user.name} mentioned you in a comment.`,
              taskId: id,
              workspaceId: workspaceId,
            }
          });

          // Trigger realtime Pusher notification for the mentioned user
          await pusherServer.trigger(
            `user-${member.user.id}`,
            "new-notification",
            {
              message: `${user.name} mentioned you in a comment.`,
              taskId: id,
            }
          );
        }
      }
    }

    // Trigger realtime Pusher event for the task's comment feed
    await pusherServer.trigger(
      `task-${id}`,
      "new-comment",
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
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, id } = await params;

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: { name: true, email: true },
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
