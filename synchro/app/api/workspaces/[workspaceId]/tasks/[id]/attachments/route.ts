import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";
import { verifyObjectExists } from "@/lib/s3";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { workspaceId, id } = await params;
    const membership = await getWorkspaceMembership(session.id, workspaceId);
    if (!membership) return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

    const attachments = await prisma.attachment.findMany({
      where: { taskId: id },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: attachments });
  } catch {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

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

    // Rate Limit check
    const rateLimit = await checkRateLimit(`attachments-meta-${session.id}`, { interval: 60000, maxRequests: 20 });
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for attachments metadata", { userId: session.id });
      return NextResponse.json({ success: false, error: { code: "TOO_MANY_REQUESTS" } }, { status: 429 });
    }

    const body = await req.json();
    const { storageKey, originalName, mimeType } = body;

    if (!storageKey || !originalName || !mimeType) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing required metadata" } }, { status: 400 });
    }

    // Security Check: Ensure the storage key matches the expected format for THIS workspace and task
    if (!storageKey.startsWith(`workspaces/${workspaceId}/tasks/${id}/attachments/`)) {
      logger.warn("Storage key spoofing attempt", { userId: session.id, providedKey: storageKey });
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Invalid storage key for this task" } }, { status: 403 });
    }

    // Verify the object actually exists in R2
    const verification = await verifyObjectExists(storageKey);
    if (!verification.success || !verification.size || !verification.contentType) {
      logger.error("R2 Verification Failed", { storageKey, error: verification.error });
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "File not found in storage bucket" } }, { status: 404 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (verification.size > MAX_SIZE) {
      logger.error("File exceeds maximum allowed size", { storageKey, size: verification.size });
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "File exceeds 10MB limit" } }, { status: 400 });
    }

    const ALLOWED_MIME_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/csv"
    ];

    if (!ALLOWED_MIME_TYPES.includes(verification.contentType)) {
      logger.error("Invalid file content type", { storageKey, contentType: verification.contentType });
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported file type" } }, { status: 400 });
    }

    // S3 verification passed, safe to create DB record
    const attachment = await prisma.attachment.create({
      data: {
        taskId: id,
        uploadedById: session.id,
        originalName: originalName,
        storageKey: storageKey,
        mimeType: mimeType,
        size: verification.size, // Trust the size from R2, not the client
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } }
    });

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    logger.error("Attachment metadata error", { error });
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}
