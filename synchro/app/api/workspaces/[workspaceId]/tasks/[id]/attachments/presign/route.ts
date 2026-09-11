import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { generatePresignedPutUrl } from "@/lib/s3";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

// Strict allowlist for security
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv"
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { workspaceId, id: taskId } = await params;

    // Rate Limiting to prevent bucket abuse
    const rateLimit = await checkRateLimit(`presign-${session.id}`, { interval: 60000, maxRequests: 20 });
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for pre-signed URLs", { userId: session.id });
      return NextResponse.json(
        { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }

    // RBAC: Verify membership
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this workspace" } },
        { status: 403 }
      );
    }

    // Verify task belongs to workspace
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    // Parse requested file info
    const body = await req.json();
    const { mimeType } = body;

    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported file type" } },
        { status: 400 }
      );
    }

    // Securely generate server-side path to prevent manipulation
    const storageKey = `workspaces/${workspaceId}/tasks/${taskId}/attachments/${randomUUID()}`;

    // Get the AWS/R2 Put URL
    const uploadUrl = await generatePresignedPutUrl(storageKey, mimeType);

    logger.info("Pre-signed URL generated", { userId: session.id, storageKey });

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        storageKey,
      }
    });

  } catch (error) {
    logger.error("Pre-signed URL generation error", { error });
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to generate upload URL" } },
      { status: 500 }
    );
  }
}
