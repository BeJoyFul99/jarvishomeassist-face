"use client";

import { motion } from "framer-motion";
import { staggerContainer, springItem } from "@/lib/motion";
import {
  Cloud,
  Wifi,
  WifiOff,
  Clock,
  Megaphone,
  ChevronRight,
  Lightbulb,
  Pin,
  AlertTriangle,
  Check,
  Pencil,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useFleet } from "@/hooks/useFleet";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import PomodoroRing from "@/components/home/PomodoroRing";
import EnergyHeatmap from "@/components/home/EnergyHeatmap";
import WeatherWidget from "@/components/home/WeatherWidget";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

function authHeaders() {
  return { "Content-Type": "application/json" };
}

const container = staggerContainer(0.08);
const item = springItem;

const QUICK_LINKS = [
  {
    label: "Smart Home",
    icon: Lightbulb,
    path: "/home/devices",
    color: "text-amber",
  },
  { label: "Network", icon: Wifi, path: "/home/network", color: "text-cyan" },
  {
    label: "Media & Files",
    icon: Cloud,
    path: "/home/media",
    color: "text-magenta",
  },
];

const HomePage = () => {
  const { user } = useAuthStore();
  const { aggregated } = useFleet();
  const router = useRouter();
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  // null = unavailable (no permission / error) — card is hidden
  const [lights, setLights] = useState<{ on: number; total: number } | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch smart-device summary (hidden if the user lacks access) ──
  useEffect(() => {
    const fetchLights = async () => {
      try {
        const res = await fetch("/api/devices", { headers: authHeaders() });
        if (!res.ok) return;
        const devices: { online: boolean; state?: { on?: boolean } }[] =
          await res.json();
        setLights({
          on: devices.filter((d) => d.online && d.state?.on).length,
          total: devices.length,
        });
      } catch {
        // card stays hidden
      }
    };
    fetchLights();
  }, []);

  // ── Fetch announcements ────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await fetch("/api/announcements?per_page=10", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.announcements?.length > 0) {
        setAnnouncements(data.announcements);
      }
    } catch {
      // silent fail — widget gracefully shows empty
    } finally {
      setAnnouncementsLoading(false);
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

  // Handle manual scroll with non-passive listener to prevent page scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(e.deltaY) > 10) {
        handleScroll(e.deltaY);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [visibleIndex, announcements]);

  const handleScroll = (delta: number) => {
    if (announcements.length <= 1) return;
    setIsExpanded(false);
    if (delta > 0) {
      setVisibleIndex((prev) => (prev + 1) % announcements.length);
    } else {
      setVisibleIndex(
        (prev) => (prev - 1 + announcements.length) % announcements.length,
      );
    }
  };

  const getVisibleAnnouncements = () => {
    if (announcements.length === 0) return [];
    const items = [];
    const count = Math.min(3, announcements.length);
    for (let i = 0; i < count; i++) {
      items.push(announcements[(visibleIndex + i) % announcements.length]);
    }
    return items;
  };

  const displayName = user?.display_name || "User";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const now = new Date();

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="pt-2 p-4 md:p-6 max-w-7xl mx-auto space-y-4"
      >
        {/* Greeting */}
        <motion.div variants={item} className="space-y-0.5">
          <h1 className="text-2xl font-semibold text-foreground">
            {greeting}, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>

        {/* Status Cards */}
        <motion.div
          variants={item}
          className={`grid grid-cols-2 gap-3 ${lights ? "md:grid-cols-4" : "md:grid-cols-3"}`}
        >
          <WeatherWidget />

          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            className="glass-card relative overflow-hidden group"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none transition-colors duration-500 group-hover:bg-cyan-500/40"
            />
            <div className="relative z-10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan">
                {aggregated.onlineNodes > 0 ? (
                  <div className="relative">
                    <Wifi className="w-5 h-5 animate-pulse relative z-10" />
                    <div className="absolute inset-0 bg-cyan-500/30 blur animate-ping rounded-full" />
                  </div>
                ) : (
                  <WifiOff className="w-5 h-5" />
                )}
                <span className="text-xs font-mono text-muted-foreground">
                  Internet
                </span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {aggregated.onlineNodes > 0 ? "Online" : "Offline"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {aggregated.onlineNodes > 0
                  ? `${aggregated.onlineNodes} node${aggregated.onlineNodes === 1 ? "" : "s"} reachable`
                  : "No nodes reachable"}
              </p>
            </div>
          </motion.div>

          {lights && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              onClick={() => router.push("/home/devices")}
              className="glass-card relative overflow-hidden group text-left"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute -top-8 -right-8 w-32 h-32 bg-amber/20 rounded-full blur-3xl pointer-events-none transition-colors duration-500 group-hover:bg-amber/40"
              />
              <div className="relative z-10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber">
                  <Lightbulb className="w-5 h-5" />
                  <span className="text-xs font-mono text-muted-foreground">
                    Lights
                  </span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {lights.on} on
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lights.total} device{lights.total === 1 ? "" : "s"} total
                </p>
              </div>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            onClick={() => router.push("/home/announcements")}
            className="glass-card relative overflow-hidden group text-left"
          >
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute -bottom-10 -right-10 w-32 h-32 bg-magenta/20 rounded-full blur-3xl pointer-events-none transition-colors duration-500 group-hover:bg-magenta/40"
            />
            <div className="relative z-10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-magenta">
                <Megaphone className="w-5 h-5" />
                <span className="text-xs font-mono text-muted-foreground">
                  Updates
                </span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {announcementsLoading
                  ? "…"
                  : announcements.filter((a) => !a.is_read).length}{" "}
                unread
              </p>
              <p className="text-[11px] text-muted-foreground">
                Household announcements
              </p>
            </div>
          </motion.button>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 mt-2">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map((link) => (
              <motion.button
                key={link.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(link.path)}
                className="glass-card p-4 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-secondary ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">
                  {link.label}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Announcements Stack */}
        <motion.div variants={item} className="relative">
          <div className="flex items-center justify-between mb-3 mt-2">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Household Updates
            </h2>
            <motion.button
              whileHover={{ x: 3 }}
              onClick={() => router.push("/home/announcements")}
              className="text-[10px] uppercase tracking-wider text-cyan hover:text-cyan/80 font-bold flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </motion.button>
          </div>

          {announcementsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-card p-4 rounded-xl border border-white/5 animate-pulse"
                >
                  <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No announcements yet
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="h-[280px] relative overflow-hidden flex flex-col items-center w-full cursor-ns-resize touch-none"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {getVisibleAnnouncements().map(
                  (a: AnnouncementItem, i: number) => {
                    const isSingle = announcements.length === 1;
                    const isDouble = announcements.length === 2;
                    const visualIndex = isSingle ? 1 : isDouble ? (i === 0 ? 1 : 0) : i;
                    const isFocused = visualIndex === 1;

                    return (
                    <motion.div
                      key={a.id}
                      layout="position"
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => {
                        if (info.offset.y < -50) handleScroll(1);
                        if (info.offset.y > 50) handleScroll(-1);
                      }}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{
                        opacity: isFocused ? 1 : 0.4,
                        y: visualIndex === 0 ? 0 : visualIndex === 1 ? 80 : 160,
                        scale: isFocused ? 1 : 0.85,
                        zIndex: isFocused ? 30 : visualIndex === 0 ? 20 : 10,
                        filter: !isFocused ? "blur(1.5px)" : "blur(0px)",
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.8,
                        filter: "blur(4px)",
                      }}
                      transition={{
                        type: "tween",
                        ease: "circOut",
                        duration: 0.4,
                        opacity: { duration: 0.2 },
                      }}
                      onClick={() => {
                        if (isFocused) {
                          setIsExpanded(!isExpanded);
                        } else if (visualIndex === 0) {
                          handleScroll(-1);
                        } else {
                          handleScroll(1);
                        }
                      }}
                      className={`absolute w-full glass-card p-4 flex flex-col gap-4 text-left group overflow-hidden cursor-pointer ${
                        isFocused && isExpanded
                          ? "h-auto z-50 ring-1 ring-cyan/30"
                          : "h-[100px] z-20"
                      } ${isFocused ? "shadow-2xl" : "opacity-40"}`}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div
                          className={`p-2.5 rounded-xl bg-secondary ${
                            a.priority === "high" || a.priority === "urgent"
                              ? "text-amber-400"
                              : "text-cyan"
                          } group-hover:scale-110 transition-transform shrink-0 relative`}
                        >
                          {a.priority === "high" ||
                          a.priority === "urgent" ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <Megaphone className="w-5 h-5" />
                          )}
                          {a.pinned && (
                            <Pin className="absolute -top-1 -right-1 w-3 h-3 text-cyan fill-cyan" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {a.title}
                            </h4>
                            <div className="flex items-center gap-1">
                              {a.is_read && (
                                <span className="text-[7px] px-1 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20 font-bold uppercase">
                                  <Check className="w-2 h-2 inline" />
                                </span>
                              )}
                              {a.edited_at && (
                                <span className="text-[7px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                  <Pencil className="w-2 h-2 inline" />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground/70">
                              {a.author?.display_name || "Admin"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{" "}
                              {formatDistanceToNow(new Date(a.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                        {isFocused && (
                          <ChevronRight
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        )}
                      </div>

                      {isFocused && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 pt-2 border-t border-white/5"
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {a.body}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!a.is_read) {
                                  markRead(a.id);
                                  toast.success("Marked as read");
                                }
                                setIsExpanded(false);
                              }}
                              className="flex-1 py-2 rounded-lg bg-cyan text-black text-[10px] font-bold shadow-lg shadow-cyan/10 active:opacity-90 cursor-pointer"
                            >
                              {a.is_read ? "Dismiss" : "Acknowledge"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push("/home/announcements");
                              }}
                              className="px-4 py-2 rounded-lg bg-secondary text-foreground text-[10px] font-medium hover:bg-secondary/70 border border-white/5 cursor-pointer"
                            >
                              View All
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Focus timer + Energy */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
        >
          <PomodoroRing />
          <EnergyHeatmap />
        </motion.div>
      </motion.div>
    </>
  );
};

export default HomePage;
