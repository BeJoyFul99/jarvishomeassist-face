"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { setupFetchInterceptor } from "@/lib/authFetch";

/**
 * Keep session fresh when user returns to the tab,
 * and intercept all fetch calls to refresh expired tokens.
 * HttpOnly cookies carry auth on each request.
 */
let lastRefreshAt = Date.now();
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

// Setup the global fetch interceptor to handle 401s immediately when module loads on client
if (typeof window !== "undefined") {
  setupFetchInterceptor();
}

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

