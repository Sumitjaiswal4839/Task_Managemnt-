"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, Circle } from "lucide-react";
import { useRouter } from "next/navigation";

export interface Notification {
  id: string;
  message: string;
  readAt: string | null;
  link?: string;
  createdAt: string;
}

export function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/notifications`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(notifications.map(n => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      try {
        await fetch(`/api/workspaces/${workspaceId}/notifications`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [notification.id] }),
        });
        setNotifications(notifications.map(n => n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }
    
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-300 transition hover:bg-slate-700/80 hover:text-white active:scale-95"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-slate-800/50 ${!notif.readAt ? "bg-slate-800/20" : ""}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {!notif.readAt ? (
                      <Circle className="h-2 w-2 fill-cyan-500 text-cyan-500" />
                    ) : (
                      <Check className="h-3 w-3 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm ${!notif.readAt ? "text-slate-200 font-medium" : "text-slate-400"}`}>
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
