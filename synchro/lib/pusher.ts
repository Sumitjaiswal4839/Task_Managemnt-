import PusherServer from "pusher";
import PusherClient from "pusher-js";

const required = {
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

let _pusherServer: PusherServer | null = null;

export const getPusherServer = (): PusherServer => {
  if (!_pusherServer) {
    const required = {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    };

    for (const [name, value] of Object.entries(required)) {
      if (!value) {
        throw new Error(`Missing Pusher environment variable: ${name}`);
      }
    }

    _pusherServer = new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return _pusherServer;
};

// Proxy to allow existing `pusherServer.trigger(...)` calls to continue working seamlessly
export const pusherServer: PusherServer = new Proxy({} as PusherServer, {
  get(_target, prop) {
    const server = getPusherServer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (server as any)[prop];
    if (typeof val === "function") {
      return val.bind(server);
    }
    return val;
  },
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
