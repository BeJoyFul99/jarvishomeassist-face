import { create } from "zustand";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: string;
  read: boolean;
  nodeId?: string;
  nodeName?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  browserNotificationsEnabled: boolean;
  browserPermission: NotificationPermission | "default";
  addNotification: (
    n: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  setBrowserNotificationsEnabled: (v: boolean) => void;
  requestBrowserPermission: () => void;
}

let notifCount = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  browserNotificationsEnabled: false,
  browserPermission:
    typeof Notification !== "undefined" ? Notification.permission : "default",

  addNotification: (n) => {
    const id = `notif-${++notifCount}`;
    const newNotif: AppNotification = {
      ...n,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...get().notifications].slice(0, 100);
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });

    // Browser push notification
    if (
      get().browserNotificationsEnabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(n.title, {
          body: n.message,
          icon: "/favicon.ico",
          tag: id,
        });
      } catch {
        // Silent fail
      }
    }
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });
  },

  markAllAsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  removeNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });
  },

  setBrowserNotificationsEnabled: (v) =>
    set({ browserNotificationsEnabled: v }),

  requestBrowserPermission: () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => {
      set({ browserPermission: perm });
      if (perm === "granted") {
        set({ browserNotificationsEnabled: true });
      }
    });
  },
}));
