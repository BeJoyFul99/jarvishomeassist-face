"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Decodes the JWT expiry (seconds since epoch) from the token string.
 */
function getExp(jwt: string): number | null {
  try {
    const payload = JSON.parse(
      atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is expired or will expire within `bufferMs`.
 */
function isTokenExpired(token: string | null, bufferMs = 30_000): boolean {
  if (!token) return true;
  const exp = getExp(token);
  if (!exp) return true;
  return exp * 1000 - Date.now() < bufferMs;
}

/**
 * Attempts to refresh the token with deduplication (so concurrent 401s
 * don't fire multiple refresh requests).
 */
async function tryRefresh(): Promise<boolean> {
  const store = useAuthStore.getState();
  if (!store.refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = store.refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Global hook that ensures the user stays logged in when their JWT expires.
 *
 * Two strategies work together:
 *
 * 1. **Fetch interceptor** — wraps `window.fetch` to detect 401 responses.
 *    On 401 it transparently refreshes the token and retries the original
 *    request exactly once. This covers every `fetch()` call in the app
 *    without requiring each page to use a special helper.
 *
 * 2. **Visibility-change check** — when the user returns to the tab
 *    (e.g. after laptop sleep) we eagerly check if the token is expired
 *    and refresh it proactively, before any API call even has a chance
 *    to fail.
 */
export function useAuthInterceptor() {
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    // Only patch once
    if (originalFetchRef.current) return;

    const originalFetch = window.fetch.bind(window);
    originalFetchRef.current = originalFetch;

    window.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const store = useAuthStore.getState();

      // If the token is already known to be expired, refresh before sending
      if (store.token && isTokenExpired(store.token)) {
        await tryRefresh();
      }

      // Inject current token into the request
      const headers = new Headers(init?.headers);
      const currentToken = useAuthStore.getState().token;
      if (currentToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      let res = await originalFetch(input, { ...init, headers });

      // If 401, try refresh + retry once
      if (res.status === 401 && useAuthStore.getState().refreshToken) {
        // Don't try to refresh auth endpoints themselves
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
          return res;
        }

        const refreshed = await tryRefresh();
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          const retryHeaders = new Headers(init?.headers);
          if (newToken) {
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
          }
          res = await originalFetch(input, { ...init, headers: retryHeaders });
        }
      }

      return res;
    };

    return () => {
      // Restore original fetch on unmount (won't normally happen since this
      // hook lives in the root layout, but good practice)
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  // ── Visibility-change: refresh eagerly when user returns to tab ──
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      const { token, refreshToken, isAuthenticated } =
        useAuthStore.getState();
      if (!isAuthenticated || !refreshToken) return;

      if (isTokenExpired(token, 60_000)) {
        // Token expired or about to expire within 1 minute — refresh now
        tryRefresh();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);
}
