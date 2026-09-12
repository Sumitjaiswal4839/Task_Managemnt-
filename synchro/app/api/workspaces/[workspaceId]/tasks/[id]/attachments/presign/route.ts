import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "DEPRECATED",
        message: "Presigned URL route is deprecated. Please upload files directly to /api/workspaces/[workspaceId]/tasks/[id]/attachments using multipart/form-data (Cloudinary integration).",
      },
    },
    { status: 410 }
  );
}
