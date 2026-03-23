"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  Loader2,
  RefreshCw,
  Radio,
  CircleOff,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowDown,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
}

interface LogPage {
  entries: LogEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  info:  { bg: "bg-cyan/10",    text: "text-cyan" },
  warn:  { bg: "bg-amber/10",   text: "text-amber" },
  error: { bg: "bg-crimson/10", text: "text-crimson" },
  debug: { bg: "bg-muted",      text: "text-muted-foreground" },
};

const formatTime = (ts: string) => {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts;
  }
};

const formatDate = (ts: string) => {
  try {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

export default function LogsPage() {
  const token = useAuthStore((s) => s.token);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(100);

  // Filters
  const [levelFilter, setLevelFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // SSE streaming
  const [streaming, setStreaming] = useState(false);
  const [streamLogs, setStreamLogs] = useState<LogEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  // ── Paginated fetch ──────────────────────────────────────

  const fetchLogs = useCallback(async (p: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: String(perPage),
      });
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (componentFilter) params.set("component", componentFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/logs?${params}`, { headers: authHeaders(), cache: "no-store" });
      if (res.ok) {
        const data: LogPage = await res.json();
        setLogs(data.entries || []);
        setTotalPages(data.total_pages || 1);
        setTotal(data.total || 0);
        setPage(data.page || 1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, perPage, levelFilter, componentFilter, searchQuery, authHeaders]);

  useEffect(() => {
    if (!streaming) fetchLogs(1);
  }, [levelFilter, componentFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!streaming) fetchLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll every 5s when not streaming
  useEffect(() => {
    if (streaming) return;
    const interval = setInterval(() => fetchLogs(page), 5000);
    return () => clearInterval(interval);
  }, [streaming, page, fetchLogs]);

  // ── SSE streaming ────────────────────────────────────────

  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) return;

    // We can't set auth headers on EventSource natively, so use fetch-based SSE
    const controller = new AbortController();

    const connect = async () => {
      try {
        const res = await fetch("/api/admin/logs/stream", {
          headers: {
            ...authHeaders(),
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6).trim();
              if (!payload) continue;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.type === "connected") continue;
                if (parsed.timestamp) {
                  setStreamLogs((prev) => [...prev.slice(-999), parsed as LogEntry]);
                }
              } catch {
                // ignore bad JSON
              }
            }
          }
        }
      } catch {
        // aborted or error
      }
    };

    connect();
    setStreaming(true);

    // Store controller for cleanup
    eventSourceRef.current = { close: () => controller.abort() } as unknown as EventSource;
  }, [authHeaders]);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Auto-scroll stream container
  useEffect(() => {
    if (autoScroll && streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [streamLogs, autoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const toggleStreaming = () => {
    if (streaming) {
      stopStreaming();
      fetchLogs(1);
    } else {
      setStreamLogs([]);
      startStreaming();
    }
  };

  // ── Render helpers ───────────────────────────────────────

  const renderLogRow = (entry: LogEntry, idx: number) => {
    const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.debug;
    return (
      <div
        key={`${entry.timestamp}-${idx}`}
        className="flex items-start gap-3 px-4 py-1.5 hover:bg-secondary/30 font-mono text-xs border-b border-border/30 last:border-0"
      >
        <span className="text-muted-foreground shrink-0 w-16">{formatTime(entry.timestamp)}</span>
        <span className={`shrink-0 w-12 px-1.5 py-0.5 rounded text-center text-[10px] font-semibold uppercase ${style.bg} ${style.text}`}>
          {entry.level}
        </span>
        <span className="shrink-0 w-20 text-primary truncate">{entry.component}</span>
        <span className="text-foreground flex-1 break-all">{entry.message}</span>
      </div>
    );
  };

  const displayLogs = streaming ? streamLogs : logs;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan" /> Server Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            {streaming ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                Live streaming — {streamLogs.length} entries
              </span>
            ) : (
              `${total} total entries`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStreaming}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              streaming
                ? "bg-emerald/10 text-emerald border border-emerald/20 hover:bg-emerald/20"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {streaming ? <Radio className="w-3.5 h-3.5" /> : <CircleOff className="w-3.5 h-3.5" />}
            {streaming ? "Live" : "Stream"}
          </button>

          {!streaming && (
            <button
              onClick={() => fetchLogs(page)}
              className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters (only show when not streaming) */}
      {!streaming && (
        <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-9 h-8 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value)}
            placeholder="Component..."
            className="w-32 h-8 text-xs"
          />
        </motion.div>
      )}

      {/* Log output */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        {loading && !streaming ? (
          <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading logs...</span>
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="text-center p-12 text-sm text-muted-foreground">
            {streaming ? "Waiting for new log entries..." : "No log entries found."}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/20 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="w-16">Time</span>
              <span className="w-12 text-center">Level</span>
              <span className="w-20">Component</span>
              <span className="flex-1">Message</span>
            </div>

            {/* Log entries */}
            <div
              ref={streamContainerRef}
              className={`overflow-y-auto ${streaming ? "max-h-[calc(100vh-320px)]" : "max-h-[calc(100vh-380px)]"}`}
              onScroll={() => {
                if (streaming && streamContainerRef.current) {
                  const el = streamContainerRef.current;
                  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                  setAutoScroll(atBottom);
                }
              }}
            >
              {displayLogs.map((entry, i) => renderLogRow(entry, i))}
            </div>

            {/* Auto-scroll indicator for streaming */}
            {streaming && !autoScroll && (
              <div className="border-t border-border px-4 py-2 flex justify-center">
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    if (streamContainerRef.current) {
                      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                >
                  <ArrowDown className="w-3 h-3" /> Scroll to bottom
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Pagination (only when not streaming) */}
      {!streaming && totalPages > 1 && (
        <motion.div variants={item} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Newer
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Older <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
