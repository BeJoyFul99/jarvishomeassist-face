"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { staggerContainer, springItem } from "@/lib/motion";
import {
  Globe,
  Wifi,
  Laptop,
  Lock,
  Users,
  Pencil,
  X,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Ban,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFleet } from "@/hooks/useFleet";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = staggerContainer(0.08);
const item = springItem;

interface WifiNetwork {
  id: number;
  ssid: string;
  password: string;
  security: string;
  band: string;
  description: string;
  is_guest: boolean;
  enabled: boolean;
}

const WifiEditCard = ({
  network,
  onSave,
  onToggle,
  canManage,
}: {
  network: WifiNetwork;
  onSave: (id: number, ssid: string, password: string) => void;
  onToggle: (id: number) => void;
  canManage: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [draftSsid, setDraftSsid] = useState(network.ssid);
  const [draftPassword, setDraftPassword] = useState(network.password);

  useEffect(() => {
    setDraftSsid(network.ssid);
    setDraftPassword(network.password);
  }, [network.ssid, network.password]);

  const handleSave = () => {
    if (!canManage) return;
    onSave(network.id, draftSsid, draftPassword);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraftSsid(network.ssid);
    setDraftPassword(network.password);
    setEditing(false);
  };

  const IconComponent = network.is_guest ? Users : Lock;
  const color = network.is_guest ? "text-amber" : "text-cyan";

  return (
    <motion.div layout className={`glass-card p-3.5 space-y-2.5 transition-opacity ${!network.enabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg bg-secondary shrink-0 ${network.enabled ? color : "text-muted-foreground"}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <Input
                  value={draftSsid}
                  onChange={(e) => setDraftSsid(e.target.value)}
                  className="h-7 text-sm font-medium bg-secondary/50 border-white/6 w-36 sm:w-48"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground truncate">{network.ssid}</p>
              )}
              <span className="shrink-0 text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/80 border-white/3">
                {network.band}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate opacity-70">{network.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-block text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/80 border-white/3">
            {network.security}
          </span>
          <Switch
            checked={network.enabled}
            disabled={!canManage}
            onCheckedChange={() => onToggle(network.id)}
            className="scale-90"
          />
          {!editing ? (
            <motion.button
              whileHover={network.enabled ? { scale: 1.1 } : {}}
              whileTap={network.enabled ? { scale: 0.9 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => network.enabled && canManage && setEditing(true)}
              className={`p-1.5 rounded-lg transition-colors ${network.enabled && canManage ? "hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSave}
                className="p-1.5 rounded-lg bg-emerald/10 text-emerald hover:bg-emerald/20 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCancel}
                className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Password row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-secondary/50 border-white/4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-[9px] font-mono text-muted-foreground opacity-50 uppercase tracking-widest shrink-0">Pass</span>
            {editing ? (
              <Input
                type={showPassword ? "text" : "password"}
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                className="h-5 text-xs font-mono bg-transparent border-none p-0 focus-visible:ring-0 w-full"
              />
            ) : (
              <span className="text-xs font-mono text-muted-foreground truncate">
                {showPassword ? network.password : "••••••••••••"}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default function NetworkPage() {
  const { activeNode } = useFleet();
  const net = activeNode.network;
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManageNetwork = hasPermission("network:manage");
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockTarget, setBlockTarget] = useState<{ mac: string; name: string } | null>(null);
  const [blocking, setBlocking] = useState(false);

  const confirmBlock = async () => {
    if (!blockTarget) return;
    setBlocking(true);
    try {
      const res = await fetch("/api/v1/admin/network/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: blockTarget.mac, block: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Block failed");
      toast.success(`Blocked ${blockTarget.name}`, {
        description: "The device has been denied network access.",
      });
      setBlockTarget(null);
    } catch (e) {
      toast.error("Couldn't block device", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBlocking(false);
    }
  };

  const fetchNetworks = useCallback(async () => {
    try {
      const res = await fetch("/api/wifi");
      if (res.ok) {
        const data = await res.json();
        setNetworks(data);
      }
    } catch {
      // silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  const handleSaveNetwork = async (id: number, ssid: string, password: string) => {
    if (!canManageNetwork) {
      toast.error("You do not have permission to manage network settings.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/wifi/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNetworks((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast.success("WiFi credentials updated", {
          description: `${ssid} password has been changed.`,
        });
      } else {
        toast.error("Failed to update WiFi credentials");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleToggleNetwork = async (id: number) => {
    if (!canManageNetwork) {
      toast.error("You do not have permission to manage network settings.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/wifi/${id}/toggle`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setNetworks((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast[updated.enabled ? "success" : "warning"](
          updated.enabled ? `${updated.ssid} enabled` : `${updated.ssid} disabled`,
          { description: updated.enabled ? "Network is now broadcasting." : "Network has been turned off." },
        );
      } else {
        toast.error("Failed to toggle network");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="bg-background">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Network</h1>
            <p className="text-sm text-muted-foreground">Manage household Wi-Fi networks</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{Math.round(activeNode.network.wifiSignal)} dBm</span>
          </div>
        </motion.div>

        {/* WiFi Management */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">WiFi Management</h3>
          </div>
          {loading ? (
            <div className="glass-card p-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading networks...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {networks.map((network) => (
                <WifiEditCard
                  key={network.id}
                  network={network}
                  onSave={handleSaveNetwork}
                  onToggle={handleToggleNetwork}
                  canManage={canManageNetwork}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Devices on Network */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Devices on Network
            </h3>
            {net.lanDevices.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {net.lanDevices.length}
              </span>
            )}
          </div>
          {net.lanDevices.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-muted-foreground">
              No devices detected yet. Connect the router (set ROUTER_PASSWORD)
              for the full client list, or run the backend natively so it can
              read the local network.
            </div>
          ) : (
            <div className="glass-card-hover overflow-hidden">
              <div className={`grid ${canManageNetwork ? "grid-cols-[1fr_130px_80px_60px_44px]" : "grid-cols-[1fr_140px_100px_70px]"} gap-2 px-4 py-2.5 border-b border-border text-[11px] text-muted-foreground font-medium`}>
                <span>Device</span>
                <span>MAC</span>
                <span>Link</span>
                <span className={canManageNetwork ? "" : "text-right"}>Status</span>
                {canManageNetwork && <span className="text-right">Block</span>}
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {net.lanDevices.map((d) => (
                  <div
                    key={d.ip + d.mac}
                    className={`grid ${canManageNetwork ? "grid-cols-[1fr_130px_80px_60px_44px]" : "grid-cols-[1fr_140px_100px_70px]"} gap-2 px-4 py-2.5 items-center border-b border-border/40 hover:bg-secondary/30 transition-colors`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {d.interface === "wifi" ? (
                        <Wifi className="w-4 h-4 text-cyan shrink-0" />
                      ) : (
                        <Laptop className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">
                          {d.name || d.ip}
                        </div>
                        {d.name && (
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            {d.ip}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                      {d.mac}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {d.interface === "wifi"
                        ? "WiFi"
                        : d.interface === "wired"
                          ? "Wired"
                          : "—"}
                    </span>
                    <span className="flex justify-end">
                      <span
                        className={`status-badge text-[10px] ${d.active !== false ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}
                      >
                        {d.active !== false ? "ONLINE" : "IDLE"}
                      </span>
                    </span>
                    {canManageNetwork && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setBlockTarget({ mac: d.mac, name: d.name || d.ip })
                          }
                          aria-label={`Block ${d.name || d.ip}`}
                          title="Block this device"
                          className="p-1.5 rounded-md bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            Live from your router when connected, otherwise devices this host
            has recently seen.
          </p>
        </motion.div>
      </motion.div>

      {/* Block-device confirmation */}
      <AlertDialog
        open={blockTarget !== null}
        onOpenChange={(o) => !o && setBlockTarget(null)}
      >
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <Ban className="w-4 h-4 text-crimson" /> Block this device?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <span className="text-foreground font-medium">
                {blockTarget?.name}
              </span>{" "}
              (<span className="font-mono text-xs">{blockTarget?.mac}</span>)
              will be denied access to your network via the router. You can
              restore it from the router later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBlock();
              }}
              disabled={blocking}
              className="bg-crimson text-white hover:bg-crimson/90"
            >
              {blocking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Block device"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
