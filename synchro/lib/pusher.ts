import PusherServer from "pusher";
import PusherClient from "pusher-js";

const required = {
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

// Fail-closed validation for server-side
if (typeof window === "undefined") {
  for (const [name, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing Pusher environment variable: ${name}`);
    }
  }
}

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const getPusherClient = () => {
  if (typeof window !== "undefined") {
    return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return null;
};
