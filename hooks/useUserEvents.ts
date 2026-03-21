"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SSEEvent {
  type: string;
  data: {
    user_id: number;
    email: string;
    role?: string;
  };
}

// Events that should force-logout the affected user
const FORCE_LOGOUT_EVENTS = [
  "user:locked",
  "user:deleted",
  "user:tokens_revoked",
];

// Events that should trigger a user list refresh
const REFRESH_EVENTS = [
  "user:created",
  "user:updated",
  "user:deleted",
  "user:restored",
  "user:locked",
  "user:unlocked",
  "user:tokens_revoked",
  "user:pin_regenerated",
];

type RefreshCallback = () => void;

/**
 * Connects to the SSE stream and handles real-time user events.
 * - Force-logout if the current user is locked/deleted/revoked
 * - Calls onRefresh when the user list should be refreshed
 */
export function useUserEvents(onRefresh?: RefreshCallback) {
  const { token, user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const handleForceLogout = useCallback(
    (reason: string) => {
      toast.error(reason, { duration: 5000 });
      logout();
      router.replace("/login");
    },
    [logout, router],
  );

  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;

    // EventSource doesn't support custom headers, so we pass the token as a query param
    // and the SSE proxy route will handle it. But EventSource only sends cookies.
    // We need to use a custom approach with fetch + ReadableStream instead.
    let cancelled = false;

    const connect = async () => {
      try {
        const res = await fetch("/api/events", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE messages (lines starting with "data: ")
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event: SSEEvent = JSON.parse(jsonStr);

              // Skip the initial "connected" event
              if (event.type === "connected") continue;

              // Check if this event affects the current user
              const isMe = event.data.email === user.email;

              // Force logout if current user is affected by a destructive event
              if (isMe && FORCE_LOGOUT_EVENTS.includes(event.type)) {
                const reasons: Record<string, string> = {
                  "user:locked": "Your account has been locked by an administrator.",
                  "user:deleted": "Your account has been deleted.",
                  "user:tokens_revoked": "Your session has been revoked by an administrator.",
                };
                cancelled = true;
                reader.cancel();
                handleForceLogout(reasons[event.type] || "Your session has ended.");
                return;
              }

              // If current user's permissions were updated, notify them
              if (isMe && event.type === "user:updated") {
                toast.info("Your permissions have been updated. Please log in again for changes to take effect.", {
                  duration: 6000,
                });
              }

              // Trigger a list refresh for any user-related event
              if (REFRESH_EVENTS.includes(event.type)) {
                onRefreshRef.current?.();
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch {
        // Connection failed — retry after delay
        if (!cancelled) {
          setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, user, handleForceLogout]);
}
