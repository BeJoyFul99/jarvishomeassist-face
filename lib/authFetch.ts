import { useAuthStore } from "@/store/useAuthStore";

let refreshPromise: Promise<boolean> | null = null;
let originalFetch: typeof fetch | null = null;

/**
 * Setup a global fetch interceptor that automatically refreshes the session on 401 responses.
 * Auth tokens are in HttpOnly cookies — the browser attaches them automatically.
 * Uses a singleton refresh promise to avoid multiple concurrent refresh calls.
 */
export function setupFetchInterceptor() {
  if (typeof window === "undefined") return;
  if (originalFetch) return;

  originalFetch = window.fetch;

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Do not intercept auth endpoints to prevent infinite loops
    if (urlStr.includes("/api/auth/")) {
      return originalFetch!(input, init);
    }

    let res = await originalFetch!(input, init);

    // If 401, try refreshing the session via the HttpOnly refresh cookie
    if (res.status === 401) {
      const store = useAuthStore.getState();

      if (!refreshPromise) {
        refreshPromise = store.refresh().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;

      if (refreshed) {
        // Retry the original request — new cookies are already set
        res = await originalFetch!(input, init);
      }
    }

    return res;
  };
}
