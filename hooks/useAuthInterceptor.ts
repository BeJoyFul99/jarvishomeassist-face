"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Keep session fresh when user returns to the tab.
 * HttpOnly cookies already carry auth on each request.
 * This hook only does proactive refresh after inactivity.
 */
let lastRefreshAt = Date.now();
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export function useAuthInterceptor() {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      const elapsed = Date.now() - lastRefreshAt;
      if (elapsed >= REFRESH_INTERVAL_MS) {
        lastRefreshAt = Date.now();
        void useAuthStore.getState().refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, []);
}

// Intentionally no fetch monkey-patching.
// Cookie auth keeps the network layer clean.
