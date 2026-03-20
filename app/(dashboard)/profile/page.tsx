"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Terminal, Shield, Camera, Save, Key, Globe, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

const ProfilePage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "administrator";

  const [profile, setProfile] = useState({
    displayName: user?.displayName || "User",
    username: isAdmin ? "root" : "member",
    email: user?.email || "user@homelab.local",
    hostname: "homelab",
    shell: "/bin/zsh",
    timezone: "UTC",
    role: isAdmin ? "admin" : "member",
    twoFactor: true,
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

  const stats = [
    { label: "SSH Keys", value: profile.sshKeys, icon: Key, color: "text-cyan" },
    { label: "Active Sessions", value: profile.sessions, icon: Globe, color: "text-emerald" },
    { label: "Role", value: profile.role.toUpperCase(), icon: Shield, color: "text-magenta" },
    { label: "Last Login", value: profile.lastLogin, icon: Clock, color: "text-amber" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-semibold text-foreground">User Profile</h1>
        <p className="text-sm text-muted-foreground font-mono">
          {isAdmin ? `uid=0(root) · ${profile.hostname}` : `${profile.displayName} · Family Account`}
        </p>
      </motion.div>

      {/* Avatar + Identity Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-mono">
                    {profile.displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-foreground" />
                </button>
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{profile.displayName}</h2>
                <p className="text-sm font-mono text-muted-foreground">{profile.username}@{profile.hostname}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <div className="flex gap-2 pt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                    {profile.role.toUpperCase()}
                  </span>
                  {profile.twoFactor && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald/10 text-emerald border border-emerald/20">
                      2FA ENABLED
                    </span>
                  )}
                </div>
              </div>
              <div>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="font-mono text-xs">
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="font-mono text-xs">
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="font-mono text-xs text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</p>
                <p className="text-sm font-mono text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Details Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-mono text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Account Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage your identity and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Display Name</Label>
                <Input
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                  disabled={!editing}
                  className="font-mono text-sm bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Username</Label>
                <Input
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  disabled={!editing}
                  className="font-mono text-sm bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  disabled={!editing}
                  className="font-mono text-sm bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" /> Default Shell
                </Label>
                <Select
                  value={draft.shell}
                  onValueChange={(v) => setDraft({ ...draft, shell: v })}
                  disabled={!editing}
                >
                  <SelectTrigger className="font-mono text-sm bg-secondary border-border">
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
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Hostname</Label>
                <Input
                  value={draft.hostname}
                  onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
                  disabled={!editing}
                  className="font-mono text-sm bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">Timezone</Label>
                <Select
                  value={draft.timezone}
                  onValueChange={(v) => setDraft({ ...draft, timezone: v })}
                  disabled={!editing}
                >
                  <SelectTrigger className="font-mono text-sm bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Security Section */}
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
                  <Button variant="outline" size="sm" className="font-mono text-xs" disabled={!editing}>
                    <Key className="h-3 w-3 mr-1" /> Manage Keys
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Change Password</p>
                    <p className="text-xs text-muted-foreground font-mono">Last changed 14 days ago</p>
                  </div>
                  <Button variant="outline" size="sm" className="font-mono text-xs" disabled={!editing}>
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
