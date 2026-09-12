import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv"
];

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

    const task = await prisma.task.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found in this workspace" } },
        { status: 404 }
      );
    }

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

    const task = await prisma.task.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found in this workspace" } },
        { status: 404 }
      );
    }

    // Rate Limit check
    const rateLimit = await checkRateLimit(`attachments-upload-${session.id}`, { interval: 60000, maxRequests: 20 });
    if (!rateLimit.success) {
      logger.warn("Rate limit exceeded for attachments upload", { userId: session.id });
      return NextResponse.json({ success: false, error: { code: "TOO_MANY_REQUESTS" } }, { status: 429 });
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. Multipart Form Data (Direct File Upload to Cloudinary)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
          { status: 400 }
        );
      }

      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "File exceeds 10MB limit" } },
          { status: 400 }
        );
      }

      const fileMime = file.type || "application/octet-stream";
      if (!ALLOWED_MIME_TYPES.includes(fileMime)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported file type" } },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary under folder 'synchro/attachments'
      const uploadResult = await uploadToCloudinary(buffer, file.name, "synchro/attachments");

      const attachment = await prisma.attachment.create({
        data: {
          taskId: id,
          uploadedById: session.id,
          originalName: file.name,
          storageKey: uploadResult.secure_url,
          mimeType: fileMime,
          size: uploadResult.bytes || file.size,
        },
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      });

      logger.info("Attachment uploaded to Cloudinary", {
        attachmentId: attachment.id,
        taskId: id,
        userId: session.id,
      });

      return NextResponse.json({ success: true, data: attachment }, { status: 201 });
    }

    // 2. Fallback / Direct JSON payload (e.g. metadata or tests)
    const body = await req.json().catch(() => null);
    if (!body || !body.storageKey || !body.originalName || !body.mimeType) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Missing required metadata or file" } },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachment.create({
      data: {
        taskId: id,
        uploadedById: session.id,
        originalName: body.originalName,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        size: body.size || 1024,
      },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    logger.error("Attachment upload error", { error });
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to upload attachment" } }, { status: 500 });
  }
}
