import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
  useTLS: true,
});

export const getPusherClient = () => {
  if (typeof window !== "undefined") {
    return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "key", {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
    });
  }
  return null;
};
