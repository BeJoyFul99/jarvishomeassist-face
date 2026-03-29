"use client";

import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNotificationStore,
  type AppNotification,
} from "@/store/useNotificationStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const typeConfig: Record<
  AppNotification["type"],
  { icon: typeof Info; color: string }
> = {
  info: { icon: Info, color: "text-cyan" },
  warning: { icon: AlertTriangle, color: "text-amber" },
  error: { icon: AlertCircle, color: "text-crimson" },
  success: { icon: CheckCircle2, color: "text-emerald" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) {
    // Future — for scheduled reminders
    const abs = Math.abs(diff);
    const m = Math.floor(abs / 60000);
    if (m < 60) return `in ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `in ${h}h`;
    return `in ${Math.floor(h / 24)}d`;
  }
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ReminderForm({ onClose }: { onClose: () => void }) {
  const createReminder = useNotificationStore((s) => s.createReminder);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [datetime, setDatetime] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !datetime) return;

    setSaving(true);
    const scheduledAt = new Date(datetime).toISOString();
    const ok = await createReminder({
      title,
      message,
      scheduled_at: scheduledAt,
    });
    setSaving(false);
    if (ok) onClose();
  };

  // Default to 1 hour from now
  const minDatetime = new Date(Date.now() + 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan" />
          New Reminder
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Reminder title"
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        maxLength={100}
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What should I remind you about?"
        rows={2}
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        maxLength={500}
      />

      <input
        type="datetime-local"
        value={datetime}
        onChange={(e) => setDatetime(e.target.value)}
        min={minDatetime}
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
      />

      <Button
        type="submit"
        disabled={saving || !title || !message || !datetime}
        className="w-full h-8 text-xs"
        size="sm"
      >
        {saving ? "Saving..." : "Set Reminder"}
      </Button>
    </form>
  );
}

export default function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const removeNotification = useNotificationStore(
    (s) => s.removeNotification,
  );

  const [showReminderForm, setShowReminderForm] = useState(false);
  const alertActive = unreadCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-lg transition-colors relative ${
            alertActive
              ? "text-volcano"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {alertActive && (
            <>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-volcano pulse-dot" />
              <span className="absolute -top-0.5 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-volcano text-[10px] font-mono font-bold text-foreground flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          )}
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[380px] p-0 bg-background/60 backdrop-blur-xl border-white/5 shadow-2xl shadow-black/40 animate-in slide-in-from-top-2"
        align="center"
        alignOffset={0}
        sideOffset={8}
        collisionPadding={16}
      >
        {showReminderForm ? (
          <ReminderForm onClose={() => setShowReminderForm(false)} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-volcano/15 text-volcano">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowReminderForm(true)}
                  title="Set a reminder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={clearAll}
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <Separator className="bg-white/5" />

            {/* List */}
            <ScrollArea className="max-h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No notifications yet</p>
                  <button
                    onClick={() => setShowReminderForm(true)}
                    className="mt-2 text-[11px] text-cyan hover:underline"
                  >
                    Set a reminder
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => {
                    const isReminder = n.category === "reminder";
                    const cfg = typeConfig[n.type];
                    const Icon = isReminder ? Clock : cfg.icon;
                    const iconColor = isReminder ? "text-cyan" : cfg.color;

                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`group flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer ${
                          !n.read ? "bg-secondary/30" : ""
                        }`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className={`mt-0.5 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground truncate">
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {timeAgo(n.timestamp)}
                            </span>
                            {n.nodeName && (
                              <span className="text-[10px] font-mono text-primary">
                                {n.nodeName}
                              </span>
                            )}
                            {isReminder && (
                              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-cyan/10 text-cyan">
                                reminder
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
