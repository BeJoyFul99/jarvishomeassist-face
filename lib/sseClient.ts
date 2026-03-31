/**
 * Shared SSE connection manager.
 * Opens a SINGLE connection to /api/events and lets multiple subscribers
 * listen to different event types through the same stream.
 *
 * Auth tokens are in HttpOnly cookies — the browser attaches them automatically.
 *
 * Handles React StrictMode double-mount by debouncing connect/disconnect.
 */

type SSEListener = (event: SSEMessage) => void;

export interface SSEMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

class SSEClient {
  private listeners = new Set<SSEListener>();
  private controller: AbortController | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectDebounce: ReturnType<typeof setTimeout> | null = null;
  private disconnectDebounce: ReturnType<typeof setTimeout> | null = null;
  private active = false; // true when user is authenticated
  private connected = false;
  private connecting = false;

  /** Signal whether the user is authenticated. Reconnects on change. */
  setAuthenticated(authenticated: boolean) {
    if (this.active === authenticated) return;
    this.active = authenticated;
    if (!authenticated) {
      this.disconnect();
    } else if (this.listeners.size > 0 && !this.connected && !this.connecting) {
      this.debouncedConnect();
    }
  }

  /** Subscribe to all SSE events. Returns an unsubscribe function. */
  subscribe(listener: SSEListener): () => void {
    this.listeners.add(listener);

    // Cancel any pending disconnect
    if (this.disconnectDebounce) {
      clearTimeout(this.disconnectDebounce);
      this.disconnectDebounce = null;
    }

    // Start connection if not already connected
    if (!this.connected && !this.connecting && this.active) {
      this.debouncedConnect();
    }

    return () => {
      this.listeners.delete(listener);
      // Use a grace period before disconnecting (handles StrictMode unmount/remount)
      if (this.listeners.size === 0) {
        this.disconnectDebounce = setTimeout(() => {
          this.disconnectDebounce = null;
          if (this.listeners.size === 0) {
            this.disconnect();
          }
        }, 1000);
      }
    };
  }

  private notify(msg: SSEMessage) {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch {
        // listener error — don't break others
      }
    }
  }

  /** Debounce connect to coalesce rapid subscribe calls */
  private debouncedConnect() {
    if (this.connectDebounce) return; // already scheduled
    this.connectDebounce = setTimeout(() => {
      this.connectDebounce = null;
      if (this.listeners.size > 0 && this.active && !this.connected && !this.connecting) {
        this.connect();
      }
    }, 50);
  }

  private disconnect() {
    this.connected = false;
    this.connecting = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.connectDebounce) {
      clearTimeout(this.connectDebounce);
      this.connectDebounce = null;
    }
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  private async connect() {
    if (this.connecting || this.connected || !this.active) return;
    this.connecting = true;

    this.controller = new AbortController();

    try {
      // Cookies carry the JWT automatically — no manual Authorization header
      const res = await fetch("/api/events", {
        headers: { Accept: "text/event-stream" },
        signal: this.controller.signal,
      });

      if (!res.ok || !res.body) {
        this.connecting = false;
        this.scheduleReconnect(5000);
        return;
      }

      this.connected = true;
      this.connecting = false;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const msg: SSEMessage = JSON.parse(jsonStr);
            this.notify(msg);
          } catch {
            // ignore parse errors
          }
        }
      }

      // Stream ended naturally
      this.connected = false;
      if (this.listeners.size > 0) {
        this.scheduleReconnect(3000);
      }
    } catch {
      // Connection failed or aborted
      this.connected = false;
      this.connecting = false;
      if (this.listeners.size > 0 && this.active) {
        this.scheduleReconnect(5000);
      }
    }
  }

  private scheduleReconnect(ms: number) {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.listeners.size > 0 && this.active) {
        this.connect();
      }
    }, ms);
  }
}

// Singleton — one connection shared by all hooks
export const sseClient = new SSEClient();
