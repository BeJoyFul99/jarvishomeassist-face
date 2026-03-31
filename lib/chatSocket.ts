"use client";
/**
 * Shared WebSocket connection manager for chat.
 * Opens a SINGLE WS connection to the Go backend and lets multiple
 * subscribers listen to chat events (messages, typing, AI streaming).
 *
 * Auth tokens are in HttpOnly cookies — the browser attaches them
 * automatically to the /api/chat/authorize request.
 *
 * Handles React StrictMode double-mount by debouncing connect/disconnect.
 */

type ChatWSListener = (event: ChatWSMessage) => void;

export interface ChatWSMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

/**
 * Derive the WebSocket origin from the backend URL or a dedicated WS env var.
 * The WebSocket connects directly through Cloudflare Tunnel to the Go backend
 * (not through Next.js API route proxy), so we only need the origin (host).
 */
function deriveWsUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_WS_URL || process.env.GO_BACKEND_URL;
  if (!raw) return "wss://api.angelandmomo.dpdns.org";

  try {
    const u = new URL(raw);
    const protocol = u.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${u.host}`;
  } catch {
    return "wss://api.angelandmomo.dpdns.org";
  }
}

const WS_URL = deriveWsUrl();

class ChatSocketClient {
  private listeners = new Set<ChatWSListener>();
  private ws: WebSocket | null = null;
  private active = false; // true when user is authenticated
  private connected = false;
  private connecting = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectDebounce: ReturnType<typeof setTimeout> | null = null;
  private disconnectDebounce: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

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

  /** Subscribe to all WS events. Returns an unsubscribe function. */
  subscribe(listener: ChatWSListener): () => void {
    this.listeners.add(listener);

    if (this.disconnectDebounce) {
      clearTimeout(this.disconnectDebounce);
      this.disconnectDebounce = null;
    }

    if (!this.connected && !this.connecting && this.active) {
      this.debouncedConnect();
    }

    return () => {
      this.listeners.delete(listener);
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

  /** Send a message through the WebSocket. */
  send(type: string, data: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, data }));
  }

  get isConnected() {
    return this.connected;
  }

  private notify(msg: ChatWSMessage) {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch {
        // listener error — don't break others
      }
    }
  }

  private debouncedConnect() {
    if (this.connectDebounce) return;
    this.connectDebounce = setTimeout(() => {
      this.connectDebounce = null;
      if (
        this.listeners.size > 0 &&
        this.active &&
        !this.connected &&
        !this.connecting
      ) {
        this.connect();
      }
    }, 50);
  }

  private disconnect() {
    this.connected = false;
    this.connecting = false;
    this.retryCount = 0;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.connectDebounce) {
      clearTimeout(this.connectDebounce);
      this.connectDebounce = null;
    }

    if (this.ws) {
      if (this.ws.readyState < 2) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private connect() {
    if (this.connecting || this.connected || !this.active) return;
    this.connecting = true;

    // Request a short-lived single-use ticket — cookies carry the JWT automatically
    fetch("/api/chat/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) {
          this.disconnect();
          return;
        }
        const body = await res.json();
        const ticket = body?.ticket;
        if (!ticket) {
          this.disconnect();
          return;
        }

        const url = `${WS_URL}/api/v1/chat/ws?ticket=${encodeURIComponent(
          ticket,
        )}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connected = true;
          this.connecting = false;
          this.retryCount = 0;
          this.notify({ type: "ws:connected", data: null });
        };

        this.ws.onmessage = (event) => {
          try {
            const parts = (event.data as string).split("\n").filter(Boolean);
            for (const part of parts) {
              const msg: ChatWSMessage = JSON.parse(part);
              this.notify(msg);
            }
          } catch {
            // ignore parse errors
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.connecting = false;
          this.ws = null;
          if (this.listeners.size > 0 && this.active) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = () => {};
      })
      .catch(() => {
        this.disconnect();
      });
  }

  private scheduleReconnect() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 15000);
    this.retryCount++;
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.listeners.size > 0 && this.active) {
        this.connect();
      }
    }, delay);
  }
}

// Singleton — one WS connection shared by all hooks
export const chatSocket = new ChatSocketClient();
