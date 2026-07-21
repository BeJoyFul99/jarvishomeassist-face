"use client";

import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, springItem } from "@/lib/motion";
import {
  ChevronLeft,
  Clock,
  Megaphone,
  Search,
  X,
  Pin,
  AlertTriangle,
  Pencil,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────

interface Author {
  id: number;
  display_name: string;
  email: string;
  role: string;
}

interface AnnouncementItem {
  id: number;
  author_id: number;
  author: Author;
  title: string;
  body: string;
  priority: string;
  category: string;
  pinned: boolean;
  edited_at: string | null;
  created_at: string;
  read_count: number;
  total_users: number;
  is_read?: boolean;
}

// ── Helpers ──────────────────────────────────────────────

function authHeaders() {
  return { "Content-Type": "application/json" };
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-cyan/10 text-cyan border-cyan/20",
  high: "bg-amber/10 text-amber border-amber/20",
  urgent: "bg-crimson/10 text-crimson border-crimson/20",
};

const categoryLabels: Record<string, string> = {
  general: "General",
  maintenance: "Maintenance",
  security: "Security",
  event: "Event",
};

const priorityIcon: Record<string, boolean> = {
  high: true,
  urgent: true,
};

// ── Animation variants ──────────────────────────────────

const container = staggerContainer(0.05);
const item = springItem;

const TABS = ["all", "general", "maintenance", "security", "event"];

// ── Component ────────────────────────────────────────────

export default function AnnouncementsPage() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AnnouncementItem | null>(null);

  // ── Fetch ────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements?per_page=100", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Mark read ────────────────────────────────────────

  const markRead = useCallback(
    async (id: number) => {
      try {
        await fetch(`/api/announcements/${id}/read`, {
          method: "POST",
          headers: authHeaders(),
        });
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)),
        );
      } catch {
        // silent fail
      }
    },
    [],
  );

  const handleSelect = (a: AnnouncementItem) => {
    setSelected(a);
    if (!a.is_read) {
      markRead(a.id);
    }
  };

  // ── Filters ──────────────────────────────────────────

  const filtered = useMemo(() => {
    return announcements
      .filter((a) => {
        const matchesSearch =
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
          filter === "all" || a.category === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [filter, search, announcements]);

  const { pinnedItems, regularItems } = useMemo(() => {
    const p: AnnouncementItem[] = [];
    const r: AnnouncementItem[] = [];
    filtered.forEach((a) => {
      if (a.pinned) p.push(a);
      else r.push(a);
    });
    return { pinnedItems: p, regularItems: r };
  }, [filtered]);

  // ── Priority ring color ──────────────────────────────

  const priorityBorderColor = (priority: string) => {
    if (priority === "urgent") return "ring-crimson/30";
    if (priority === "high") return "ring-amber/20";
    return "";
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-cyan transition-all"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
            Back to Jarvis
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan/10 rounded-xl border border-cyan/20 shrink-0">
              <Megaphone className="w-6 h-6 text-cyan" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight leading-tight">
                Household Updates
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Announcements from your household administrators.
              </p>
            </div>
          </div>
        </div>

        <div className="relative group w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-cyan transition-colors" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary/30 border-white/5 border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan/30 w-full transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative flex items-center p-1 bg-secondary/40 rounded-xl border border-white/5 w-max">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`relative px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap z-10 transition-colors duration-300 ${
                filter === t
                  ? "text-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative z-10">
                {t === "all" ? "All" : categoryLabels[t] || t}
              </span>
              {filter === t && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/5 rounded-lg border border-white/10"
                  transition={{
                    type: "spring",
                    bounce: 0.15,
                    duration: 0.5,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-5 rounded-xl border border-white/5 animate-pulse"
            >
              <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Section */}
          {pinnedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Pin className="w-3.5 h-3.5 text-cyan fill-cyan" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan/70">
                  Pinned Highlights
                </h2>
              </div>

              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-3"
              >
                {pinnedItems.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={item}
                    layoutId={`ann-${a.id}`}
                    onClick={() => handleSelect(a)}
                    className={`glass-card p-4 flex items-center gap-3 transition-colors cursor-pointer group ring-1 ring-cyan/20 hover:bg-white/5 ${priorityBorderColor(a.priority)}`}
                  >
                    <div className="p-2 rounded-lg bg-secondary text-cyan shrink-0 relative">
                      <Megaphone className="w-4 h-4" />
                      <Pin className="absolute -top-1 -right-1 w-2.5 h-2.5 text-cyan fill-cyan" />
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {a.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {a.author?.display_name || "Admin"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${priorityColors[a.priority]}`}
                          >
                            {a.priority}
                          </Badge>
                          {a.edited_at && (
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                              <Pencil className="w-2.5 h-2.5" /> edited
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {a.is_read && (
                          <Check className="w-3.5 h-3.5 text-cyan/50" />
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{" "}
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Regular Items Feed */}
          <div className="space-y-3">
            {regularItems.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Recent Activity
                </h2>
              </div>
            )}

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-3"
            >
              {regularItems.length > 0 ? (
                regularItems.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={item}
                    layoutId={`ann-${a.id}`}
                    onClick={() => handleSelect(a)}
                    className={`glass-card p-4 sm:p-5 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer group ${
                      a.is_read ? "opacity-70" : ""
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl bg-secondary ${
                        priorityIcon[a.priority]
                          ? "text-amber"
                          : "text-cyan"
                      } shrink-0`}
                    >
                      {priorityIcon[a.priority] ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Megaphone className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="text-base font-semibold text-foreground leading-tight">
                            {a.title}
                          </h3>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {a.author?.display_name || "Admin"}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${priorityColors[a.priority]}`}
                          >
                            {a.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-white/10"
                          >
                            {categoryLabels[a.category] || a.category}
                          </Badge>
                          {a.edited_at && (
                            <span className="text-[10px] text-muted-foreground/60 italic flex items-center gap-1">
                              <Pencil className="w-2.5 h-2.5" /> edited{" "}
                              {formatDistanceToNow(new Date(a.edited_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                          {a.is_read && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Read
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1.5 shrink-0">
                          <Clock className="w-3 h-3" />{" "}
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground/80 text-sm leading-relaxed line-clamp-2">
                        {a.body}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : pinnedItems.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="p-6 bg-secondary/20 rounded-full w-fit mx-auto border border-white/5">
                    <Search className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">
                      {announcements.length === 0
                        ? "No announcements yet"
                        : "No matches found"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {announcements.length === 0
                        ? "Announcements from admins will appear here."
                        : "Try adjusting your filters or search keywords."}
                    </p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              layoutId={`ann-${selected.id}`}
              className="glass-card w-full max-w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 relative shadow-2xl"
            >
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-secondary text-cyan">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
                    {selected.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan bg-cyan/5 w-fit px-2 py-1 rounded border border-cyan/10">
                      <Clock className="w-3 h-3" />{" "}
                      {formatDistanceToNow(new Date(selected.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-foreground/80">
                        {selected.author?.display_name || "Admin"}
                      </span>
                      <Badge
                        variant="outline"
                        className={priorityColors[selected.priority]}
                      >
                        {selected.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-white/10"
                      >
                        {categoryLabels[selected.category] ||
                          selected.category}
                      </Badge>
                    </div>
                    {selected.pinned && (
                      <span className="text-[10px] px-2 py-1 rounded bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Pin className="w-3 h-3 fill-cyan" /> Pinned
                      </span>
                    )}
                    {selected.edited_at && (
                      <span className="text-[10px] px-2 py-1 rounded bg-amber/10 text-amber border border-amber/20 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edited{" "}
                        {formatDistanceToNow(new Date(selected.edited_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {selected.body}
                </p>

                <div className="pt-4">
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    {selected.is_read
                      ? "Close"
                      : "Acknowledge & Close"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
