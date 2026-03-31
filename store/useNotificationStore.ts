import { create } from "zustand";

export interface AppNotification {
  id: string | number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  category?: "system" | "reminder" | "device" | "energy";
  timestamp: string;
  read: boolean;
  nodeId?: string;
  nodeName?: string;
  actionUrl?: string;
  scheduledAt?: string;
  persisted?: boolean; // true if backed by the database
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;

  /** Add a local (transient) notification — used by fleet hooks */
  addNotification: (
    n: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => void;

  /** Add a notification that came from the backend (WebSocket or fetch) */
  addServerNotification: (raw: ServerNotification) => void;

  markAsRead: (id: string | number) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string | number) => void;

  /** Fetch persisted notifications from the API */
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;

  /** Create a reminder via the API */
  createReminder: (data: {
    title: string;
    message: string;
    scheduled_at: string;
    category?: string;
  }) => Promise<boolean>;
}

/** Shape of a notification from the Go backend */
interface ServerNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  action_url?: string | null;
  scheduled_at?: string | null;
  created_at: string;
}

let localCounter = 0;

function mapServerNotif(n: ServerNotification): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: (n.type as AppNotification["type"]) || "info",
    category: (n.category as AppNotification["category"]) || "system",
    timestamp: n.created_at,
    read: n.read,
    actionUrl: n.action_url ?? undefined,
    scheduledAt: n.scheduled_at ?? undefined,
    persisted: true,
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  addNotification: (n) => {
    const id = `local-${++localCounter}`;
    const newNotif: AppNotification = {
      ...n,
      id,
      timestamp: new Date().toISOString(),
      read: false,
      persisted: false,
    };
    const updated = [newNotif, ...get().notifications].slice(0, 100);
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });
  },

  addServerNotification: (raw) => {
    const notif = mapServerNotif(raw);
    // Avoid duplicates
    const exists = get().notifications.some((n) => n.persisted && n.id === notif.id);
    if (exists) return;

    const updated = [notif, ...get().notifications].slice(0, 100);
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });

    // If persisted, also tell the backend
    if (typeof id === "number") {
      fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      }).catch(() => {});
    }
  },

  markAllAsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });

    fetch("/api/notifications/read-all", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });

    fetch("/api/notifications", {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  },

  removeNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({
      notifications: updated,
      unreadCount: updated.filter((x) => !x.read).length,
    });

    if (typeof id === "number") {
      fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
  },

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/notifications?per_page=50");
      if (!res.ok) return;
      const data = await res.json();
      const serverNotifs: AppNotification[] = (data.notifications || []).map(mapServerNotif);

      // Merge: keep local (transient) notifications, replace server ones
      const locals = get().notifications.filter((n) => !n.persisted);
      const merged = [...locals, ...serverNotifs].slice(0, 100);
      set({
        notifications: merged,
        unreadCount: merged.filter((x) => !x.read).length,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      // Add local unread count to server count
      const localUnread = get().notifications.filter((n) => !n.persisted && !n.read).length;
      set({ unreadCount: (data.count || 0) + localUnread });
    } catch {
      // silent
    }
  },

  createReminder: async (data) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          type: "info",
          category: data.category || "reminder",
          scheduled_at: data.scheduled_at,
        }),
      });
      if (!res.ok) return false;
      const notif = await res.json();
      // If it was not scheduled (immediate), it will arrive via WebSocket
      // If scheduled, it's stored and will fire later — no need to add locally
      if (!data.scheduled_at) {
        get().addServerNotification(notif);
      }
      return true;
    } catch {
      return false;
    }
  },
}));
