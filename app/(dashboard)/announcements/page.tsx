"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Eye,
  Users,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { formatDistanceToNow, format } from "date-fns";

// ── Types ────────────────────────────────────────────────

interface Author {
  id: number;
  display_name: string;
  email: string;
  role: string;
}

interface ReadReceipt {
  id: number;
  user_id: number;
  announcement_id: number;
  read_at: string;
  user: {
    id: number;
    display_name: string;
    email: string;
  };
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
  reads?: ReadReceipt[];
  is_read?: boolean;
}

// ── Helpers ──────────────────────────────────────────────

function authHeaders(token: string | null) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-cyan/10 text-cyan border-cyan/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
};

const categoryLabels: Record<string, string> = {
  general: "General",
  maintenance: "Maintenance",
  security: "Security",
  event: "Event",
};

// ── Component ────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
  const token = useAuthStore((s) => s.token);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [readReceipts, setReadReceipts] = useState<Record<number, ReadReceipt[]>>({});

  // Form state
  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "normal",
    category: "general",
    pinned: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?page=${page}&per_page=20`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const fetchReadReceipts = async (announcementId: number) => {
    try {
      const res = await fetch(`/api/admin/announcements/${announcementId}/reads`, {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setReadReceipts((prev) => ({ ...prev, [announcementId]: data.reads || [] }));
      }
    } catch {
      toast.error("Failed to load read receipts");
    }
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!readReceipts[id]) {
        fetchReadReceipts(id);
      }
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", body: "", priority: "normal", category: "general", pinned: false });
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementItem) => {
    setEditing(a);
    setForm({
      title: a.title,
      body: a.body,
      priority: a.priority,
      category: a.category,
      pinned: a.pinned,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSubmitting(true);
    try {
      const url = editing
        ? `/api/admin/announcements/${editing.id}`
        : "/api/admin/announcements";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editing ? "Announcement updated" : "Announcement published");
        setDialogOpen(false);
        fetchAnnouncements();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save announcement");
      }
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (res.ok) {
        toast.success("Announcement deleted");
        fetchAnnouncements();
      } else {
        toast.error("Failed to delete announcement");
      }
    } catch {
      toast.error("Failed to delete announcement");
    } finally {
      setDeleteTarget(null);
    }
  };

  const togglePin = async (a: AnnouncementItem) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ pinned: !a.pinned }),
      });
      if (res.ok) {
        toast.success(a.pinned ? "Unpinned" : "Pinned");
        fetchAnnouncements();
      }
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  const filteredAnnouncements = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.body.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Megaphone className="w-6 h-6 md:w-8 md:h-8 text-cyan" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                Announcements
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-1">
                Publish and manage household announcements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary/30 border-white/5"
            />
          </div>
          <Button onClick={openCreate} className="gap-2 bg-cyan hover:bg-cyan/90 text-black font-bold">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: total, color: "text-cyan" },
          { label: "Pinned", value: announcements.filter((a) => a.pinned).length, color: "text-amber-400" },
          { label: "High Priority", value: announcements.filter((a) => a.priority === "high" || a.priority === "urgent").length, color: "text-red-400" },
          { label: "Avg Read Rate", value: announcements.length > 0 ? `${Math.round(announcements.reduce((sum, a) => sum + (a.total_users > 0 ? (a.read_count / a.total_users) * 100 : 0), 0) / announcements.length)}%` : "0%", color: "text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 rounded-xl border border-white/5 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="p-6 bg-secondary/20 rounded-full w-fit mx-auto border border-white/5">
            <Megaphone className="w-10 h-10 text-muted-foreground/20" />
          </div>
          <p className="text-foreground font-bold">No announcements yet</p>
          <p className="text-muted-foreground text-sm">
            Create your first announcement to notify all household members.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {filteredAnnouncements.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl border border-white/5 overflow-hidden"
            >
              {/* Main row */}
              <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && (
                      <Pin className="w-3.5 h-3.5 text-cyan fill-cyan shrink-0" />
                    )}
                    <h3 className="text-lg font-bold text-white">{a.title}</h3>
                    <Badge variant="outline" className={priorityColors[a.priority]}>
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground border-white/10">
                      {categoryLabels[a.category] || a.category}
                    </Badge>
                    {a.edited_at && (
                      <span className="text-[10px] text-muted-foreground/60 italic flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" />
                        edited {formatDistanceToNow(new Date(a.edited_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <p className="text-muted-foreground text-sm line-clamp-2">{a.body}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1">
                      by {a.author?.display_name || "Unknown"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {a.read_count}/{a.total_users} read
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePin(a)}
                    title={a.pinned ? "Unpin" : "Pin"}
                    className="h-8 w-8"
                  >
                    {a.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(a)}
                    title="Edit"
                    className="h-8 w-8"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(a)}
                    title="Delete"
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleExpand(a.id)}
                    title="View reads"
                    className="h-8 w-8"
                  >
                    {expandedId === a.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expandable read receipts */}
              <AnimatePresence>
                {expandedId === a.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 md:px-6 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        Read by ({a.read_count}/{a.total_users})
                      </div>

                      {readReceipts[a.id] ? (
                        readReceipts[a.id].length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {readReceipts[a.id].map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5"
                              >
                                <div className="w-7 h-7 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-cyan" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {r.user?.display_name || "Unknown"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {format(new Date(r.read_at), "MMM d, h:mm a")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No one has read this announcement yet.
                          </p>
                        )
                      ) : (
                        <div className="flex gap-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-white/5 rounded-lg flex-1 animate-pulse" />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editing ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-secondary/30 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Write your announcement..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="bg-secondary/30 border-white/10 min-h-[120px] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-secondary/30 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-secondary/30 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/20 px-4 py-3 border border-white/5">
              <div>
                <Label className="text-sm font-medium">Pin Announcement</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pinned announcements stay at the top
                </p>
              </div>
              <Switch
                checked={form.pinned}
                onCheckedChange={(v) => setForm({ ...form, pinned: v })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan hover:bg-cyan/90 text-black font-bold"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Publish & Notify"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
