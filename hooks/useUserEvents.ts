"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sseClient, type SSEMessage } from "@/lib/sseClient";

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
 * Subscribes to user-related SSE events via the shared SSE client.
 * - Force-logout if the current user is locked/deleted/revoked
 * - Calls onRefresh when the user list should be refreshed
 */
export function useUserEvents(onRefresh?: RefreshCallback) {
  const { token, user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
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

    // Update SSE client token
    sseClient.setToken(token);

    const handler = (event: SSEMessage) => {
      // Skip non-user events
      if (event.type === "connected" || event.type === "status:update") return;

      const data = event.data as { user_id?: number; email?: string; role?: string };
      if (!data?.email) return;

      const isMe = data.email === user.email;

      // Force logout if current user is affected by a destructive event
      if (isMe && FORCE_LOGOUT_EVENTS.includes(event.type)) {
        const reasons: Record<string, string> = {
          "user:locked": "Your account has been locked by an administrator.",
          "user:deleted": "Your account has been deleted.",
          "user:tokens_revoked": "Your session has been revoked by an administrator.",
        };
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
    };

    const unsubscribe = sseClient.subscribe(handler);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, token, user, handleForceLogout]);
}
