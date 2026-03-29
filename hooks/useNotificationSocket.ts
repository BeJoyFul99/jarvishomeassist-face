import { useEffect } from "react";
import { chatSocket } from "@/lib/chatSocket";
import { useNotificationStore } from "@/store/useNotificationStore";

/**
 * Listens for real-time notification events over the shared WebSocket connection.
 * Adds server-pushed notifications to the store for instant display.
 */
export function useNotificationSocket() {
  const addServerNotification = useNotificationStore(
    (s) => s.addServerNotification,
  );

  useEffect(() => {
    return chatSocket.subscribe((msg) => {
      if (msg.type === "notification:new" && msg.data) {
        addServerNotification(msg.data);
      }
    });
  }, [addServerNotification]);
}
