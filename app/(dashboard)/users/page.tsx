"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Pencil,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Wifi,
  Lightbulb,
  Film,
  Video,
  RefreshCw,
  Copy,
  Check,
  UserPlus,
  ShieldOff,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useUserEvents } from "@/hooks/useUserEvents";

// ── Types ────────────────────────────────────────────────

interface UserItem {
  id: number;
  email: string;
  display_name: string;
  phone: string;
  role: string;
  permissions: number;
  resource_perms: string[];
  perm_expires_at: string | null;
  has_pin: boolean;
  access_count: number;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface PermCategory {
  name: string;
  perms: string[];
}

interface PermSchema {
  categories: PermCategory[];
  defaults: Record<string, string[]>;
}

// ── Permission display helpers ───────────────────────────

const permLabels: Record<string, string> = {
  "ui:view": "View Dashboard",
  "network:view": "View Network",
  "network:manage": "Manage Network",
  "smart_device:view": "View Devices",
  "smart_device:control": "Control Devices",
  "smart_device:group": "Manage Groups",
  "media:view": "View Media",
  "media:manage": "Manage Media",
  "camera:view": "View Cameras",
  "camera:manage": "Manage Cameras",
  "user:view": "View Users",
  "user:create_guest": "Create Guests",
  "user:edit_perms": "Edit Permissions",
  "user:regenerate_pin": "Regenerate PIN",
  "user:delete_guest": "Delete Guests",
  "user:lock": "Lock / Revoke",
};

const categoryIcons: Record<string, typeof Eye> = {
  Dashboard: Eye,
  Network: Wifi,
  "Smart Devices": Lightbulb,
  Media: Film,
  Cameras: Video,
  "User Management": Users,
};

// ── Helpers ──────────────────────────────────────────────

function authHeaders(token: string | null) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function roleBadge(role: string) {
  switch (role) {
    case "administrator":
      return { label: "ADMIN", variant: "default" as const };
    case "guest":
      return { label: "GUEST", variant: "outline" as const };
    default:
      return { label: "MEMBER", variant: "secondary" as const };
  }
}

// ── PIN Display Dialog ──────────────────────────────────

function PINDisplayDialog({
  open,
  onClose,
  pin,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  pin: string;
  userName: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyPIN = async () => {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" /> Guest PIN Generated
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            PIN for <span className="text-foreground font-medium">{userName}</span>
          </p>
          <div className="flex items-center justify-center gap-2">
            {pin.split("").map((digit, i) => (
              <div
                key={i}
                className="w-11 h-14 flex items-center justify-center rounded-lg bg-secondary border border-border text-2xl font-mono font-bold text-foreground"
              >
                {digit}
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1.5"
            onClick={copyPIN}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy PIN
              </>
            )}
          </Button>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <p className="text-[11px] font-mono text-amber-500">
              Save this PIN — it cannot be viewed again after closing this dialog.
            </p>
          </div>
          <Button size="sm" onClick={onClose} className="font-mono text-xs w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Permission Toggle Panel ──────────────────────────────

function PermissionPanel({
  schema,
  perms,
  onChange,
  disabled,
  role,
  expiresAt,
  onExpiresAtChange,
  hideExpiry,
}: {
  schema: PermSchema;
  perms: string[];
  onChange: (perms: string[]) => void;
  disabled?: boolean;
  role: string;
  expiresAt: string;
  onExpiresAtChange: (v: string) => void;
  hideExpiry?: boolean;
}) {
  const isAdmin = role === "administrator";

  const togglePerm = (perm: string, checked: boolean) => {
    if (checked) {
      onChange([...perms, perm]);
    } else {
      onChange(perms.filter((p) => p !== perm));
    }
  };

  const toggleAll = (categoryPerms: string[], checked: boolean) => {
    if (checked) {
      const newPerms = [...new Set([...perms, ...categoryPerms])];
      onChange(newPerms);
    } else {
      onChange(perms.filter((p) => !categoryPerms.includes(p)));
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
          <p className="text-[11px] font-mono text-primary">
            Administrators have all permissions implicitly.
          </p>
        </div>
      )}

      {schema.categories.map((cat) => {
        const Icon = categoryIcons[cat.name] || Eye;
        const allChecked = cat.perms.every((p) => isAdmin || perms.includes(p));

        return (
          <div key={cat.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-medium text-foreground uppercase tracking-wider">
                  {cat.name}
                </span>
              </div>
              <Switch
                checked={allChecked}
                onCheckedChange={(checked) => toggleAll(cat.perms, checked)}
                disabled={disabled || isAdmin}
                className="scale-75"
              />
            </div>
            <div className="grid grid-cols-1 gap-1 pl-5">
              {cat.perms.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-[12px] text-muted-foreground">
                    {permLabels[perm] || perm}
                  </span>
                  <Switch
                    checked={isAdmin || perms.includes(perm)}
                    onCheckedChange={(checked) => togglePerm(perm, checked)}
                    disabled={disabled || isAdmin}
                    className="scale-[0.65]"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Expiry — guests only (hidden when managed externally) */}
      {role === "guest" && !hideExpiry && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Access Expires
          </Label>
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => onExpiresAtChange(e.target.value)}
            className="font-mono text-sm bg-secondary border-border"
            disabled={disabled}
          />
          <p className="text-[10px] text-muted-foreground">
            Leave empty for no expiration.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Guest Stats Summary ──────────────────────────────────

function GuestStatsSummary({ users }: { users: UserItem[] }) {
  const guests = users.filter((u) => u.role === "guest");
  if (guests.length === 0) return null;

  const now = new Date();
  const active = guests.filter(
    (g) => !g.is_locked && (!g.perm_expires_at || new Date(g.perm_expires_at) > now),
  );
  const expired = guests.filter(
    (g) => g.perm_expires_at && new Date(g.perm_expires_at) <= now,
  );
  const totalAccesses = guests.reduce((sum, g) => sum + g.access_count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {[
        { label: "Total Guests", value: guests.length, color: "text-amber-500" },
        { label: "Active", value: active.length, color: "text-emerald-500" },
        { label: "Expired", value: expired.length, color: "text-crimson" },
        { label: "Total Accesses", value: totalAccesses, color: "text-cyan" },
      ].map((stat) => (
        <div key={stat.label} className="glass-card p-3 text-center">
          <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────

const UserManagementPage = () => {
  const { token, user: authUser } = useAuthStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canView = hasPermission("user:view");
  const canCreate = hasPermission("user:create_guest");
  const canEditPerms = hasPermission("user:edit_perms");
  const canRegeneratePin = hasPermission("user:regenerate_pin");
  const canDelete = hasPermission("user:delete_guest");
  const canLock = hasPermission("user:lock");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [callerEmail, setCallerEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<PermSchema | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    email: "",
    display_name: "",
    password: "",
    phone: "",
    role: "family_member",
  });
  const [createPerms, setCreatePerms] = useState<string[]>([]);
  const [createExpiry, setCreateExpiry] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ role: "" });
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  // PIN display dialog
  const [pinDisplay, setPinDisplay] = useState<{ pin: string; name: string } | null>(null);

  // Create dialog mobile tab
  const [createTab, setCreateTab] = useState<"details" | "permissions">("details");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    variant: "destructive" | "default";
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = (opts: {
    title: string;
    description: string;
    actionLabel?: string;
    variant?: "destructive" | "default";
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      title: opts.title,
      description: opts.description,
      actionLabel: opts.actionLabel || "Confirm",
      variant: opts.variant || "default",
      onConfirm: opts.onConfirm,
    });
  };

  // Filter
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Fetch schema
  const fetchSchema = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/permissions/schema", {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setSchema(data);
      }
    } catch {
      // schema fetch failure is non-fatal
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.caller_email) setCallerEmail(data.caller_email);
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch {
      toast.error("Failed to reach server");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // SSE: auto-refresh user list on real-time events
  useUserEvents(fetchUsers);

  useEffect(() => {
    fetchSchema();
    fetchUsers();
  }, [fetchSchema, fetchUsers]);

  // When create role changes, set default perms and reset expiry
  useEffect(() => {
    if (schema) {
      const defaults = schema.defaults[createForm.role] || [];
      setCreatePerms(defaults);
      // Only guests have expiry — clear it when switching away
      if (createForm.role !== "guest") setCreateExpiry("");
    }
  }, [createForm.role, schema]);

  const handleCreate = async () => {
    setCreating(true);
    const body: Record<string, unknown> = {
      ...createForm,
      resource_perms: createPerms,
    };
    if (createExpiry) {
      body.perm_expires_at = new Date(createExpiry).toISOString();
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("User created");
        setShowCreate(false);
        // If guest, show the PIN in a prominent dialog
        if (createForm.role === "guest" && data.guest_pin) {
          setPinDisplay({
            pin: data.guest_pin,
            name: createForm.display_name || createForm.email,
          });
        }
        setCreateForm({
          email: "",
          display_name: "",
          password: "",
          phone: "",
          role: "family_member",
        });
        setCreatePerms([]);
        setCreateExpiry("");
        setCreateStep(1);
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to create user");
      }
    } catch {
      toast.error("Failed to reach server");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (editForm.role && editForm.role !== editUser.role) body.role = editForm.role;
    body.resource_perms = editPerms;
    const effectiveRole = editForm.role || editUser.role;
    if (effectiveRole === "guest" && editExpiry) {
      body.perm_expires_at = new Date(editExpiry).toISOString();
    } else if (effectiveRole !== "guest") {
      // Non-guest users don't have expiry — clear it
      body.perm_expires_at = "";
    }

    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("User updated");
        setEditUser(null);
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to update user");
      }
    } catch {
      toast.error("Failed to reach server");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: UserItem) => {
    requestConfirm({
      title: "Delete User",
      description: `Delete ${user.display_name} (${user.email})? You can restore within 30 days before permanent removal.`,
      actionLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: "DELETE",
            headers: authHeaders(token),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success("User deleted");
            fetchUsers();
          } else {
            toast.error(data.message || "Failed to delete user");
          }
        } catch {
          toast.error("Failed to reach server");
        }
      },
    });
  };

  const handleRestore = (user: UserItem) => {
    requestConfirm({
      title: "Restore User",
      description: `Restore ${user.display_name} (${user.email})? They will regain access with their previous permissions.`,
      actionLabel: "Restore",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}/restore`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success("User restored");
            fetchUsers();
          } else {
            toast.error(data.message || "Failed to restore user");
          }
        } catch {
          toast.error("Failed to reach server");
        }
      },
    });
  };

  const handleLock = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/lock`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ is_locked: !user.is_locked }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(user.is_locked ? "User unlocked" : "User locked");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed");
      }
    } catch {
      toast.error("Failed to reach server");
    }
  };

  const handleRevoke = (user: UserItem) => {
    requestConfirm({
      title: "Revoke Tokens",
      description: `Revoke all sessions for ${user.display_name} (${user.email})? They will be logged out immediately.`,
      actionLabel: "Revoke",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}/revoke`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success("Tokens revoked");
          } else {
            toast.error(data.message || "Failed");
          }
        } catch {
          toast.error("Failed to reach server");
        }
      },
    });
  };

  const handleResetPassword = (user: UserItem) => {
    requestConfirm({
      title: "Reset Password",
      description: `Send a password reset email to ${user.email}?`,
      actionLabel: "Send Reset",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(data.message || "Password reset email sent");
          } else {
            toast.error(data.message || "Failed to send reset email");
          }
        } catch {
          toast.error("Failed to reach server");
        }
      },
    });
  };

  const handleRegeneratePin = (user: UserItem) => {
    requestConfirm({
      title: "Regenerate PIN",
      description: `Generate a new PIN for ${user.display_name}? The current PIN will stop working immediately.`,
      actionLabel: "Regenerate",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}/regenerate-pin`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok) {
            if (data.guest_pin) {
              setPinDisplay({ pin: data.guest_pin, name: user.display_name });
            } else {
              toast.success(data.message || "PIN regenerated");
            }
            fetchUsers();
          } else {
            toast.error(data.message || "Failed to regenerate PIN");
          }
        } catch {
          toast.error("Failed to reach server");
        }
      },
    });
  };

  const openEdit = (user: UserItem) => {
    setEditUser(user);
    setEditForm({ role: user.role });
    setEditPerms(user.resource_perms || []);
    setEditExpiry(
      user.perm_expires_at
        ? new Date(user.perm_expires_at).toISOString().slice(0, 16)
        : "",
    );
  };

  // When edit role changes, update default perms
  const onEditRoleChange = (newRole: string) => {
    setEditForm({ role: newRole });
    if (schema) {
      setEditPerms(schema.defaults[newRole] || []);
      if (newRole !== "guest") setEditExpiry("");
    }
  };

  const activePermsCount = (user: UserItem) => {
    if (user.role === "administrator") return "All";
    return (user.resource_perms || []).length;
  };

  const isExpired = (user: UserItem) => {
    if (!user.perm_expires_at) return false;
    return new Date(user.perm_expires_at) < new Date();
  };

  const daysUntilPurge = (user: UserItem) => {
    if (!user.deleted_at) return null;
    const deletedDate = new Date(user.deleted_at);
    const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const remaining = Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  };

  const meUser = users.find((u) => u.email === callerEmail);
  const otherUsers = users.filter((u) => u.email !== callerEmail);
  const deletedUsers = otherUsers.filter((u) => u.deleted_at);
  const activeUsers = otherUsers.filter((u) => !u.deleted_at);
  const filteredUsers =
    roleFilter === "all"
      ? activeUsers
      : roleFilter === "deleted"
        ? deletedUsers
        : activeUsers.filter((u) => u.role === roleFilter);

  const openQuickGuest = () => {
    setCreateForm({
      email: "",
      display_name: "",
      password: "",
      phone: "",
      role: "guest",
    });
    setCreateStep(2);
    setShowCreate(true);
  };

  // ── Access Denied ──────────────────────────────────────
  if (!canView) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass-card p-10 text-center space-y-5"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-crimson/10 border border-crimson/20 mx-auto">
            <ShieldOff className="w-8 h-8 text-crimson" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Access Denied
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You don&apos;t have permission to view User Management.
              Contact your administrator to request the{" "}
              <span className="font-mono text-foreground text-xs bg-secondary px-1.5 py-0.5 rounded">
                user:view
              </span>{" "}
              permission.
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-mono text-muted-foreground">
              Signed in as{" "}
              <span className="text-foreground">{authUser?.displayName || authUser?.email}</span>
              {" · "}
              <span className="uppercase">{authUser?.role}</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> User Management
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {activeUsers.length + (meUser && !meUser.deleted_at ? 1 : 0)} registered user{activeUsers.length + (meUser && !meUser.deleted_at ? 1 : 0) !== 1 ? "s" : ""}{deletedUsers.length > 0 ? ` · ${deletedUsers.length} deleted` : ""}
            </p>
          </div>
          {/* Desktop buttons */}
          {canCreate && (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                onClick={openQuickGuest}
                className="font-mono text-xs"
                size="sm"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Quick Guest
              </Button>
              <Button
                onClick={() => setShowCreate(true)}
                className="font-mono text-xs"
                size="sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create User
              </Button>
            </div>
          )}
        </div>
        {/* Mobile buttons */}
        {canCreate && (
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="outline"
              onClick={openQuickGuest}
              className="font-mono text-xs flex-1"
              size="sm"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Quick Guest
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="font-mono text-xs flex-1"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create User
            </Button>
          </div>
        )}
      </motion.div>

      {/* Guest Stats */}
      <GuestStatsSummary users={users} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1">
        {[
          { value: "all", label: "All" },
          { value: "administrator", label: "Admins" },
          { value: "family_member", label: "Members" },
          { value: "guest", label: "Guests" },
          ...(deletedUsers.length > 0 ? [{ value: "deleted", label: "Deleted" }] : []),
        ].map((tab) => {
          const count =
            tab.value === "all"
              ? activeUsers.length
              : tab.value === "deleted"
                ? deletedUsers.length
                : activeUsers.filter((u) => u.role === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                roleFilter === tab.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}{" "}
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* My Account Card */}
      {meUser && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-primary/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              {meUser.role === "administrator" ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <UserCheck className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-medium text-foreground">{meUser.display_name}</p>
                <Badge variant="default" className="text-[10px] font-mono bg-primary/20 text-primary border-primary/30">
                  YOU
                </Badge>
                <Badge variant={roleBadge(meUser.role).variant} className="text-[10px] font-mono">
                  {roleBadge(meUser.role).label}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-0.5">
                <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" /> {meUser.email}
                </p>
                {meUser.phone && (
                  <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {meUser.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-muted-foreground">
                Permissions: <span className="text-foreground font-medium">{meUser.role === "administrator" ? "All" : (meUser.resource_perms || []).length}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Last login: {meUser.last_login_at ? new Date(meUser.last_login_at).toLocaleString() : "Never"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-2"
      >
        {loading ? (
          <div className="glass-card p-8 text-center text-muted-foreground font-mono text-sm">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground font-mono text-sm">
            No users found
          </div>
        ) : (
          filteredUsers.map((user) => {
            const badge = roleBadge(user.role);
            const expanded = expandedUser === user.id;
            const expired = isExpired(user);
            const isDeleted = !!user.deleted_at;
            const purgeIn = daysUntilPurge(user);

            return (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card overflow-hidden ${isDeleted ? "opacity-50 border-crimson/20" : user.is_locked ? "opacity-60" : ""}`}
              >
                <div className="p-4 space-y-3">
                  {/* Row 1: Avatar + Name/Badges + Actions (desktop) */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                        isDeleted
                          ? "bg-crimson/10 border-crimson/20"
                          : user.is_locked
                            ? "bg-crimson/10 border-crimson/20"
                            : user.role === "administrator"
                              ? "bg-primary/10 border-primary/20"
                              : user.role === "guest"
                                ? "bg-amber-500/10 border-amber-500/20"
                                : "bg-secondary border-border"
                      }`}
                    >
                      {isDeleted ? (
                        <Trash2 className="h-4 w-4 text-crimson" />
                      ) : user.is_locked ? (
                        <UserX className="h-4 w-4 text-crimson" />
                      ) : user.role === "administrator" ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Name + Badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={`text-sm font-medium truncate ${isDeleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {user.display_name}
                        </p>
                        <Badge variant={badge.variant} className="text-[10px] font-mono">
                          {badge.label}
                        </Badge>
                        {isDeleted && (
                          <Badge variant="destructive" className="text-[10px] font-mono">
                            DELETED
                          </Badge>
                        )}
                        {!isDeleted && user.has_pin && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-amber-500/30 text-amber-500"
                          >
                            PIN
                          </Badge>
                        )}
                        {!isDeleted && user.is_locked && (
                          <Badge variant="destructive" className="text-[10px] font-mono">
                            LOCKED
                          </Badge>
                        )}
                        {!isDeleted && expired && (
                          <Badge variant="destructive" className="text-[10px] font-mono">
                            EXPIRED
                          </Badge>
                        )}
                      </div>
                      {/* Contact info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-1">
                        <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" /> {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" /> {user.phone}
                          </p>
                        )}
                      </div>
                      {/* Deleted info */}
                      {isDeleted && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-crimson">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            Deleted {new Date(user.deleted_at!).toLocaleDateString()}
                            {purgeIn !== null && ` · Permanent in ${purgeIn}d`}
                          </span>
                        </div>
                      )}
                      {/* Guest expiry — prominent on card */}
                      {!isDeleted && user.role === "guest" && user.perm_expires_at && (
                        <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-mono ${expired ? "text-crimson" : "text-amber-500"}`}>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{expired ? "Expired" : "Expires"}: {new Date(user.perm_expires_at).toLocaleString()}</span>
                        </div>
                      )}
                      {!isDeleted && user.role === "guest" && !user.perm_expires_at && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>No expiry set</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop actions — hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {isDeleted ? (
                        canDelete && (
                          <Button variant="outline" size="sm" className="h-8 text-xs font-mono text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleRestore(user)}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                          </Button>
                        )
                      ) : (
                        <>
                          {canEditPerms && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => openEdit(user)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="View Permissions" onClick={() => setExpandedUser(expanded ? null : user.id)}>
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          {user.role !== "guest" && canEditPerms && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Reset Password" onClick={() => handleResetPassword(user)}>
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {user.role === "guest" && canRegeneratePin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500" title="Regenerate PIN" onClick={() => handleRegeneratePin(user)}>
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canLock && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={user.is_locked ? "Unlock" : "Lock"} onClick={() => handleLock(user)}>
                              {user.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {canLock && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500" title="Revoke Tokens" onClick={() => handleRevoke(user)}>
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-crimson" title="Delete" onClick={() => handleDelete(user)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Stats */}
                  {!isDeleted && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-0 sm:pl-[52px] text-[10px] text-muted-foreground">
                      <span>Permissions: <span className="text-foreground font-medium">{activePermsCount(user)}</span></span>
                      <span>Accesses: <span className="text-foreground font-medium">{user.access_count}</span></span>
                      <span>Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</span>
                      {user.perm_expires_at && (
                        <span className={expired ? "text-crimson" : ""}>
                          Expires: {new Date(user.perm_expires_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row 3: Mobile actions — visible only on small screens */}
                  <div className="flex sm:hidden items-center gap-1 pt-1 border-t border-border/50 overflow-x-auto">
                    {isDeleted ? (
                      canDelete && (
                        <Button variant="outline" size="sm" className="h-8 text-xs font-mono text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleRestore(user)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                        </Button>
                      )
                    ) : (
                      <>
                        {canEditPerms && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title="Edit" onClick={() => openEdit(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title="View Permissions" onClick={() => setExpandedUser(expanded ? null : user.id)}>
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        {user.role !== "guest" && canEditPerms && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary" title="Reset Password" onClick={() => handleResetPassword(user)}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {user.role === "guest" && canRegeneratePin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-amber-500" title="Regenerate PIN" onClick={() => handleRegeneratePin(user)}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canLock && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title={user.is_locked ? "Unlock" : "Lock"} onClick={() => handleLock(user)}>
                            {user.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        {canLock && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-amber-500" title="Revoke Tokens" onClick={() => handleRevoke(user)}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-crimson" title="Delete" onClick={() => handleDelete(user)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded permissions view */}
                <AnimatePresence>
                  {expanded && schema && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        <div className="pt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {schema.categories.map((cat) => {
                            const Icon = categoryIcons[cat.name] || Eye;
                            return (
                              <div key={cat.name} className="space-y-1">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] font-mono font-medium text-foreground uppercase tracking-wider">
                                    {cat.name}
                                  </span>
                                </div>
                                {cat.perms.map((perm) => {
                                  const has =
                                    user.role === "administrator" ||
                                    (user.resource_perms || []).includes(perm);
                                  return (
                                    <div
                                      key={perm}
                                      className="flex items-center gap-1.5"
                                    >
                                      <div
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          has
                                            ? "bg-emerald-500"
                                            : "bg-muted-foreground/30"
                                        }`}
                                      />
                                      <span
                                        className={`text-[11px] ${
                                          has
                                            ? "text-foreground"
                                            : "text-muted-foreground line-through"
                                        }`}
                                      >
                                        {permLabels[perm] || perm}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* ── Create User Dialog ──────────────────────────────── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setCreateStep(1);
            setCreateTab("details");
            setCreateForm({
              email: "",
              display_name: "",
              password: "",
              phone: "",
              role: "family_member",
            });
            setCreatePerms([]);
            setCreateExpiry("");
          }
        }}
      >
        <DialogContent className={`glass-card border-border max-h-[85vh] overflow-y-auto ${createStep === 2 ? "sm:max-w-lg lg:max-w-4xl" : "sm:max-w-md"}`}>
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Create User
            </DialogTitle>
          </DialogHeader>

          {createStep === 1 && (
            <div className="pt-2 pb-4 space-y-5">
              <p className="text-sm text-muted-foreground">
                Select the type of account to create
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    role: "administrator",
                    icon: Shield,
                    label: "Admin",
                    desc: "Full system access with all permissions",
                    color: "primary",
                    borderClass: "border-border hover:border-primary/40",
                    bgClass: "bg-secondary hover:bg-primary/5",
                    iconClass: "text-primary",
                  },
                  {
                    role: "family_member",
                    icon: UserCheck,
                    label: "Member",
                    desc: "Home access with configurable permissions",
                    color: "cyan",
                    borderClass: "border-border hover:border-cyan/40",
                    bgClass: "bg-secondary hover:bg-cyan/5",
                    iconClass: "text-cyan",
                  },
                  {
                    role: "guest",
                    icon: UserPlus,
                    label: "Guest",
                    desc: "Temporary PIN-based access with expiry",
                    color: "amber-500",
                    borderClass: "border-amber-500/20 hover:border-amber-500/50",
                    bgClass: "bg-amber-500/5 hover:bg-amber-500/10",
                    iconClass: "text-amber-500",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.role}
                      className={`group rounded-xl border ${item.borderClass} ${item.bgClass} p-5 flex flex-col items-center gap-3 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
                      onClick={() => {
                        setCreateForm({ ...createForm, role: item.role });
                        setCreateStep(2);
                      }}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-background/60 border border-border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-6 h-6 ${item.iconClass}`} />
                      </div>
                      <div className="text-sm font-semibold text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono text-center leading-relaxed">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {createStep === 2 && (() => {
            const detailsContent = (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Display Name</Label>
                  <Input
                    value={createForm.display_name}
                    onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                    placeholder={createForm.role === "guest" ? "Guest Name" : "John Doe"}
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@homelab.local"
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
                {createForm.role !== "guest" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-muted-foreground">Password</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Min 4 characters"
                      className="font-mono text-sm bg-secondary border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to auto-generate.</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Phone</Label>
                  <Input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
                {createForm.role === "guest" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Access Expires
                    </Label>
                    <Input
                      type="datetime-local"
                      value={createExpiry}
                      onChange={(e) => setCreateExpiry(e.target.value)}
                      className="font-mono text-sm bg-secondary border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave empty for no expiration.</p>
                  </div>
                )}
                {createForm.role === "guest" && (
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-mono font-medium text-amber-500">PIN Auto-Generated</p>
                        <p className="text-[10px] font-mono text-amber-500/70 mt-0.5">
                          A secure 6-digit PIN will be created and shown once after submission.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );

            const permsContent = schema ? (
              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <PermissionPanel
                  schema={schema}
                  perms={createPerms}
                  onChange={setCreatePerms}
                  role={createForm.role}
                  expiresAt={createExpiry}
                  onExpiresAtChange={setCreateExpiry}
                  hideExpiry
                />
              </div>
            ) : null;

            return (
              <div className="space-y-0 pt-2">
                {/* Top bar */}
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      createForm.role === "administrator" ? "bg-primary/10" :
                      createForm.role === "guest" ? "bg-amber-500/10" : "bg-cyan/10"
                    }`}>
                      {createForm.role === "administrator" ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : createForm.role === "guest" ? (
                        <UserPlus className="w-4 h-4 text-amber-500" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-cyan" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {createForm.role === "administrator" ? "New Administrator" :
                         createForm.role === "guest" ? "New Guest" : "New Member"}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {createForm.role === "guest"
                          ? "PIN will be auto-generated"
                          : "Configure account details"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateStep(1)}
                    className="font-mono text-[11px] h-7"
                  >
                    Change Type
                  </Button>
                </div>

                {/* Mobile/tablet: Tab switcher (hidden on lg+) */}
                <div className="flex lg:hidden border-b border-border mb-4">
                  {(["details", "permissions"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setCreateTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider text-center transition-colors relative ${
                        createTab === tab
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground/70"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {tab === "details" ? <Mail className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {tab === "details" ? "Details" : "Permissions"}
                      </span>
                      {createTab === tab && (
                        <motion.div
                          layoutId="createTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Mobile/tablet: Show active tab content only */}
                <div className="lg:hidden">
                  {createTab === "details" ? detailsContent : permsContent}
                </div>

                {/* Desktop: Side-by-side (hidden below lg) */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-border">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                        Account Details
                      </span>
                    </div>
                    {detailsContent}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-border">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                        Permissions
                      </span>
                    </div>
                    {permsContent}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 mt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateStep(1);
                    }}
                    className="font-mono text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating}
                    className={`font-mono text-xs px-5 ${
                      createForm.role === "guest"
                        ? "bg-amber-500 hover:bg-amber-600 text-black"
                        : ""
                    }`}
                  >
                    {creating
                      ? "Creating..."
                      : createForm.role === "guest"
                        ? "Create & Generate PIN"
                        : "Create User"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ────────────────────────────────── */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit User
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {editUser.display_name}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {editUser.email}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">
                  Role
                </Label>
                <Select
                  value={editForm.role}
                  onValueChange={onEditRoleChange}
                >
                  <SelectTrigger className="font-mono text-sm bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family_member">Family Member</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions */}
              {schema && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Permissions
                  </Label>
                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <PermissionPanel
                      schema={schema}
                      perms={editPerms}
                      onChange={setEditPerms}
                      role={editForm.role}
                      expiresAt={editExpiry}
                      onExpiresAtChange={setEditExpiry}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditUser(null)}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={saving}
                  className="font-mono text-xs"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PIN Display Dialog ──────────────────────────────── */}
      {pinDisplay && (
        <PINDisplayDialog
          open={true}
          onClose={() => setPinDisplay(null)}
          pin={pinDisplay.pin}
          userName={pinDisplay.name}
        />
      )}

      {/* ── Confirm Dialog ──────────────────────────────────── */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent className="glass-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-foreground">
              {confirmDialog?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`font-mono text-xs ${
                confirmDialog?.variant === "destructive"
                  ? "bg-crimson hover:bg-crimson/90 text-white"
                  : ""
              }`}
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
            >
              {confirmDialog?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementPage;
