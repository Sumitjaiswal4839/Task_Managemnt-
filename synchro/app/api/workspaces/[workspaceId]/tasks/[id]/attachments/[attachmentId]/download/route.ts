import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { generatePresignedGetUrl } from "@/lib/s3";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string; attachmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { workspaceId, id: taskId, attachmentId } = await params;

    const rateLimit = await checkRateLimit(`download-${session.id}`, { interval: 60000, maxRequests: 50 });
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for downloads", { userId: session.id });
      return NextResponse.json({ success: false, error: { code: "TOO_MANY_REQUESTS" } }, { status: 429 });
    }

    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId: taskId,
        task: {
          workspaceId: workspaceId,
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Attachment not found" } }, { status: 404 });
    }

    const downloadUrl = await generatePresignedGetUrl(attachment.storageKey);

    // Redirect the user to the secure S3 URL so the file downloads
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    logger.error("Download URL generation error", { error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to generate download URL" } },
      { status: 500 }
    );
  }
}
