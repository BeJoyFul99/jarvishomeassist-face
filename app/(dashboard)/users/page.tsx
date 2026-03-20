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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

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
  access_count: number;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
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
};

const categoryIcons: Record<string, typeof Eye> = {
  Dashboard: Eye,
  Network: Wifi,
  "Smart Devices": Lightbulb,
  Media: Film,
  Cameras: Video,
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

// ── Permission Toggle Panel ──────────────────────────────

function PermissionPanel({
  schema,
  perms,
  onChange,
  disabled,
  role,
  expiresAt,
  onExpiresAtChange,
}: {
  schema: PermSchema;
  perms: string[];
  onChange: (perms: string[]) => void;
  disabled?: boolean;
  role: string;
  expiresAt: string;
  onExpiresAtChange: (v: string) => void;
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

      {/* Expiry — only for guest */}
      {role === "guest" && (
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

// ── Main Page ────────────────────────────────────────────

const UserManagementPage = () => {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
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
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch {
      toast.error("Failed to reach server");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchema();
    fetchUsers();
  }, [fetchSchema, fetchUsers]);

  // When create role changes, set default perms
  useEffect(() => {
    if (schema) {
      const defaults = schema.defaults[createForm.role] || [];
      setCreatePerms(defaults);
      if (createForm.role !== "guest") setCreateExpiry("");
    }
  }, [createForm.role, schema]);

  const handleCreate = async () => {
    setCreating(true);
    const body: Record<string, unknown> = {
      ...createForm,
      resource_perms: createPerms,
    };
    if (createForm.role === "guest" && createExpiry) {
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
        // If guest, surface the generated PIN
        if (createForm.role === "guest" && data.guest_pin) {
          toast.success(`Guest PIN: ${data.guest_pin}`);
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

  const handleDelete = async (user: UserItem) => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
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

  const handleRevoke = async (user: UserItem) => {
    if (!confirm(`Revoke all tokens for ${user.email}? They will be logged out.`)) return;
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
  };

  const handleResetPassword = async (user: UserItem) => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
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
  };

  const handleRegeneratePin = async (user: UserItem) => {
    if (!confirm(`Regenerate PIN for ${user.display_name}? This will invalidate existing PINs.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/regenerate-pin`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.guest_pin) {
          toast.success(`New Guest PIN: ${data.guest_pin}`);
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {users.length} registered users
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="font-mono text-xs"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Create User
        </Button>
      </motion.div>

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
        ) : (
          users.map((user) => {
            const badge = roleBadge(user.role);
            const expanded = expandedUser === user.id;
            const expired = isExpired(user);

            return (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card overflow-hidden ${user.is_locked ? "opacity-60" : ""}`}
              >
                {/* Main row */}
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      user.is_locked
                        ? "bg-crimson/10 border-crimson/20"
                        : user.role === "administrator"
                          ? "bg-primary/10 border-primary/20"
                          : user.role === "guest"
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "bg-secondary border-border"
                    }`}
                  >
                    {user.is_locked ? (
                      <UserX className="h-4 w-4 text-crimson" />
                    ) : user.role === "administrator" ? (
                      <Shield className="h-4 w-4 text-primary" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.display_name}
                      </p>
                      <Badge variant={badge.variant} className="text-[10px] font-mono">
                        {badge.label}
                      </Badge>
                      {user.is_locked && (
                        <Badge variant="destructive" className="text-[10px] font-mono">
                          LOCKED
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive" className="text-[10px] font-mono">
                          EXPIRED
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {user.email}
                      </p>
                      {user.phone && (
                        <p className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {user.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">
                        Permissions: <span className="text-foreground font-medium">{activePermsCount(user)}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Accesses: <span className="text-foreground font-medium">{user.access_count}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Last login:{" "}
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString()
                          : "Never"}
                      </p>
                      {user.perm_expires_at && (
                        <p className={`text-[10px] ${expired ? "text-crimson" : "text-muted-foreground"}`}>
                          Expires: {new Date(user.perm_expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Edit"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="View Permissions"
                      onClick={() => setExpandedUser(expanded ? null : user.id)}
                    >
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Send Password Reset Email"
                      onClick={() => handleResetPassword(user)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title={user.is_locked ? "Unlock" : "Lock"}
                      onClick={() => handleLock(user)}
                    >
                      {user.is_locked ? (
                        <Unlock className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-amber"
                      title="Revoke Tokens"
                      onClick={() => handleRevoke(user)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    {user.role === "guest" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-amber"
                        title="Regenerate PIN"
                        onClick={() => handleRegeneratePin(user)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-crimson"
                      title="Delete"
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                                    <div key={perm} className="flex items-center gap-1.5">
                                      <div
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          has ? "bg-emerald-500" : "bg-muted-foreground/30"
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
          if (open) setCreateStep(1);
          else {
            setCreateStep(1);
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
        <DialogContent className="glass-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Create User
            </DialogTitle>
          </DialogHeader>

          {createStep === 1 && (
            <div className="pt-4 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground font-mono">Choose account type</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="rounded-lg border border-border bg-secondary p-6 flex flex-col items-center gap-2 hover:shadow"
                  onClick={() => {
                    setCreateForm({ ...createForm, role: "family_member" });
                    setCreateStep(2);
                  }}
                >
                  <Shield className="w-6 h-6 text-primary" />
                  <div className="text-sm font-medium">Member</div>
                  <div className="text-xs text-muted-foreground font-mono">Full access account</div>
                </button>
                <button
                  className="rounded-lg border border-border bg-secondary p-6 flex flex-col items-center gap-2 hover:shadow"
                  onClick={() => {
                    setCreateForm({ ...createForm, role: "guest" });
                    setCreateStep(2);
                  }}
                >
                  <UserCheck className="w-6 h-6 text-amber-500" />
                  <div className="text-sm font-medium">Guest</div>
                  <div className="text-xs text-muted-foreground font-mono">Temporary PIN-based access</div>
                </button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div />
                <Button variant="ghost" size="sm" onClick={() => setCreateStep(1)} className="font-mono text-xs">
                  Back
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="user@homelab.local"
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={createForm.display_name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, display_name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {createForm.role !== "guest" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono text-muted-foreground">Password</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      placeholder="Min 4 characters"
                      className="font-mono text-sm bg-secondary border-border"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground">Phone</Label>
                  <Input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                    className="font-mono text-sm bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) =>
                    setCreateForm({ ...createForm, role: v })
                  }
                >
                  <SelectTrigger className="font-mono text-sm bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family_member">Member</SelectItem>
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
                      perms={createPerms}
                      onChange={setCreatePerms}
                      role={createForm.role}
                      expiresAt={createExpiry}
                      onExpiresAtChange={setCreateExpiry}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setCreateStep(1);
                  }}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating}
                  className="font-mono text-xs"
                >
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
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
                <Label className="text-xs font-mono text-muted-foreground">Role</Label>
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
    </div>
  );
};

export default UserManagementPage;
