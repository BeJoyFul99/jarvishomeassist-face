"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Terminal, Shield, Camera, Save, Key, Globe, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const ProfilePage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "administrator";
  const isGuest = user?.role === "guest";

  const [profile, setProfile] = useState({
    displayName: user?.displayName || "User",
    username: isAdmin ? "root" : "member",
    email: user?.email || "user@homelab.local",
    hostname: "homelab",
    shell: "/bin/zsh",
    timezone: "UTC",
    role: isAdmin ? "admin" : isGuest ? "guest" : "member",
    twoFactor: isAdmin,
    sshKeys: isAdmin ? 3 : 0,
    lastLogin: new Date().toLocaleString(),
    sessions: 2,
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  const handleSave = () => {
    setProfile(draft);
    setEditing(false);
    toast.success("Profile updated successfully");
  };

  const handleCancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const stats = isGuest
    ? [
        { label: "Role", value: "GUEST", icon: Shield, color: "text-amber-500" },
        { label: "Last Login", value: profile.lastLogin, icon: Clock, color: "text-amber" },
      ]
    : [
        { label: "SSH Keys", value: profile.sshKeys, icon: Key, color: "text-cyan" },
        { label: "Active Sessions", value: profile.sessions, icon: Globe, color: "text-emerald" },
        { label: "Role", value: profile.role.toUpperCase(), icon: Shield, color: "text-magenta" },
        { label: "Last Login", value: profile.lastLogin, icon: Clock, color: "text-amber" },
      ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 max-w-4xl mx-auto"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-semibold text-foreground">
          {isGuest ? "My Profile" : "User Profile"}
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {isAdmin
            ? `uid=0(root) · ${profile.hostname}`
            : isGuest
              ? `${profile.displayName} · Guest Account`
              : `${profile.displayName} · Family Account`}
        </p>
      </motion.div>

      {/* Avatar + Identity Card */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-start gap-6">
          <motion.div className="relative group" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Avatar className="h-20 w-20 ring-2 ring-primary/30">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-mono">
                {profile.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <button className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-foreground" />
            </button>
          </motion.div>
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{profile.displayName}</h2>
                {!isGuest && (
                  <p className="text-sm font-mono text-muted-foreground">{profile.username}@{profile.hostname}</p>
                )}
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <div className="flex gap-2 pt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    isGuest
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}>
                    {profile.role.toUpperCase()}
                  </span>
                  {!isGuest && profile.twoFactor && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald/10 text-emerald border border-emerald/20">
                      2FA ENABLED
                    </span>
                  )}
                </div>
              </div>
              <div>
                {!editing ? (
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="font-mono text-xs border-white/[0.06]">
                      Edit Profile
                    </Button>
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <motion.div whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                      <Button size="sm" onClick={handleSave} className="font-mono text-xs">
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </motion.div>
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="font-mono text-xs text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={item}
        className={`grid gap-3 ${isGuest ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            className="glass-card p-4 flex items-center gap-3"
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</p>
              <p className="text-sm font-mono text-foreground">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Details Form */}
      <motion.div variants={item} className="glass-card p-6">
        <div className="pb-4">
          <h3 className="text-sm font-mono text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> {isGuest ? "Guest Details" : "Account Details"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isGuest ? "Update your display name and timezone" : "Manage your identity and preferences"}
          </p>
        </div>
        <div className="space-y-5">
            <div className={`grid grid-cols-1 ${isGuest ? "" : "md:grid-cols-2"} gap-4`}>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Display Name</Label>
                <Input
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                  disabled={!editing}
                  className="font-mono text-sm bg-secondary/50 border-white/[0.06]"
                />
              </div>
              {!isGuest && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Username</Label>
                  <Input
                    value={draft.username}
                    onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                    disabled={!editing}
                    className="font-mono text-sm bg-secondary/50 border-white/[0.06]"
                  />
                </div>
              )}
              {!isGuest && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    disabled={!editing}
                    className="font-mono text-sm bg-secondary/50 border-white/[0.06]"
                  />
                </div>
              )}
              {!isGuest && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <Terminal className="h-3 w-3" /> Default Shell
                  </Label>
                  <Select
                    value={draft.shell}
                    onValueChange={(v) => setDraft({ ...draft, shell: v })}
                    disabled={!editing}
                  >
                    <SelectTrigger className="font-mono text-sm bg-secondary/50 border-white/[0.06]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/bin/zsh">/bin/zsh</SelectItem>
                      <SelectItem value="/bin/bash">/bin/bash</SelectItem>
                      <SelectItem value="/bin/fish">/bin/fish</SelectItem>
                      <SelectItem value="/bin/sh">/bin/sh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isGuest && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Hostname</Label>
                  <Input
                    value={draft.hostname}
                    onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
                    disabled={!editing}
                    className="font-mono text-sm bg-secondary/50 border-white/[0.06]"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Timezone</Label>
                <Select
                  value={draft.timezone}
                  onValueChange={(v) => setDraft({ ...draft, timezone: v })}
                  disabled={!editing}
                >
                  <SelectTrigger className="font-mono text-sm bg-secondary/50 border-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Security Section — hidden for guests */}
            {!isGuest && (
              <>
                <Separator className="bg-white/[0.06]" />
                <div>
                  <h3 className="text-sm font-mono text-foreground flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-magenta" /> Security
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground font-mono">TOTP via authenticator app</p>
                      </div>
                      <Switch
                        checked={draft.twoFactor}
                        onCheckedChange={(v) => setDraft({ ...draft, twoFactor: v })}
                        disabled={!editing}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">SSH Keys</p>
                        <p className="text-xs text-muted-foreground font-mono">{profile.sshKeys} keys registered</p>
                      </div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button variant="outline" size="sm" className="font-mono text-xs border-white/[0.06]" disabled={!editing}>
                          <Key className="h-3 w-3 mr-1" /> Manage Keys
                        </Button>
                      </motion.div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Change Password</p>
                        <p className="text-xs text-muted-foreground font-mono">Last changed 14 days ago</p>
                      </div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                        <Button variant="outline" size="sm" className="font-mono text-xs border-white/[0.06]" disabled={!editing}>
                          Update
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
