/**
 * Shared WebSocket connection manager for chat.
 * Opens a SINGLE WS connection to the Go backend and lets multiple
 * subscribers listen to chat events (messages, typing, AI streaming).
 *
 * Handles React StrictMode double-mount by debouncing connect/disconnect.
 */

type ChatWSListener = (event: ChatWSMessage) => void;

export interface ChatWSMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

class ChatSocketClient {
  private listeners = new Set<ChatWSListener>();
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private connected = false;
  private connecting = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectDebounce: ReturnType<typeof setTimeout> | null = null;
  private disconnectDebounce: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

  /** Set or update the JWT token. Reconnects if changed. */
  setToken(token: string | null) {
    if (this.token === token) return;
    this.token = token;
    if (!token) {
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

    if (!this.connected && !this.connecting && this.token) {
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
      if (this.listeners.size > 0 && this.token && !this.connected && !this.connecting) {
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
      this.ws.close();
      this.ws = null;
    }
  }

  private connect() {
    if (this.connecting || this.connected || !this.token) return;
    this.connecting = true;

    const url = `${WS_URL}/api/v1/chat/ws?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.connecting = false;
      this.retryCount = 0;
      this.notify({ type: "ws:connected", data: null });
    };

    this.ws.onmessage = (event) => {
      try {
        // The server may batch messages separated by newlines
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
      if (this.listeners.size > 0 && this.token) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, handling reconnection
    };
  }

  private scheduleReconnect() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 15000);
    this.retryCount++;
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.listeners.size > 0 && this.token) {
        this.connect();
      }
    }, delay);
  }
}

// Singleton — one WS connection shared by all hooks
export const chatSocket = new ChatSocketClient();
