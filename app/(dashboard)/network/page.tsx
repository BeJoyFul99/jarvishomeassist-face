"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Network,
  Shield,
  Clock,
  Globe,
  Activity,
  ArrowUpDown,
  Wifi,
  Lock,
  Users,
  Pencil,
  X,
  Eye,
  EyeOff,
  Check,
  Loader2,
} from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

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
}: {
  network: WifiNetwork;
  onSave: (id: number, ssid: string, password: string) => void;
  onToggle: (id: number) => void;
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
            onCheckedChange={() => onToggle(network.id)}
            className="scale-90"
          />
          {!editing ? (
            <motion.button
              whileHover={network.enabled ? { scale: 1.1 } : {}}
              whileTap={network.enabled ? { scale: 0.9 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => network.enabled && setEditing(true)}
              className={`p-1.5 rounded-lg transition-colors ${network.enabled ? "hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground/50 cursor-not-allowed"}`}
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
  const { status } = useSystemStatus();
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const interfaces = [
    { name: "en0", type: "Wi-Fi", ip: "192.168.1.42", status: "active", speed: "866 Mbps" },
    { name: "en1", type: "Thunderbolt", ip: "—", status: "inactive", speed: "—" },
    { name: "utun3", type: "Tailscale", ip: "100.64.0.12", status: "active", speed: "100 Mbps" },
    { name: "lo0", type: "Loopback", ip: "127.0.0.1", status: "active", speed: "—" },
  ];

  const bandwidth = {
    download: (Math.random() * 50 + 10).toFixed(1),
    upload: (Math.random() * 15 + 2).toFixed(1),
    latency: (Math.random() * 20 + 5).toFixed(0),
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
            <h1 className="text-xl font-semibold text-foreground">Network & Ports</h1>
            <p className="text-sm text-muted-foreground">Interface monitoring and port security</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{status.wifi_signal.toFixed(0)} dBm</span>
          </div>
        </motion.div>

        {/* Bandwidth cards */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3">
          {[
            { icon: ArrowUpDown, label: "Download", value: `${bandwidth.download} MB/s`, color: "text-emerald" },
            { icon: ArrowUpDown, label: "Upload", value: `${bandwidth.upload} MB/s`, color: "text-primary" },
            { icon: Activity, label: "Latency", value: `${bandwidth.latency} ms`, color: "text-amber" },
          ].map((m) => (
            <div key={m.label} className="glass-card-hover p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <div className={`font-mono text-xl font-semibold ${m.color}`}>{m.value}</div>
            </div>
          ))}
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
                />
              ))}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Network Interfaces */}
          <motion.div variants={item} className="glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Network Interfaces</h3>
            </div>
            <div className="space-y-2">
              {interfaces.map((iface) => (
                <div key={iface.name} className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 rounded-lg border-white/2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${iface.status === "active" ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    <div className="flex items-baseline gap-2 truncate">
                      <span className="font-mono text-xs font-semibold text-foreground">{iface.name}</span>
                      <span className="text-[10px] text-muted-foreground opacity-60">{iface.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="font-mono text-[11px] text-foreground">{iface.ip}</div>
                    <div className="text-[9px] font-mono text-muted-foreground opacity-70 w-16 text-right">{iface.speed}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Port Sentry */}
          <motion.div variants={item} className="glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Port Sentry</h3>
            </div>
            <div className="space-y-2">
              {status.ports.map((p) => (
                <div key={p.port} className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 rounded-lg border-white/2">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.open ? "bg-emerald pulse-dot" : "bg-muted-foreground"}`} />
                    <span className="font-mono text-xs font-semibold text-foreground">:{p.port}</span>
                    <span className="text-[10px] text-muted-foreground opacity-60 ml-1">{p.service}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`status-badge text-[9px] py-0.5! px-2! ${p.open ? "bg-emerald/10 text-emerald border border-emerald/20" : "bg-secondary text-muted-foreground"}`}>
                      {p.open ? "LISTENING" : "CLOSED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Active Connections */}
        <motion.div variants={item} className="glass-card-hover p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Active Connections</h3>
            <span className="ml-auto status-badge bg-secondary text-muted-foreground text-[10px]">
              {status.ssh_attempts.length} connections
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {status.ssh_attempts.map((attempt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 rounded-lg border-white/2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${attempt.success ? "bg-emerald" : "bg-crimson"}`} />
                  <span className="font-mono text-xs font-bold text-foreground truncate">{attempt.ip}</span>
                  <span className={`status-badge text-[9px] shrink-0 py-0.5! px-2! ${attempt.success ? "bg-emerald/10 text-emerald border border-emerald/20" : "bg-crimson/10 text-crimson border border-crimson/20"}`}>
                    {attempt.success ? "ESTABLISHED" : "REJECTED"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-muted-foreground opacity-60">
                  <Clock className="w-3 h-3" />
                  {formatTime(attempt.timestamp)}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
