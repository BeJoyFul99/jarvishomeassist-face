import { useAuthStore } from "@/store/useAuthStore";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Fetch wrapper that automatically refreshes the session on 401 responses.
 * Auth tokens are in HttpOnly cookies — the browser attaches them automatically.
 * Uses a singleton refresh promise to avoid multiple concurrent refresh calls.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let res = await fetch(input, init);

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
      res = await fetch(input, init);
    }
  }

  return res;
}
