import { useAuthStore } from "@/store/useAuthStore";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Fetch wrapper that automatically refreshes the JWT on 401 responses.
 * Uses a singleton refresh promise to avoid multiple concurrent refresh calls.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const store = useAuthStore.getState();

  // Attach current token
  const headers = new Headers(init?.headers);
  if (store.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${store.token}`);
  }

  let res = await fetch(input, { ...init, headers });

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && store.refreshToken) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = store.refresh().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry the original request with the new token
      const newStore = useAuthStore.getState();
      const retryHeaders = new Headers(init?.headers);
      if (newStore.token) {
        retryHeaders.set("Authorization", `Bearer ${newStore.token}`);
      }
      res = await fetch(input, { ...init, headers: retryHeaders });
    }
  }

  return res;
}
