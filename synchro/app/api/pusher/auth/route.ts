import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import { getSession } from "@/lib/auth";
import { getWorkspaceMembership } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.formData();
    const socketId = data.get("socket_id") as string;
    const channelName = data.get("channel_name") as string;

    if (!socketId || !channelName) {
      return new NextResponse("Missing socket_id or channel_name", { status: 400 });
    }

    if (channelName.startsWith("private-workspace-")) {
      const workspaceId = channelName.replace("private-workspace-", "");
      
      const membership = await getWorkspaceMembership(session.id, workspaceId);
      if (!membership) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher Auth Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
